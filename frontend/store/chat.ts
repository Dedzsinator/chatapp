import { create } from 'zustand';
import { ChatState, Chat, Message, Presence, WSMessage } from '@/types';

const API_BASE_URL = 'http://localhost:4000';
const WS_URL = 'ws://localhost:4000/ws';

interface ChatStore extends ChatState {
  // WebSocket
  ws: WebSocket | null;
  connect: () => void;
  disconnect: () => void;
  
  // Chats
  loadChats: () => Promise<void>;
  loadMessages: (chatId: string, cursor?: string) => Promise<void>;
  sendMessage: (chatId: string, content: string, type?: string) => Promise<void>;
  
  // UI state
  setActiveChat: (chat: Chat | null) => void;
  updatePresence: (presence: Presence) => void;
  markAsRead: (chatId: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  chats: [],
  activeChat: null,
  messages: {},
  presence: {},
  isConnected: false,
  isLoading: false,
  ws: null,

  // WebSocket connection
  connect: () => {
    const { ws } = get();
    if (ws?.readyState === WebSocket.OPEN) return;

    try {
      const websocket = new WebSocket(WS_URL);
      
      websocket.onopen = () => {
        console.log('WebSocket connected');
        set({ isConnected: true, ws: websocket });
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        set({ isConnected: false, ws: null });
        
        // Reconnect after 3 seconds
        setTimeout(() => {
          if (get().ws?.readyState !== WebSocket.OPEN) {
            get().connect();
          }
        }, 3000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      websocket.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          handleWebSocketMessage(message, set, get);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      set({ ws: websocket });
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null, isConnected: false });
    }
  },

  // Load chats
  loadChats: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch(`${API_BASE_URL}/api/chats`);
      if (!response.ok) throw new Error('Failed to load chats');
      
      const data = await response.json();
      set({ chats: data.chats, isLoading: false });
    } catch (error) {
      console.error('Failed to load chats:', error);
      set({ isLoading: false });
    }
  },

  // Load messages for a chat
  loadMessages: async (chatId: string, cursor?: string) => {
    try {
      const url = cursor 
        ? `${API_BASE_URL}/api/chats/${chatId}/messages?cursor=${cursor}`
        : `${API_BASE_URL}/api/chats/${chatId}/messages`;
        
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load messages');
      
      const data = await response.json();
      const { messages } = get();
      
      set({
        messages: {
          ...messages,
          [chatId]: cursor 
            ? [...(messages[chatId] || []), ...data.messages]
            : data.messages
        }
      });
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  },

  // Send a message
  sendMessage: async (chatId: string, content: string, type = 'text') => {
    const { ws } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      type: 'send_message',
      data: {
        chatId,
        content,
        type,
        timestamp: new Date().toISOString(),
      }
    };

    ws.send(JSON.stringify(message));
  },

  // UI actions
  setActiveChat: (chat: Chat | null) => {
    set({ activeChat: chat });
    if (chat) {
      get().loadMessages(chat.id);
    }
  },

  updatePresence: (presence: Presence) => {
    const { presence: currentPresence } = get();
    set({
      presence: {
        ...currentPresence,
        [presence.userId]: presence
      }
    });
  },

  markAsRead: (chatId: string) => {
    // Implementation for marking messages as read
    console.log('Marking chat as read:', chatId);
  },
}));

// Handle incoming WebSocket messages
function handleWebSocketMessage(
  message: WSMessage,
  set: any,
  get: any
) {
  switch (message.type) {
    case 'message_sent': {
      const { messages } = get();
      const chatId = message.data.chatId;
      const chatMessages = messages[chatId] || [];
      
      set({
        messages: {
          ...messages,
          [chatId]: [...chatMessages, message.data]
        }
      });
      break;
    }
    
    case 'presence_update': {
      get().updatePresence(message.data);
      break;
    }
    
    case 'user_typing': {
      // Handle typing indicators
      console.log('User typing:', message.data);
      break;
    }
    
    default:
      console.log('Unhandled WebSocket message:', message);
  }
}
