'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/types';

interface Props {
  replyTo: Message | null;
  onCancelReply: () => void;
  onSend: (content: string, type?: 'text' | 'image' | 'file' | 'system', disappears_at?: string) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

const TIMER_OPTIONS = [
  { label: 'Off',  seconds: 0 },
  { label: '30s',  seconds: 30 },
  { label: '5 min', seconds: 300 },
  { label: '1 hr',  seconds: 3600 },
];

export function MessageInput({ replyTo, onCancelReply, onSend, onTyping, disabled }: Props) {
  const [content, setContent] = useState('');
  const [disappearSeconds, setDisappearSeconds] = useState<number>(0);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const timerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [replyTo]);

  // Close timer menu on outside click
  useEffect(() => {
    if (!showTimerMenu) return;
    const handler = (e: MouseEvent) => {
      if (timerMenuRef.current && !timerMenuRef.current.contains(e.target as Node)) {
        setShowTimerMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTimerMenu]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Auto-resize textarea
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
    }

    // Typing indicator
    onTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 2000);
  };

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    let disappears_at: string | undefined;
    if (disappearSeconds > 0) {
      // Always compute as UTC ISO string (with Z)
      disappears_at = new Date(Date.now() + disappearSeconds * 1000).toISOString();
    }
    onSend(trimmed, 'text', disappears_at);
    setContent('');
    clearTimeout(typingTimeout.current);
    onTyping(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      const payload = JSON.stringify({
        name: file.name,
        size: file.size,
        url: dataUrl
      });
      let disappears_at: string | undefined;
      if (disappearSeconds > 0) {
        disappears_at = new Date(Date.now() + disappearSeconds * 1000).toISOString();
      }
      onSend(payload, type, disappears_at);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeOption = TIMER_OPTIONS.find(o => o.seconds === disappearSeconds) || TIMER_OPTIONS[0];
  const timerActive = disappearSeconds > 0;

  return (
    <div className="input-area">
      {replyTo && (
        <div className="reply-bar">
          <div className="reply-bar-content">
            <div className="reply-bar-name">
              Replying to {replyTo.sender.display_name}
            </div>
            <div className="reply-bar-text">{replyTo.content}</div>
          </div>
          <button
            onClick={onCancelReply}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 18,
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      )}
      <div className="input-row" style={replyTo ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 } : {}}>
        <textarea
          id="message-input"
          ref={textareaRef}
          className="msg-textarea"
          placeholder="Message"
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
        />

        {/* Disappearing messages timer button + dropdown */}
        <div style={{ position: 'relative' }} ref={timerMenuRef}>
          <button
            className={`icon-btn ${timerActive ? 'active' : ''}`}
            style={{ margin: '0 2px', color: timerActive ? 'var(--accent)' : 'inherit', position: 'relative' }}
            title={timerActive ? `Disappears in ${activeOption.label}` : 'Disappearing messages'}
            onClick={() => setShowTimerMenu(v => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {timerActive && (
              <span style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--accent)',
                border: '1.5px solid var(--surface-2)',
              }} />
            )}
          </button>

          {showTimerMenu && (
            <div className="timer-dropdown">
              <div className="timer-dropdown-header">Disappearing messages</div>
              {TIMER_OPTIONS.map(opt => (
                <button
                  key={opt.seconds}
                  className={`timer-option ${disappearSeconds === opt.seconds ? 'selected' : ''}`}
                  onClick={() => {
                    setDisappearSeconds(opt.seconds);
                    setShowTimerMenu(false);
                  }}
                >
                  <span className="timer-option-icon">
                    {opt.seconds === 0 ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    )}
                  </span>
                  {opt.label}
                  {disappearSeconds === opt.seconds && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="icon-btn" style={{ margin: '0 2px', cursor: 'pointer' }} title="Attach file">
          <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={disabled} />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </label>
        <button
          id="send-btn"
          className="send-btn"
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          title="Send (Enter)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
