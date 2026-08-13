'use client';

import { Avatar } from './Avatar';
import { User } from '@/types';

interface Props {
  users: User[];
}

export function TypingIndicator({ users }: Props) {
  if (users.length === 0) return null;

  const names = users.map(u => u.display_name.split(' ')[0]).join(', ');
  const label = users.length === 1 ? `${names} is typing` : `${names} are typing`;

  return (
    <div className="typing-row">
      {users[0] && <Avatar user={users[0]} size="sm" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 4 }}>{label}</span>
        <div className="typing-bubble">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}
