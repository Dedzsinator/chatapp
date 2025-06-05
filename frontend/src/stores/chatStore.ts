import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Message, Chat, ChatListItem, TypingIndicator, Presence, MessageReceipt } from '../types';

interface ChatState {
  // Chat data
  chats: Map<string, Chat>;
  chatList: ChatListItem[];
  currentChatId: string | null;
  
  // Messages
  messages: Map<string, Message[]>; // chatId -> messages
  messageReceipts: Map<string, MessageReceipt[]>; // messageId -> receipts
  
  // Real-time state
  typingIndicators: Map<string, TypingIndicator[]>; // chatId -> typing users
  presence: Map<string, Presence>; // userId -> presence
  
  // UI state
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  searchQuery: string;
  unreadCount: number;
  
  // Actions
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  removeChat: (chatId: string) => void;
  
  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  
  addMessageReceipt: (receipt: MessageReceipt) => void;
  updateMessageReceipt: (messageId: string, userId: string, status: MessageReceipt['status']) => void;
  
  setTypingIndicator: (chatId: string, userId: string, isTyping: boolean) => void;
  clearTypingIndicators: (chatId: string) => void;
  
  setPresence: (userId: string, presence: Presence) => void;
  removePresence: (userId: string) => void;
  
  setCurrentChat: (chatId: string | null) => void;
  setLoadingChats: (loading: boolean) => void;
  setLoadingMessages: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  
  // Computed getters
  getCurrentChat: () => Chat | null;
  getCurrentMessages: () => Message[];
  getChatUnreadCount: (chatId: string) => number;
  getUserPresence: (userId: string) => Presence | null;
  getChatTypingUsers: (chatId: string) => string[];
}

