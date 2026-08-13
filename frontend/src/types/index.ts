export interface User {
  id: number;
  phone_number: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string;
  is_online: boolean;
  last_seen?: string;
  created_at?: string;
}

export interface ConversationMember {
  user_id: number;
  user: User;
  is_admin: boolean;
  joined_at: string;
}

export interface MessageReaction {
  id: number;
  emoji: string;
  user_id: number;
  user: User;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender: User;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  status: 'sending' | 'sent' | 'delivered' | 'read';
  reply_to_id?: number | null;
  reply_to?: Message | null;
  is_deleted: boolean;
  disappears_at?: string | null;
  created_at: string;
  edited_at?: string | null;
  reactions: MessageReaction[];
}

export interface Conversation {
  id: number;
  is_group: boolean;
  group_name?: string | null;
  group_avatar?: string | null;
  group_description?: string | null;
  created_at: string;
  members: ConversationMember[];
  last_message?: Message | null;
  unread_count: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// WebSocket event types
export type WSEvent =
  | { type: 'new_message'; message: Message }
  | { type: 'typing'; conversation_id: number; user_id: number; is_typing: boolean }
  | { type: 'message_status'; message_id: number; status: string; user_id: number; conversation_id: number }
  | { type: 'message_edited'; message_id: number; content: string; conversation_id: number; edited_at: string }
  | { type: 'message_deleted'; message_id: number; conversation_id: number }
  | { type: 'message_reaction'; message_id: number; conversation_id: number; user_id: number; emoji: string }
  | { type: 'user_presence'; user_id: number; is_online: boolean }
  | { type: 'pong' };
