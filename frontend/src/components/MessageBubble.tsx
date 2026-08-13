'use client';

import { Message } from '@/types';
import { Avatar } from './Avatar';
import { format } from 'date-fns';
import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  message: Message;
  currentUserId: number;
  isConsecutive: boolean;
  onReply: (msg: Message) => void;
  onReact: (msgId: number, emoji: string) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msgId: number) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function StatusIcon({ status }: { status: string }) {
  if (status === 'sending') return (
    <span className="status-icon sending" title="Sending">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" strokeDasharray="3 3"/>
      </svg>
    </span>
  );
  if (status === 'sent') return (
    <span className="status-icon sent" title="Sent">
      <svg width="14" height="9" viewBox="0 0 14 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4.5 4 7.5 9 1.5"/>
      </svg>
    </span>
  );
  if (status === 'delivered') return (
    <span className="status-icon delivered" title="Delivered">
      <svg width="17" height="9" viewBox="0 0 17 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4.5 4 7.5 9 1.5"/>
        <polyline points="7 4.5 10 7.5 15 1.5"/>
      </svg>
    </span>
  );
  if (status === 'read') return (
    <span className="status-icon read" title="Read">
      <svg width="17" height="9" viewBox="0 0 17 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4.5 4 7.5 9 1.5"/>
        <polyline points="7 4.5 10 7.5 15 1.5"/>
      </svg>
    </span>
  );
  return null;
}

function FileSize({ bytes }: { bytes?: number }) {
  if (!bytes) return null;
  if (bytes < 1024) return <>{bytes} B</>;
  if (bytes < 1024 * 1024) return <>{(bytes / 1024).toFixed(1)} KB</>;
  return <>{(bytes / (1024 * 1024)).toFixed(1)} MB</>;
}

function DisappearTimer({ disappears_at }: { disappears_at: string }) {
  const toUtcMs = (iso: string) => {
    const normalized = /[Zz+]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + 'Z';
    return new Date(normalized).getTime();
  };

  const [remaining, setRemaining] = useState(() => {
    return Math.max(0, Math.ceil((toUtcMs(disappears_at) - Date.now()) / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const r = Math.max(0, Math.ceil((toUtcMs(disappears_at) - Date.now()) / 1000));
      setRemaining(r);
    }, 1000);
    return () => clearInterval(timer);
  }, [disappears_at]);

  const fmt = (s: number) => {
    if (s >= 3600) return `${Math.ceil(s / 3600)}h`;
    if (s >= 60) return `${Math.ceil(s / 60)}m`;
    return `${s}s`;
  };

  return (
    <span className="disappear-timer" title={`Disappears in ${fmt(remaining)}`}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      {fmt(remaining)}
    </span>
  );
}

interface ContextMenuProps {
  x: number;
  y: number;
  isOut: boolean;
  isDeleted: boolean;
  onClose: () => void;
  onReply: () => void;
  onCopy: () => void;
  onReact: (emoji: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ContextMenu({ x, y, isOut, isDeleted, onClose, onReply, onCopy, onReact, onEdit, onDelete }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const style: React.CSSProperties = {
    position: 'fixed',
    top: y,
    left: x,
    zIndex: 1000,
  };

  return (
    <div ref={menuRef} className="ctx-menu" style={style}>
      {/* Quick reactions row */}
      <div className="ctx-reactions">
        {QUICK_REACTIONS.map(e => (
          <button
            key={e}
            className="ctx-reaction-btn"
            onClick={() => { onReact(e); onClose(); }}
            title={e}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="ctx-divider" />
      <button className="ctx-item" onClick={() => { onReply(); onClose(); }}>
        <span className="ctx-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
          </svg>
        </span>
        Reply
      </button>
      {!isDeleted && (
        <button className="ctx-item" onClick={() => { onCopy(); onClose(); }}>
          <span className="ctx-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </span>
          Copy text
        </button>
      )}
      {isOut && !isDeleted && (
        <button className="ctx-item" onClick={() => { onEdit(); onClose(); }}>
          <span className="ctx-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </span>
          Edit
        </button>
      )}
      {isOut && (
        <>
          <div className="ctx-divider" />
          <button className="ctx-item danger" onClick={() => { onDelete(); onClose(); }}>
            <span className="ctx-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </span>
            Delete
          </button>
        </>
      )}
    </div>
  );
}

export function MessageBubble({ message: msg, currentUserId, isConsecutive, onReply, onReact, onEdit, onDelete }: Props) {
  const isOut = msg.sender_id === currentUserId;
  const [imgExpanded, setImgExpanded] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  // Group reactions by emoji
  const reactionGroups = msg.reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false };
    acc[r.emoji].count++;
    if (r.user_id === currentUserId) acc[r.emoji].mine = true;
    return acc;
  }, {} as Record<string, { count: number; mine: boolean }>);

  // Normalize backend naive UTC string → always parse as UTC
  const toUtc = (iso: string) =>
    /[Zz]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + 'Z';

  const timeStr = format(new Date(toUtc(msg.created_at)), 'HH:mm');

  // Parse metadata for file messages
  let fileMeta: { name?: string; size?: number; url?: string } | null = null;
  if (msg.message_type === 'file' || msg.message_type === 'image') {
    try {
      fileMeta = JSON.parse(msg.content);
    } catch {
      fileMeta = { url: msg.content };
    }
  }

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const menuW = 200;
    const menuH = 300;
    const x = Math.min(e.clientX, window.innerWidth - menuW - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuH - 8);
    setCtxMenu({ x, y });
  }, []);

