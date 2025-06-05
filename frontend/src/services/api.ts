import { useAuthStore } from '../stores/authStore';
import { 
  User, 
  AuthTokens, 
  LoginCredentials, 
  RegisterData, 
  Chat, 
  Message, 
  SearchResult 
} from '../types';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:4000/api'
  : 'https://your-production-api.com/api';

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get auth token
    const { tokens } = useAuthStore.getState();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }
        
        // Handle token expiration
        if (response.status === 401 && tokens) {
          try {
            await this.refreshToken();
            // Retry the original request
            const retryConfig = {
              ...config,
              headers: {
                ...config.headers,
                Authorization: `Bearer ${useAuthStore.getState().tokens?.accessToken}`,
              },
            };
            const retryResponse = await fetch(url, retryConfig);
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            useAuthStore.getState().logout();
            throw new ApiError(401, 'Authentication required');
          }
        }
        
        throw new ApiError(
          response.status,
          errorData.message || 'Request failed',
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Network error', error);
    }
  }

  // Authentication
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(): Promise<AuthTokens> {
    const { tokens } = useAuthStore.getState();
    if (!tokens?.refreshToken) {
      throw new ApiError(401, 'No refresh token available');
    }

    const newTokens = await this.request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: tokens.refreshToken }),
    });

    useAuthStore.getState().setTokens(newTokens);
    return newTokens;
  }

  async logout(): Promise<void> {
    const { tokens } = useAuthStore.getState();
    if (tokens?.accessToken) {
      try {
        await this.request('/auth/logout', { method: 'POST' });
      } catch (error) {
        // Ignore logout errors
        console.warn('Logout request failed:', error);
      }
    }
    useAuthStore.getState().logout();
  }

  async verifyEmail(code: string): Promise<void> {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    return this.request('/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // User management
  async getCurrentUser(): Promise<User> {
    return this.request('/users/me');
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    return this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.request('/users/me/avatar', {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    });
  }

  async searchUsers(query: string): Promise<User[]> {
    const params = new URLSearchParams({ q: query });
    return this.request(`/users/search?${params}`);
  }

  // Chat management
  async getChats(): Promise<Chat[]> {
    return this.request('/chats');
  }

  async getChat(chatId: string): Promise<Chat> {
    return this.request(`/chats/${chatId}`);
  }

  async createChat(data: {
    type: Chat['type'];
    name?: string;
    description?: string;
    participantIds: string[];
  }): Promise<Chat> {
    return this.request('/chats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateChat(chatId: string, updates: Partial<Chat>): Promise<Chat> {
    return this.request(`/chats/${chatId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteChat(chatId: string): Promise<void> {
    return this.request(`/chats/${chatId}`, {
      method: 'DELETE',
    });
  }

  async addChatParticipants(chatId: string, userIds: string[]): Promise<void> {
    return this.request(`/chats/${chatId}/participants`, {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds }),
    });
  }

  async removeChatParticipant(chatId: string, userId: string): Promise<void> {
    return this.request(`/chats/${chatId}/participants/${userId}`, {
      method: 'DELETE',
    });
  }

  async updateChatParticipant(
    chatId: string, 
    userId: string, 
    updates: { role?: string; muted?: boolean }
  ): Promise<void> {
    return this.request(`/chats/${chatId}/participants/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Message management
  async getMessages(
    chatId: string,
    options: { limit?: number; before?: string; after?: string } = {}
  ): Promise<Message[]> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.before) params.append('before', options.before);
    if (options.after) params.append('after', options.after);

    const queryString = params.toString();
    return this.request(`/messages/${chatId}${queryString ? `?${queryString}` : ''}`);
  }

  async searchMessages(
    chatId: string,
    query: string,
    limit: number = 20
  ): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    return this.request(`/messages/${chatId}/search?${params}`);
  }

  async updateMessage(messageId: string, content: string): Promise<Message> {
    return this.request(`/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  }

  async deleteMessage(messageId: string): Promise<void> {
    return this.request(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  // File upload
  async uploadFile(file: File, chatId: string): Promise<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chat_id', chatId);

    return this.request('/upload', {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    });
  }

  // Global search
  async globalSearch(query: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q: query });
    return this.request(`/search?${params}`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: number }> {
    return this.request('/health');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export { ApiError };
