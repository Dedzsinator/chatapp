export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: 'active' | 'suspended' | 'deleted';
  lastSeenAt?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'system' | 'location';
  timestamp: number;
  metadata?: Record<string, any>;
  replyToId?: string;
  editedAt?: number;
  deletedAt?: number;
}

export interface Chat {
  id: string;
  name?: string;
  description?: string;
  type: 'direct' | 'group' | 'channel';
  avatarUrl?: string;
  lastMessage?: Message;
  lastMessageAt?: Date;
  messageCount: number;
  participants: ChatParticipant[];
  settings?: Record<string, any>;
}

export interface ChatParticipant {
  id: string;
  userId: string;
  chatId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
  leftAt?: Date;
  lastReadAt?: Date;
  muted: boolean;
  pinned: boolean;
  user?: User;
}

export interface MessageReceipt {
  messageId: string;
  userId: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: number;
}

export interface Presence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastActivity: number;
  sessionCount: number;
}

export interface TypingIndicator {
  userId: string;
  chatId: string;
  isTyping: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  error?: string;
  [key: string]: any;
}

export interface ChatListItem extends Chat {
  unreadCount: number;
  lastActivity: Date;
  isOnline?: boolean;
  typingUsers: string[];
}

export interface SearchResult {
  type: 'message' | 'user' | 'chat';
  item: Message | User | Chat;
  highlight?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  chatId?: string;
  messageId?: string;
}

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
}
