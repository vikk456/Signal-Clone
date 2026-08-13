'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { Avatar } from './Avatar';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
  onCreated: (convId: number) => void;
  currentUserId: number;
}

export function NewConversationModal({ onClose, onCreated, currentUserId }: Props) {
  const [tab, setTab] = useState<'dm' | 'group'>('dm');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.trim().length >= 1) {
        const results = await api.users.search(search);
        setUsers(results);
      } else {
        setUsers([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleUser = (user: User) => {
    if (tab === 'dm') {
      setSelected([user]);
    } else {
      setSelected(prev =>
        prev.find(u => u.id === user.id)
          ? prev.filter(u => u.id !== user.id)
          : [...prev, user]
      );
    }
  };

  const handleCreate = async () => {
    if (selected.length === 0) return toast.error('Select at least one user');
    if (tab === 'group' && !groupName.trim()) return toast.error('Enter a group name');

    setLoading(true);
    try {
      const conv = await api.conversations.create({
        is_group: tab === 'group',
        member_ids: selected.map(u => u.id),
        group_name: tab === 'group' ? groupName : undefined,
      });
      onCreated(conv.id);
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
          <span className="modal-title">
            {tab === 'dm' ? 'New Message' : 'New Group'}
          </span>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', padding: '0 24px', borderBottom: '1px solid var(--border)', gap: 0 }}>
          {(['dm', 'group'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelected([]); }}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: tab === t ? 700 : 400,
                cursor: 'pointer',
                fontSize: 14,
                transition: 'all 150ms',
              }}
            >
              {t === 'dm' ? '💬 Direct Message' : '👥 Group'}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {tab === 'group' && (
            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input
                className="form-input"
                placeholder="e.g. Dev Team"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                id="group-name-input"
              />
            </div>
          )}

          {/* Selected chips */}
          {selected.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {selected.map(u => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'var(--accent-muted)',
                    border: '1px solid var(--accent)',
                    borderRadius: 'var(--radius-full)',
                    padding: '3px 10px 3px 6px',
                    fontSize: 13,
                    color: 'var(--accent)',
                  }}
                >
                  <Avatar user={u} size="xs" />
                  {u.display_name}
                  <button
                    onClick={() => toggleUser(u)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 700 }}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          <div className="search-container" style={{ marginBottom: 12 }}>
            <span className="search-icon">🔍</span>
            <input
              id="new-conv-search"
              className="search-input"
              placeholder="Search by name or username..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {users.map(user => (
              <div
                key={user.id}
                className={`user-list-item ${selected.find(u => u.id === user.id) ? 'selected' : ''}`}
                onClick={() => toggleUser(user)}
                id={`user-${user.id}`}
              >
                <Avatar user={user} size="sm" showOnline isOnline={user.is_online} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{user.display_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{user.username}</div>
                </div>
                {selected.find(u => u.id === user.id) && (
                  <span style={{ color: 'var(--accent)', fontSize: 16 }}>✓</span>
                )}
              </div>
            ))}
            {users.length === 0 && search && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                No users found
              </div>
            )}
            {!search && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 13 }}>
                Search for people to message
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            id="create-conv-btn"
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={loading || selected.length === 0}
          >
            {loading ? 'Creating…' : tab === 'dm' ? 'Open Chat' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
