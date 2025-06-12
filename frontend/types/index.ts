// Global types for the chat application
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  createdAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'system';
  timestamp: Date;
  editedAt?: Date;
  replyTo?: string;
  reactions: Record<string, string[]>; // emoji -> userIds
  metadata?: {
    filename?: string;
    fileSize?: number;
    duration?: number;
    dimensions?: { width: number; height: number };
  };
}

export interface Chat {
  id: string;
  name?: string;
  description?: string;
  type: 'direct' | 'group' | 'channel';
  avatar?: string;
  participantIds: string[];
  ownerId: string;
  lastMessage?: Message;
  lastActivity: Date;
  createdAt: Date;
  settings: {
    muted: boolean;
    notifications: boolean;
    theme?: string;
  };
}

export interface Presence {
  userId: string;
  status: 'online' | 'away' | 'busy';
  lastSeen: Date;
  typing?: {
    chatId: string;
    timestamp: Date;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Record<string, Message[]>; // chatId -> messages
  presence: Record<string, Presence>; // userId -> presence
  isConnected: boolean;
  isLoading: boolean;
}

// WebSocket message types
export type WSMessage = 
  | { type: 'message_sent'; data: Message }
  | { type: 'message_updated'; data: Message }
  | { type: 'message_deleted'; data: { messageId: string; chatId: string } }
  | { type: 'user_typing'; data: { userId: string; chatId: string } }
  | { type: 'user_stopped_typing'; data: { userId: string; chatId: string } }
  | { type: 'presence_update'; data: Presence }
  | { type: 'chat_updated'; data: Chat };

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface ChatListResponse {
  chats: Chat[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface MessageListResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}