  const handleCopy = () => {
    if (!msg.is_deleted) navigator.clipboard.writeText(msg.content).catch(() => {});
  };

  // System messages — centered pill
  if (msg.message_type === 'system') {
    return (
      <div className="system-msg">
        <span>{msg.content}</span>
      </div>
    );
  }

  return (
    <>
      {/* Expanded image lightbox */}
      {imgExpanded && fileMeta?.url && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, cursor: 'zoom-out',
          }}
          onClick={() => setImgExpanded(false)}
        >
          <img src={fileMeta.url} alt="attachment" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }} />
        </div>
      )}

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          isOut={isOut}
          isDeleted={msg.is_deleted}
          onClose={() => setCtxMenu(null)}
          onReply={() => onReply(msg)}
          onCopy={handleCopy}
          onReact={(emoji) => onReact(msg.id, emoji)}
          onEdit={() => onEdit(msg)}
          onDelete={() => onDelete(msg.id)}
        />
      )}

      <div
        className={`msg-row ${isOut ? 'out' : 'in'} ${isConsecutive ? (isOut ? 'consecutive-out' : 'consecutive-in') : ''}`}
        id={`msg-${msg.id}`}
        onContextMenu={handleContextMenu}
      >
        {/* Avatar — only for incoming, hidden when consecutive */}
        {!isOut && (
          <div className={`msg-avatar-wrap ${isConsecutive ? 'invisible' : ''}`}>
            <Avatar user={msg.sender} size="sm" />
          </div>
        )}

        <div className={`msg-col ${isOut ? 'out' : 'in'}`}>
          {/* Sender name (group chats, first in a run) */}
          {!isOut && !isConsecutive && (
            <span className="msg-sender-name">{msg.sender.display_name}</span>
          )}

          <div className="msg-bubble-wrap">
            {/* ── Bubble ── */}
            <div className={`bubble ${isOut ? 'out' : 'in'} ${msg.is_deleted ? 'deleted' : ''} ${!isConsecutive ? (isOut ? 'tail-out' : 'tail-in') : ''}`}>

              {/* Reply preview */}
              {msg.reply_to && !msg.is_deleted && (
                <div className="reply-preview">
                  <div className="reply-preview-name">{msg.reply_to.sender?.display_name}</div>
                  <div className="reply-preview-text">
                    {msg.reply_to.message_type === 'image' ? '📷 Photo' :
                     msg.reply_to.message_type === 'file'  ? '📎 File'  :
                     msg.reply_to.content}
                  </div>
                </div>
              )}

              {/* Content by type */}
              {msg.is_deleted ? (
                <div className="bubble-text deleted-text">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5, opacity: 0.6, flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                  </svg>
                  This message was deleted
                </div>
              ) : msg.message_type === 'image' && fileMeta?.url ? (
                <>
                  <img
                    src={fileMeta.url}
                    alt="photo"
                    className="msg-image"
                    onClick={() => setImgExpanded(true)}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  {fileMeta.name && (
                    <div className="bubble-text" style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{fileMeta.name}</div>
                  )}
                </>
              ) : msg.message_type === 'file' && fileMeta?.url ? (
                <a
                  href={fileMeta.url}
                  download={fileMeta.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="msg-file"
                >
                  <div className="msg-file-icon-wrap">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div>
                    <div className="msg-file-name">{fileMeta.name || 'File'}</div>
                    {fileMeta.size && (
                      <div className="msg-file-size"><FileSize bytes={fileMeta.size} /></div>
                    )}
                  </div>
                </a>
              ) : (
                <div className="bubble-text">{msg.content}</div>
              )}

              {/* Meta row: edited + timer + time + ticks */}
              <div className="bubble-meta">
                {msg.edited_at && !msg.is_deleted && <span className="bubble-edited">edited</span>}
                {msg.disappears_at && !msg.is_deleted && (
                  <DisappearTimer disappears_at={msg.disappears_at} />
                )}
                <span className="bubble-time">{timeStr}</span>
                {isOut && <StatusIcon status={msg.status} />}
              </div>
            </div>

            {/* Reactions */}
            {Object.keys(reactionGroups).length > 0 && (
              <div className="reactions-row" style={{ justifyContent: isOut ? 'flex-end' : 'flex-start' }}>
                {Object.entries(reactionGroups).map(([emoji, data]) => (
                  <button
                    key={emoji}
                    className={`reaction-chip ${data.mine ? 'mine' : ''}`}
                    onClick={() => onReact(msg.id, emoji)}
                    title={data.mine ? 'Remove reaction' : 'React'}
                  >
                    {emoji} {data.count > 1 && <span style={{ fontSize: 10 }}>{data.count}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