export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    chats: new Map(),
    chatList: [],
    currentChatId: null,
    messages: new Map(),
    messageReceipts: new Map(),
    typingIndicators: new Map(),
    presence: new Map(),
    isLoadingChats: false,
    isLoadingMessages: false,
    searchQuery: '',
    unreadCount: 0,
    
    // Chat actions
    setChats: (chats) => {
      const chatsMap = new Map(chats.map(chat => [chat.id, chat]));
      const chatList = chats.map(chat => ({
        ...chat,
        unreadCount: get().getChatUnreadCount(chat.id),
        lastActivity: chat.lastMessageAt || new Date(),
        typingUsers: get().getChatTypingUsers(chat.id),
      })).sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
      
      set({ chats: chatsMap, chatList });
    },
    
    addChat: (chat) => {
      const { chats, chatList } = get();
      const newChats = new Map(chats);
      newChats.set(chat.id, chat);
      
      const chatListItem: ChatListItem = {
        ...chat,
        unreadCount: 0,
        lastActivity: chat.lastMessageAt || new Date(),
        typingUsers: [],
      };
      
      const newChatList = [chatListItem, ...chatList.filter(c => c.id !== chat.id)]
        .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
      
      set({ chats: newChats, chatList: newChatList });
    },
    
    updateChat: (chatId, updates) => {
      const { chats, chatList } = get();
      const chat = chats.get(chatId);
      if (!chat) return;
      
      const updatedChat = { ...chat, ...updates };
      const newChats = new Map(chats);
      newChats.set(chatId, updatedChat);
      
      const newChatList = chatList.map(item => 
        item.id === chatId ? { ...item, ...updates } : item
      ).sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
      
      set({ chats: newChats, chatList: newChatList });
    },
    
    removeChat: (chatId) => {
      const { chats, chatList, messages } = get();
      const newChats = new Map(chats);
      newChats.delete(chatId);
      
      const newChatList = chatList.filter(chat => chat.id !== chatId);
      
      const newMessages = new Map(messages);
      newMessages.delete(chatId);
      
      set({ 
        chats: newChats, 
        chatList: newChatList, 
        messages: newMessages,
        currentChatId: get().currentChatId === chatId ? null : get().currentChatId
      });
    },
    
    // Message actions
    setMessages: (chatId, messages) => {
      const { messages: allMessages } = get();
      const newMessages = new Map(allMessages);
      newMessages.set(chatId, messages.sort((a, b) => a.timestamp - b.timestamp));
      set({ messages: newMessages });
    },
    
    addMessage: (message) => {
      const { messages, chats, chatList } = get();
      const chatMessages = messages.get(message.chatId) || [];
      
      // Check if message already exists (deduplication)
      const existingIndex = chatMessages.findIndex(m => m.id === message.id);
      let newMessages: Message[];
      
      if (existingIndex >= 0) {
        // Update existing message
        newMessages = [...chatMessages];
        newMessages[existingIndex] = message;
      } else {
        // Add new message in correct position
        newMessages = [...chatMessages, message].sort((a, b) => a.timestamp - b.timestamp);
      }
      
      const allMessages = new Map(messages);
      allMessages.set(message.chatId, newMessages);
      
      // Update chat's last message
      const chat = chats.get(message.chatId);
      if (chat && message.timestamp > (chat.lastMessageAt?.getTime() || 0)) {
        get().updateChat(message.chatId, {
          lastMessageAt: new Date(message.timestamp),
          messageCount: chat.messageCount + (existingIndex >= 0 ? 0 : 1)
        });
      }
      
      set({ messages: allMessages });
    },
    
    updateMessage: (messageId, updates) => {
      const { messages } = get();
      const newMessages = new Map();
      
      for (const [chatId, chatMessages] of messages) {
        const messageIndex = chatMessages.findIndex(m => m.id === messageId);
        if (messageIndex >= 0) {
          const updatedMessages = [...chatMessages];
          updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...updates };
          newMessages.set(chatId, updatedMessages);
        } else {
          newMessages.set(chatId, chatMessages);
        }
      }
      
      set({ messages: newMessages });
    },
    
    removeMessage: (messageId) => {
      const { messages } = get();
      const newMessages = new Map();
      
      for (const [chatId, chatMessages] of messages) {
        const filteredMessages = chatMessages.filter(m => m.id !== messageId);
        newMessages.set(chatId, filteredMessages);
      }
      
      set({ messages: newMessages });
    },
    
    // Receipt actions
    addMessageReceipt: (receipt) => {
      const { messageReceipts } = get();
      const receipts = messageReceipts.get(receipt.messageId) || [];
      const existingIndex = receipts.findIndex(r => r.userId === receipt.userId);
      
      let newReceipts: MessageReceipt[];
      if (existingIndex >= 0) {
        newReceipts = [...receipts];
        newReceipts[existingIndex] = receipt;
      } else {
        newReceipts = [...receipts, receipt];
      }
      
      const newMessageReceipts = new Map(messageReceipts);
      newMessageReceipts.set(receipt.messageId, newReceipts);
      set({ messageReceipts: newMessageReceipts });
    },
    
    updateMessageReceipt: (messageId, userId, status) => {
      const { messageReceipts } = get();
      const receipts = messageReceipts.get(messageId) || [];
      const receiptIndex = receipts.findIndex(r => r.userId === userId);
      
      if (receiptIndex >= 0) {
        const newReceipts = [...receipts];
        newReceipts[receiptIndex] = {
          ...newReceipts[receiptIndex],
          status,
          timestamp: Date.now()
        };
        
        const newMessageReceipts = new Map(messageReceipts);
        newMessageReceipts.set(messageId, newReceipts);
        set({ messageReceipts: newMessageReceipts });
      }
    },
    
    // Typing indicator actions
    setTypingIndicator: (chatId, userId, isTyping) => {
      const { typingIndicators } = get();
      const chatTyping = typingIndicators.get(chatId) || [];
      
      let newTyping: TypingIndicator[];
      if (isTyping) {
        const existingIndex = chatTyping.findIndex(t => t.userId === userId);
        if (existingIndex >= 0) {
          newTyping = [...chatTyping];
          newTyping[existingIndex] = { userId, chatId, isTyping: true };
        } else {
          newTyping = [...chatTyping, { userId, chatId, isTyping: true }];
        }
      } else {
        newTyping = chatTyping.filter(t => t.userId !== userId);
      }
      
      const newTypingIndicators = new Map(typingIndicators);
      newTypingIndicators.set(chatId, newTyping);
      set({ typingIndicators: newTypingIndicators });
    },
    
    clearTypingIndicators: (chatId) => {
      const { typingIndicators } = get();
      const newTypingIndicators = new Map(typingIndicators);
      newTypingIndicators.set(chatId, []);
      set({ typingIndicators: newTypingIndicators });
    },
    
    // Presence actions
    setPresence: (userId, presence) => {
      const { presence: currentPresence } = get();
      const newPresence = new Map(currentPresence);
      newPresence.set(userId, presence);
      set({ presence: newPresence });
    },
    
    removePresence: (userId) => {
      const { presence } = get();
      const newPresence = new Map(presence);
      newPresence.delete(userId);
      set({ presence: newPresence });
    },
    
    // UI actions
    setCurrentChat: (chatId) => set({ currentChatId: chatId }),
    setLoadingChats: (isLoadingChats) => set({ isLoadingChats }),
    setLoadingMessages: (isLoadingMessages) => set({ isLoadingMessages }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    
    // Computed getters
    getCurrentChat: () => {
      const { chats, currentChatId } = get();
      return currentChatId ? chats.get(currentChatId) || null : null;
    },
    
    getCurrentMessages: () => {
      const { messages, currentChatId } = get();
      return currentChatId ? messages.get(currentChatId) || [] : [];
    },
    
    getChatUnreadCount: (chatId) => {
      // TODO: Implement unread count logic based on last read timestamp
      return 0;
    },
    
    getUserPresence: (userId) => {
      const { presence } = get();
      return presence.get(userId) || null;
    },
    
    getChatTypingUsers: (chatId) => {
      const { typingIndicators } = get();
      const typing = typingIndicators.get(chatId) || [];
      return typing.filter(t => t.isTyping).map(t => t.userId);
    },
  }))
);
