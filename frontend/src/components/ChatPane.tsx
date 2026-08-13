'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, Message, User } from '@/types';
import { api } from '@/lib/api';
import { Avatar, formatLastSeen } from './Avatar';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { GroupInfoModal } from './GroupInfoModal';
import { ProfileModal } from './ProfileModal';
import { format, isSameDay } from 'date-fns';
import toast from 'react-hot-toast';

interface Props {
  conversation: Conversation;
  currentUser: User;
  wsSubscribe: (handler: (event: any) => void) => () => void;
  wsSend: (data: object) => void;
  onConversationUpdated: () => void;
  onNavigate: (convId: number) => void;
}

export function ChatPane({
  conversation: conv,
  currentUser,
  wsSubscribe,
  wsSend,
  onConversationUpdated,
  onNavigate,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState<User[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showProfile, setShowProfile] = useState<User | null>(null);
  const [now, setNow] = useState(Date.now());
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);

  // Update current time every second to filter disappeared messages
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const otherUser = !conv.is_group
    ? conv.members.find(m => m.user_id !== currentUser.id)?.user
    : null;

  // Load messages
  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setHasMore(true);
    setTypingUsers([]);

    api.conversations.getMessages(conv.id).then(msgs => {
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 0);
    }).catch(() => setLoading(false));
  }, [conv.id]);

  // Mark last message read
  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.sender_id !== currentUser.id) {
        api.messages.markRead(last.id).catch(() => {});
      }
    }
  }, [messages, currentUser.id]);

  // WebSocket events
  useEffect(() => {
    const unsub = wsSubscribe((event) => {
      if (event.type === 'new_message' && event.message.conversation_id === conv.id) {
        setMessages(prev => {
          // If already present with real ID, skip (dedup guard)
          if (prev.find(m => m.id === event.message.id)) return prev;
          // If this is our own message confirming, strip the optimistic placeholder
          // (optimistic messages use Date.now() which is > 1_000_000_000_000)
          if (event.message.sender_id === currentUser.id) {
            const withoutOptimistic = prev.filter(m => !(m.id > 1_000_000_000_000 && m.sender_id === currentUser.id));
            return [...withoutOptimistic, event.message];
          }
          return [...prev, event.message];
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

        // Mark as read (messages from others — sender is excluded by backend broadcast)
        api.messages.markRead(event.message.id).catch(() => {});
        onConversationUpdated();
      }

      if (event.type === 'typing' && event.conversation_id === conv.id) {
        const member = conv.members.find(m => m.user_id === event.user_id);
        if (!member) return;
        const user = member.user;
        if (event.is_typing) {
          setTypingUsers(prev => prev.find(u => u.id === user.id) ? prev : [...prev, user]);
        } else {
          setTypingUsers(prev => prev.filter(u => u.id !== user.id));
        }
        // Auto-clear after 3s
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.id !== event.user_id));
        }, 3000);
      }

      if (event.type === 'message_status' && event.conversation_id === conv.id) {
        setMessages(prev => prev.map(m =>
          m.id === event.message_id ? { ...m, status: event.status } : m
        ));
      }

      if (event.type === 'message_edited' && event.conversation_id === conv.id) {
        setMessages(prev => prev.map(m =>
          m.id === event.message_id
            ? { ...m, content: event.content, edited_at: event.edited_at }
            : m
        ));
      }

      if (event.type === 'message_deleted' && event.conversation_id === conv.id) {
        setMessages(prev => prev.map(m =>
          m.id === event.message_id
            ? { ...m, is_deleted: true, content: 'This message was deleted' }
            : m
        ));
      }

      if (event.type === 'message_reaction' && event.conversation_id === conv.id) {
        // Reload just the affected message
        api.conversations.getMessages(conv.id).then(msgs => {
          const updated = msgs.find(m => m.id === event.message_id);
          if (updated) {
            setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
          }
        }).catch(() => {});
      }

      if (event.type === 'user_presence') {
        // handled by parent for sidebar; here just update typing user's online status
      }
    });
    return unsub;
  }, [conv.id, conv.members, currentUser.id, wsSubscribe, onConversationUpdated]);

  // Load older messages (infinite scroll)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading || messages.length === 0) return;
    const oldestId = messages[0].id;
    const older = await api.conversations.getMessages(conv.id, oldestId);
    if (older.length === 0) { setHasMore(false); return; }
    setMessages(prev => [...older, ...prev]);
  }, [conv.id, hasMore, loading, messages]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop < 80) loadMore();
  }, [loadMore]);

  // Send message
  const handleSend = async (content: string, type: 'text' | 'image' | 'file' | 'system' = 'text', disappears_at?: string) => {
    const tempId = Date.now();
    const replyToMsg = replyTo;
    const optimistic: Message = {
      id: tempId,
      conversation_id: conv.id,
      sender_id: currentUser.id,
      sender: currentUser,
      content,
      message_type: type,
      status: 'sending',
      reply_to_id: replyToMsg?.id || null,
      reply_to: replyToMsg,
      is_deleted: false,
      disappears_at,
      created_at: new Date().toISOString(),
      reactions: [],
    };
    setMessages(prev => [...prev, optimistic]);
    setReplyTo(null);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const sent = await api.messages.send(conv.id, {
        content,
        message_type: type,
        reply_to_id: replyToMsg?.id,
        disappears_at,
      });
      // Replace optimistic temp message with confirmed server response
      setMessages(prev => prev.map(m => m.id === tempId ? { ...sent } : m));
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error('Failed to send message');
    }
  };

  // Typing
  const handleTyping = (isTyping: boolean) => {
    wsSend({ type: 'typing', conversation_id: conv.id, is_typing: isTyping });
  };

  // React
  const handleReact = async (msgId: number, emoji: string) => {
    try {
      await api.messages.react(msgId, emoji);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Edit
  const handleEditSubmit = async () => {
    if (!editingMsg || !editContent.trim()) return;
    try {
      await api.messages.edit(editingMsg.id, editContent.trim());
      setEditingMsg(null);
      setEditContent('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Delete
  const handleDelete = async (msgId: number) => {
    if (!confirm('Delete this message?')) return;
    try {
      await api.messages.delete(msgId);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Header info
  const headerName = conv.is_group ? conv.group_name : otherUser?.display_name;
  const headerSub = conv.is_group
    ? `${conv.members.length} members`
    : otherUser?.is_online
      ? '🟢 Online'
      : formatLastSeen(otherUser?.last_seen);

  // Normalize a datetime string from the backend (which may lack Z/timezone)
  // to always be treated as UTC by appending Z if no timezone marker is present.
  const toUtcMs = (iso?: string | null): number | null => {
    if (!iso) return null;
    const normalized = /[Zz+]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + 'Z';
    return new Date(normalized).getTime();
  };

  // Group messages by date and filter disappeared
  const grouped: { date: Date; messages: Message[] }[] = [];
  messages
    .filter(msg => {
      const exp = toUtcMs(msg.disappears_at);
      return exp === null || exp > now;
    })
    .forEach(msg => {
      const d = new Date(toUtcMs(msg.created_at) ?? msg.created_at);
      const last = grouped[grouped.length - 1];
    if (last && isSameDay(last.date, d)) {
      last.messages.push(msg);
    } else {
      grouped.push({ date: d, messages: [msg] });
    }
  });

  return (
    <div style={{ display: 'flex', height: '100%', flex: 1, overflow: 'hidden' }}>
      <div className="chat-pane">
        {/* Header */}
        <div className="chat-header">
          <div
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (conv.is_group) setShowGroupInfo(true);
              else if (otherUser) setShowProfile(otherUser);
            }}
          >
            <Avatar
              name={headerName || '?'}
              avatarUrl={conv.is_group ? conv.group_avatar : otherUser?.avatar_url}
              user={otherUser || undefined}
              showOnline={!conv.is_group}
              isOnline={otherUser?.is_online}
            />
          </div>
          <div
            className="chat-header-info"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (conv.is_group) setShowGroupInfo(true);
              else if (otherUser) setShowProfile(otherUser);
            }}
          >
            <div className="chat-header-name">{headerName}</div>
            <div className="chat-header-sub">{headerSub}</div>
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <button className="icon-btn" title="Voice call (Coming Soon)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 12 19.79 19.79 0 0 1 1 3.18 2 2 0 0 1 2.96 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
            <button className="icon-btn" title="Video call (Coming Soon)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </button>
            {conv.is_group && (
              <button className="icon-btn" title="Group info" onClick={() => setShowGroupInfo(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="messages-area" ref={messagesAreaRef} onScroll={handleScroll}>
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
              Loading messages…
            </div>
          )}

          {grouped.map(({ date, messages: dayMsgs }) => (
            <div key={date.toISOString()}>
              <div className="date-divider">
                <span className="date-divider-label">
                  {format(date, 'MMMM d, yyyy')}
                </span>
              </div>
              {dayMsgs.map((msg, idx) => {
                const prev = dayMsgs[idx - 1];
                const isConsecutive = !!prev && prev.sender_id === msg.sender_id &&
                  (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) < 60000;
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    currentUserId={currentUser.id}
                    isConsecutive={isConsecutive}
                    onReply={setReplyTo}
                    onReact={handleReact}
                    onEdit={m => { setEditingMsg(m); setEditContent(m.content); }}
                    onDelete={handleDelete}
                  />
                );
              })}
            </div>
          ))}

          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 24px' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👋</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {conv.is_group ? `Welcome to ${conv.group_name}!` : `Start a conversation`}
              </div>
              <div style={{ fontSize: 13 }}>Send a message to begin.</div>
            </div>
          )}

          <TypingIndicator users={typingUsers} />
          <div ref={bottomRef} />
        </div>

        {/* Edit mode */}
        {editingMsg ? (
          <div className="input-area">
            <div className="reply-bar">
              <div className="reply-bar-content">
                <div className="reply-bar-name">✏️ Edit message</div>
              </div>
              <button
                onClick={() => { setEditingMsg(null); setEditContent(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}
              >×</button>
            </div>
            <div className="input-row" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
              <textarea
                className="msg-textarea"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); } }}
                autoFocus
                rows={1}
              />
              <button className="send-btn" onClick={handleEditSubmit} disabled={!editContent.trim()}>✓</button>
            </div>
          </div>
        ) : (
          <MessageInput
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSend={handleSend}
            onTyping={handleTyping}
          />
        )}
      </div>

      {/* Modals */}
      {showGroupInfo && (
        <GroupInfoModal
          conversation={conv}
          currentUserId={currentUser.id}
          onClose={() => setShowGroupInfo(false)}
          onUpdated={() => { onConversationUpdated(); setShowGroupInfo(false); }}
        />
      )}
      {showProfile && (
        <ProfileModal
          user={showProfile}
          currentUserId={currentUser.id}
          onClose={() => setShowProfile(null)}
          onStartChat={(convId) => { setShowProfile(null); onNavigate(convId); }}
        />
      )}
    </div>
  );
}
