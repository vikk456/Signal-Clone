'use client';

import { useState } from 'react';
import { User } from '@/types';
import { Avatar } from './Avatar';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { formatLastSeen } from './Avatar';

interface Props {
  user: User;
  currentUserId: number;
  onClose: () => void;
  onStartChat: (convId: number) => void;
}

export function ProfileModal({ user, currentUserId, onClose, onStartChat }: Props) {
  const [loading, setLoading] = useState(false);
  const isSelf = user.id === currentUserId;

  const handleMessage = async () => {
    setLoading(true);
    try {
      const conv = await api.conversations.create({ member_ids: [user.id] });
      onStartChat(conv.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <button className="icon-btn" onClick={onClose}>←</button>
          <span className="modal-title">{isSelf ? 'Your Profile' : 'Profile'}</span>
        </div>
        <div className="modal-body" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Avatar user={user} size="lg" showOnline isOnline={user.is_online} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 4 }}>{user.display_name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            @{user.username} · {user.phone_number}
          </div>
          {user.bio && (
            <div style={{
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              color: 'var(--text-secondary)',
              fontSize: 14,
              marginBottom: 16,
              textAlign: 'left',
            }}>
              {user.bio}
            </div>
          )}
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 24 }}>
            {user.is_online ? '🟢 Online' : `⚫ ${formatLastSeen(user.last_seen)}`}
          </div>

          {!isSelf && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={handleMessage}
                disabled={loading}
                id={`message-${user.id}`}
              >
                💬 Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
