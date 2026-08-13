'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Conversation, User } from '@/types';
import { api } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Avatar } from '@/components/Avatar';
import { ConversationItem } from '@/components/ConversationItem';
import { ChatPane } from '@/components/ChatPane';
import { NewConversationModal } from '@/components/NewConversationModal';
import { ProfileModal } from '@/components/ProfileModal';

// ── SVG icon components ───────────────────────────────────────────────────
const IconChats = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconCalls = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 12 19.79 19.79 0 0 1 1 3.18 2 2 0 0 1 2.96 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconStories = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);
const IconCompose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconMore = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="19" r="1" fill="currentColor" />
  </svg>
);
const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconSettings = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconLock = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default function ConversationsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [showNewConv, setShowNewConv] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chats' | 'calls' | 'stories'>('chats');

  const { isConnected, subscribe, send } = useWebSocket(currentUser?.id || null);

  useEffect(() => {
    const stored = localStorage.getItem('signal_user');
    if (!stored) { router.replace('/auth'); return; }
    try { setCurrentUser(JSON.parse(stored)); } catch { router.replace('/auth'); }
  }, [router]);

  const loadConversations = useCallback(async () => {
    try {
      const convs = await api.conversations.list();
      setConversations(convs);
    } catch { router.replace('/auth'); }
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;
    api.auth.me().then(user => {
      setCurrentUser(user);
      localStorage.setItem('signal_user', JSON.stringify(user));
    }).catch(() => router.replace('/auth'));
    loadConversations().finally(() => setLoading(false));
  }, [currentUser?.id, loadConversations, router]);

  useEffect(() => {
    const unsub = subscribe((event) => {
      if (event.type === 'new_message') loadConversations();
      if (event.type === 'user_presence') {
        setConversations(prev => prev.map(conv => ({
          ...conv,
          members: conv.members.map(m =>
            m.user_id === event.user_id ? { ...m, user: { ...m.user, is_online: event.is_online } } : m
          ),
        })));
      }
    });
    return unsub;
  }, [subscribe, loadConversations]);

  const logout = async () => {
    await api.auth.logout().catch(() => {});
    localStorage.removeItem('signal_token');
    localStorage.removeItem('signal_user');
    router.replace('/auth');
  };

  const activeConv = conversations.find(c => c.id === activeConvId) || null;

  const filtered = conversations.filter(conv => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    if (conv.is_group) return conv.group_name?.toLowerCase().includes(q);
    const other = conv.members.find(m => m.user_id !== currentUser?.id);
    return other?.user.display_name.toLowerCase().includes(q) || other?.user.username.toLowerCase().includes(q);
  });

  if (!currentUser) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="app-root">
      {/* Left icon rail */}
      <div className="nav-rail">
        <button
          className="nav-rail-avatar"
          onClick={() => setShowProfile(true)}
          id="my-profile-btn"
          title={currentUser.display_name}
        >
          <Avatar user={currentUser} size="sm" showOnline isOnline />
        </button>

        <div className="nav-rail-tabs">
          <button
            className={`nav-tab ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveTab('chats')}
            title="Chats"
          >
            <IconChats />
          </button>
          <button
            className={`nav-tab ${activeTab === 'calls' ? 'active' : ''}`}
            onClick={() => setActiveTab('calls')}
            title="Calls"
          >
            <IconCalls />
          </button>
          <button
            className={`nav-tab ${activeTab === 'stories' ? 'active' : ''}`}
            onClick={() => setActiveTab('stories')}
            title="Stories"
          >
            <IconStories />
          </button>
        </div>

        <button
          className="nav-tab"
          onClick={() => router.push('/settings')}
          title="Settings"
          style={{ marginTop: 'auto', marginBottom: 12 }}
        >
          <IconSettings />
        </button>
      </div>

      {/* Sidebar */}
      <div className="sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <span className="sidebar-title">
            {activeTab === 'chats' ? 'Chats' : activeTab === 'calls' ? 'Calls' : 'Stories'}
          </span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              className="icon-btn"
              title="New conversation"
              onClick={() => setShowNewConv(true)}
              id="new-conv-btn"
            >
              <IconCompose />
            </button>
            <button className="icon-btn" title="More options">
              <IconMore />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="search-wrap">
          <div className="search-container">
            <span className="search-icon"><IconSearch /></span>
            <input
              id="conv-search"
              className="search-input"
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Offline banner */}
        {!isConnected && (
          <div className="offline-banner">Connecting…</div>
        )}

        {/* Conversation list */}
        <div className="conv-list">
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32, fontSize: 13 }}>
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 16px', fontSize: 13 }}>
              {search ? 'No conversations found' : 'No conversations yet. Start one!'}
            </div>
          ) : (
            filtered.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                currentUserId={currentUser.id}
                isActive={conv.id === activeConvId}
                onClick={() => setActiveConvId(conv.id)}
              />
            ))
          )}
        </div>

        {/* Bottom status */}
        <div className="sidebar-footer">
          <span className={`conn-dot ${isConnected ? 'online' : 'offline'}`} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {isConnected ? 'Connected' : 'Reconnecting…'}
          </span>
          <button
            className="signout-btn"
            onClick={logout}
            id="logout-btn"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Chat area */}
      {activeConv ? (
        <ChatPane
          key={activeConv.id}
          conversation={activeConv}
          currentUser={currentUser}
          wsSubscribe={subscribe}
          wsSend={send}
          onConversationUpdated={loadConversations}
          onNavigate={(convId) => setActiveConvId(convId)}
        />
      ) : (
        <div className="empty-pane" style={{ flex: 1 }}>
          <div className="empty-pane-icon">
            <IconLock />
          </div>
          <div className="empty-pane-title">Signal</div>
          <div className="empty-pane-sub">
            Select a conversation to start messaging
          </div>
          <div className="empty-pane-badge">
            End-to-end encrypted
          </div>
        </div>
      )}

      {/* Modals */}
      {showNewConv && (
        <NewConversationModal
          currentUserId={currentUser.id}
          onClose={() => setShowNewConv(false)}
          onCreated={(convId) => {
            setShowNewConv(false);
            loadConversations().then(() => setActiveConvId(convId));
          }}
        />
      )}
      {showProfile && (
        <ProfileModal
          user={currentUser}
          currentUserId={currentUser.id}
          onClose={() => setShowProfile(false)}
          onStartChat={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
