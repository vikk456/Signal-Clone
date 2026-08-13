'use client';

import { Conversation, User } from '@/types';
import { Avatar } from './Avatar';

interface Props {
  conversation: Conversation;
  currentUserId: number;
  isActive: boolean;
  onClick: () => void;
}

function getOtherUser(conv: Conversation, currentUserId: number): User | null {
  if (conv.is_group) return null;
  const other = conv.members.find(m => m.user_id !== currentUserId);
  return other?.user || null;
}

export function ConversationItem({ conversation: conv, currentUserId, isActive, onClick }: Props) {
  const otherUser = getOtherUser(conv, currentUserId);
  const name = conv.is_group ? conv.group_name : otherUser?.display_name;
  const avatarUrl = conv.is_group ? conv.group_avatar : otherUser?.avatar_url;
  const isOnline = !conv.is_group && otherUser?.is_online;

  const lastMsg = conv.last_message;
  let preview = '';
  if (lastMsg) {
    if (lastMsg.is_deleted) {
      preview = 'This message was deleted';
    } else if (conv.is_group) {
      const senderName = lastMsg.sender.display_name.split(' ')[0];
      preview = `${senderName}: ${lastMsg.content}`;
    } else {
      preview = lastMsg.sender_id === currentUserId ? `You: ${lastMsg.content}` : lastMsg.content;
    }
  }

  return (
    <div className={`conv-item ${isActive ? 'active' : ''}`} onClick={onClick} id={`conv-${conv.id}`}>
      <Avatar
        name={name || '?'}
        avatarUrl={avatarUrl}
        user={otherUser || undefined}
        showOnline={!conv.is_group}
        isOnline={isOnline}
        size="md"
      />
      <div className="conv-item-info">
        <div className="conv-item-top">
          <span className="conv-item-name">{name}</span>
        </div>
        <div className="conv-item-bottom">
          <span className="conv-item-preview">
            {preview || (conv.is_group ? `${conv.members.length} members` : '')}
          </span>
          {conv.unread_count > 0 && (
            <span className="unread-badge">{conv.unread_count > 99 ? '99+' : conv.unread_count}</span>
          )}
        </div>
      </div>
    </div>
  );
}
