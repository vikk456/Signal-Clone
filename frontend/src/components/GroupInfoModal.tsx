'use client';

import { useState } from 'react';
import { Conversation, User } from '@/types';
import { Avatar } from './Avatar';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  conversation: Conversation;
  currentUserId: number;
  onClose: () => void;
  onUpdated: () => void;
}

export function GroupInfoModal({ conversation: conv, currentUserId, onClose, onUpdated }: Props) {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const currentMember = conv.members.find(m => m.user_id === currentUserId);
  const isAdmin = currentMember?.is_admin;

  const searchUsers = async (q: string) => {
    setSearch(q);
    if (q.trim().length >= 1) {
      const results = await api.users.search(q);
      setSearchResults(results.filter(u => !conv.members.find(m => m.user_id === u.id)));
    } else {
      setSearchResults([]);
    }
  };

  const addMember = async (userId: number) => {
    setLoading(true);
    try {
      await api.conversations.addMembers(conv.id, [userId]);
      onUpdated();
      toast.success('Member added');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (userId: number) => {
    if (!confirm('Remove this member?')) return;
    setLoading(true);
    try {
      await api.conversations.removeMember(conv.id, userId);
      onUpdated();
      toast.success('Member removed');
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
          <span className="modal-title">Group Info</span>
        </div>
        <div className="modal-body">
          {/* Group header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Avatar
              name={conv.group_name || ''}
              avatarUrl={conv.group_avatar}
              size="lg"
            />
            <div style={{ fontWeight: 700, fontSize: 18, marginTop: 12 }}>{conv.group_name}</div>
            {conv.group_description && (
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{conv.group_description}</div>
            )}
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
              {conv.members.length} members
            </div>
          </div>

          {/* Member list */}
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Members
          </div>
          {conv.members.map(m => (
            <div key={m.user_id} className="user-list-item" style={{ cursor: 'default' }}>
              <Avatar user={m.user} size="sm" showOnline isOnline={m.user.is_online} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {m.user.display_name}
                  {m.user_id === currentUserId && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>(You)</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{m.user.username}</div>
              </div>
              {m.is_admin && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px',
                  borderRadius: 'var(--radius-full)', background: 'var(--accent-muted)',
                  color: 'var(--accent)', textTransform: 'uppercase',
                }}>Admin</span>
              )}
              {isAdmin && m.user_id !== currentUserId && (
                <button
                  className="icon-btn"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => removeMember(m.user_id)}
                  title="Remove member"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* Add members (admin only) */}
          {isAdmin && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Add Members
              </div>
              <div className="search-container" style={{ marginBottom: 8 }}>
                <span className="search-icon">🔍</span>
                <input
                  className="search-input"
                  placeholder="Search users to add..."
                  value={search}
                  onChange={e => searchUsers(e.target.value)}
                  id="add-member-search"
                />
              </div>
              {searchResults.map(user => (
                <div key={user.id} className="user-list-item" onClick={() => addMember(user.id)}>
                  <Avatar user={user} size="sm" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{user.display_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{user.username}</div>
                  </div>
                  <span style={{ color: 'var(--accent)', fontSize: 18 }}>+</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
