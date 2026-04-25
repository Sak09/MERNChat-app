export interface User {
  _id: string;
  username: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
  createdAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  sender: User;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  status: 'pending' | 'sent' | 'delivered' | 'read';
  clientId?: string;
  replyTo?: Message | null;
  readBy: { user: string; readAt: string }[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  participants: User[];
  type: 'direct' | 'group';
  name?: string;
  avatar?: string;
  lastMessage?: Message;
  lastMessageAt: string;
  unreadCount: Record<string, number>;
  admins: string[];
  createdAt: string;
}

export interface PendingMessage {
  clientId: string;
  conversationId: string;
  content: string;
  type: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface MessageState {
  byConversation: Record<string, Message[]>;
  cursors: Record<string, string | null>;
  hasMore: Record<string, boolean>;
  isLoading: Record<string, boolean>;
  pendingMessages: PendingMessage[];
}

export interface ConversationState {
  list: Conversation[];
  active: string | null;
  isLoading: boolean;
}

export interface UIState {
  isOnline: boolean;
  typingUsers: Record<string, { userId: string; username: string }[]>;
  onlineUsers: Set<string>;
}
