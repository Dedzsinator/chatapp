import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { WebSocketMessage, Message, TypingIndicator, Presence, MessageReceipt } from '../types';

type WebSocketReadyState = 0 | 1 | 2 | 3; // CONNECTING | OPEN | CLOSING | CLOSED

interface WebSocketManagerConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketManagerConfig>;
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualClose = false;
  
  // Event handlers
  private messageHandlers = new Map<string, (data: any) => void>();
  private connectionHandlers: Array<(connected: boolean) => void> = [];
  
  constructor(config: WebSocketManagerConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    };
    
    this.setupMessageHandlers();
  }
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isManualClose = false;
        
        // Get auth token
        const { tokens } = useAuthStore.getState();
        const url = tokens 
          ? `${this.config.url}?token=${tokens.accessToken}`
          : this.config.url;
        
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.notifyConnectionChange(true);
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.cleanup();
          this.notifyConnectionChange(false);
          
          if (!this.isManualClose && this.shouldReconnect()) {
            this.scheduleReconnect();
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  disconnect(): void {
    this.isManualClose = true;
    this.cleanup();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }
  
  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }
  
  // Message sending helpers
  sendMessage(chatId: string, content: string, type: Message['type'] = 'text', metadata?: any): void {
    this.send({
      type: 'send_message',
      chat_id: chatId,
      content,
      message_type: type,
      metadata,
    });
  }
  
  joinChat(chatId: string): void {
    this.send({
      type: 'join_chat',
      chat_id: chatId,
    });
  }
  
  leaveChat(chatId: string): void {
    this.send({
      type: 'leave_chat',
      chat_id: chatId,
    });
  }
  
  setTyping(chatId: string, isTyping: boolean): void {
    this.send({
      type: 'typing',
      chat_id: chatId,
      is_typing: isTyping,
    });
  }
  
  markMessageRead(messageId: string): void {
    this.send({
      type: 'mark_read',
      message_id: messageId,
    });
  }
  
  // Connection status
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  
  get readyState(): WebSocketReadyState {
    return (this.ws?.readyState as WebSocketReadyState) ?? WebSocket.CLOSED;
  }
  
  // Event listeners
  onConnection(handler: (connected: boolean) => void): () => void {
    this.connectionHandlers.push(handler);
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }
  
  onMessage(type: string, handler: (data: any) => void): () => void {
    this.messageHandlers.set(type, handler);
    return () => {
      this.messageHandlers.delete(type);
    };
  }
  
  // Private methods
  private setupMessageHandlers(): void {
    // Message received
    this.messageHandlers.set('message', (data: Message) => {
      useChatStore.getState().addMessage(data);
    });
    
    // Typing indicator
    this.messageHandlers.set('typing', (data: { user_id: string; chat_id: string; is_typing: boolean }) => {
      useChatStore.getState().setTypingIndicator(data.chat_id, data.user_id, data.is_typing);
    });
    
    // Presence update
    this.messageHandlers.set('presence', (data: { user_id: string; presence: Presence }) => {
      useChatStore.getState().setPresence(data.user_id, data.presence);
    });
    
    // Message receipt
    this.messageHandlers.set('receipt', (data: { message_id: string; user_id: string; status: MessageReceipt['status'] }) => {
      useChatStore.getState().updateMessageReceipt(data.message_id, data.user_id, data.status);
    });
    
    // Authentication success
    this.messageHandlers.set('auth_success', (data: { user_id: string }) => {
      console.log('WebSocket authenticated for user:', data.user_id);
    });
    
    // Authentication error
    this.messageHandlers.set('auth_error', (data: { error: string }) => {
      console.error('WebSocket authentication failed:', data.error);
      // Could trigger re-login flow
    });
    
    // Message sent confirmation
    this.messageHandlers.set('message_sent', (data: { message_id: string; status: string }) => {
      console.log('Message sent confirmation:', data);
    });
    
    // Error handling
    this.messageHandlers.set('error', (data: { error: string }) => {
      console.error('WebSocket error:', data.error);
    });
    
    // Pong response
    this.messageHandlers.set('pong', () => {
      // Heartbeat response received
    });
  }
  
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      const handler = this.messageHandlers.get(message.type);
      
      if (handler) {
        handler(message.data || message);
      } else {
        console.warn('Unhandled WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error, data);
    }
  }
  
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }
  
  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  private shouldReconnect(): boolean {
    return this.reconnectAttempts < this.config.maxReconnectAttempts;
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((error) => {
        console.error('Reconnect failed:', error);
      });
    }, delay);
  }
  
  private notifyConnectionChange(connected: boolean): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Connection handler error:', error);
      }
    });
  }
}

// Singleton instance
let wsManagerInstance: WebSocketManager | null = null;

export const createWebSocketManager = (config: WebSocketManagerConfig): WebSocketManager => {
  if (wsManagerInstance) {
    wsManagerInstance.disconnect();
  }
  
  wsManagerInstance = new WebSocketManager(config);
  return wsManagerInstance;
};

export const getWebSocketManager = (): WebSocketManager | null => {
  return wsManagerInstance;
};
