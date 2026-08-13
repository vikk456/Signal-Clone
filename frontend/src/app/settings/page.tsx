'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Avatar';
import toast from 'react-hot-toast';

type Section = 'profile' | 'privacy' | 'notifications' | 'appearance' | 'linked' | 'stories' | 'calls';

const NAV_ITEMS: { id: Section; icon: string; label: string }[] = [
  { id: 'profile', icon: '👤', label: 'Profile' },
  { id: 'privacy', icon: '🔒', label: 'Privacy' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'appearance', icon: '🎨', label: 'Appearance' },
  { id: 'linked', icon: '📱', label: 'Linked Devices' },
  { id: 'stories', icon: '📖', label: 'Stories' },
  { id: 'calls', icon: '📞', label: 'Calls' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [section, setSection] = useState<Section>('profile');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  // Privacy toggles (mocked)
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
  const [seenBy, setSeenBy] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifSound, setNotifSound] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('signal_user');
    if (!stored) { router.replace('/auth'); return; }
    const user = JSON.parse(stored);
    setCurrentUser(user);
    setDisplayName(user.display_name);
    setBio(user.bio || '');
    // Load saved theme
    const savedTheme = localStorage.getItem('signal_theme') as 'dark' | 'light' | 'system' | null;
    if (savedTheme) setTheme(savedTheme);
  }, [router]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await api.users.updateMe({ display_name: displayName, bio });
      localStorage.setItem('signal_user', JSON.stringify(updated));
      setCurrentUser(updated);
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await api.users.uploadAvatar(file);
      localStorage.setItem('signal_user', JSON.stringify(updated));
      setCurrentUser(updated);
      toast.success('Avatar updated');
    } catch (err: any) {
      toast.error('Failed to upload avatar');
    }
  };

  if (!currentUser) return null;

  return (
    <div className="settings-page">
      {/* Sidebar */}
      <div className="settings-sidebar">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <button
            onClick={() => router.push('/conversations')}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 16, padding: 0 }}
          >
            ← Back
          </button>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>Settings</div>
        </div>
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            className={`settings-nav-item ${section === item.id ? 'active' : ''}`}
            onClick={() => setSection(item.id)}
            id={`settings-nav-${item.id}`}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="settings-content">
        {section === 'profile' && (
          <>
            <div className="settings-section-title">Profile</div>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
              <label style={{ cursor: 'pointer', position: 'relative' }}>
                <Avatar user={currentUser} size="lg" />
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', opacity: 0, transition: 'opacity 150ms',
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  <span style={{ fontSize: 18 }}>📷</span>
                </div>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
              </label>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{currentUser.display_name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>@{currentUser.username}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{currentUser.phone_number}</div>
              </div>
            </div>

            <div className="settings-card">
              <div style={{ padding: '16px 20px' }}>
                <label className="form-label">Display Name</label>
                <input
                  id="settings-display-name"
                  className="form-input"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                />
              </div>
              <div style={{ padding: '0 20px 16px' }}>
                <label className="form-label">About</label>
                <textarea
                  id="settings-bio"
                  className="form-input"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical' }}
                  placeholder="Tell people a bit about yourself"
                />
              </div>
              <div style={{ padding: '0 20px 20px' }}>
                <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </>
        )}

        {section === 'privacy' && (
          <>
            <div className="settings-section-title">Privacy</div>
            <div className="settings-card">
              {[
                { label: 'Read Receipts', desc: 'Show when you\'ve read messages', value: readReceipts, set: setReadReceipts },
                { label: 'Typing Indicators', desc: 'Show when you\'re typing', value: typingIndicators, set: setTypingIndicators },
                { label: 'Last Seen', desc: 'Show when you were last online', value: seenBy, set: setSeenBy },
              ].map(({ label, desc, value, set }) => (
                <div className="settings-row" key={label}>
                  <div>
                    <div className="settings-row-label">{label}</div>
                    <div className="settings-row-desc">{desc}</div>
                  </div>
                  <button className={`toggle ${value ? 'on' : ''}`} onClick={() => set(!value)} />
                </div>
              ))}
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Screen Security</div>
                  <div className="settings-row-desc">Block screenshots and screen recording</div>
                </div>
                <span className="coming-soon">Coming Soon</span>
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Registration Lock</div>
                  <div className="settings-row-desc">Require PIN to re-register your number</div>
                </div>
                <span className="coming-soon">Coming Soon</span>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div className="settings-card" style={{ border: '1px solid var(--danger)', background: 'rgba(239,68,68,0.05)' }}>
                <div className="settings-row" style={{ cursor: 'pointer', color: 'var(--danger)' }}
                  onClick={() => toast('This action is irreversible in a real app', { icon: '⚠️' })}>
                  <div className="settings-row-label" style={{ color: 'var(--danger)' }}>Delete Account</div>
                </div>
              </div>
            </div>
          </>
        )}

        {section === 'notifications' && (
          <>
            <div className="settings-section-title">Notifications</div>
            <div className="settings-card">
              {[
                { label: 'Notifications', desc: 'Show message notifications', value: notifEnabled, set: setNotifEnabled },
                { label: 'Notification Sound', desc: 'Play a sound for new messages', value: notifSound, set: setNotifSound },
              ].map(({ label, desc, value, set }) => (
                <div className="settings-row" key={label}>
                  <div>
                    <div className="settings-row-label">{label}</div>
                    <div className="settings-row-desc">{desc}</div>
                  </div>
                  <button className={`toggle ${value ? 'on' : ''}`} onClick={() => set(!value)} />
                </div>
              ))}
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Notification Content</div>
                  <div className="settings-row-desc">Show name and message in notifications</div>
                </div>
                <span className="coming-soon">Coming Soon</span>
              </div>
            </div>
          </>
        )}

        {section === 'appearance' && (
          <>
            <div className="settings-section-title">Appearance</div>
            <div className="settings-card">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Theme</div>
                  <div className="settings-row-desc">Choose your preferred color scheme</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['dark', 'light', 'system'] as const).map(t => (
                    <button
                      key={t}
                      id={`theme-${t}`}
                      onClick={() => {
                        setTheme(t);
                        const appliedTheme = t === 'system' ? 'dark' : t;
                        document.documentElement.setAttribute('data-theme', appliedTheme);
                        localStorage.setItem('signal_theme', t);
                      }}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        border: theme === t ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: theme === t ? 'var(--accent-muted)' : 'var(--surface-2)',
                        color: theme === t ? 'var(--accent)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: theme === t ? 700 : 400,
                        textTransform: 'capitalize',
                        transition: 'all 150ms',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Chat Wallpaper</div>
                  <div className="settings-row-desc">Customize your chat background</div>
                </div>
                <span className="coming-soon">Coming Soon</span>
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Font Size</div>
                  <div className="settings-row-desc">Adjust text size in chats</div>
                </div>
                <span className="coming-soon">Coming Soon</span>
              </div>
            </div>
          </>
        )}

        {['linked', 'stories', 'calls'].includes(section) && (
          <>
            <div className="settings-section-title">
              {NAV_ITEMS.find(n => n.id === section)?.label}
            </div>
            <div style={{
              textAlign: 'center',
              padding: '80px 40px',
              background: 'var(--surface-1)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {NAV_ITEMS.find(n => n.id === section)?.icon}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                Coming Soon
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                This feature is under development and will be available in a future update.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
