'use client';

import { User } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface AvatarProps {
  user?: User | null;
  name?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showOnline?: boolean;
  isOnline?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const BG_COLORS = [
  '#3a76f0', '#7c3aed', '#db2777', '#ea580c',
  '#16a34a', '#0891b2', '#dc2626', '#9333ea',
];

function getColor(id: number | string): string {
  const n = typeof id === 'number' ? id : id.charCodeAt(0);
  return BG_COLORS[n % BG_COLORS.length];
}

export function Avatar({ user, name, avatarUrl, size = 'md', showOnline, isOnline }: AvatarProps) {
  const displayName = user?.display_name || name || '?';
  const url = avatarUrl ?? user?.avatar_url;
  const online = isOnline ?? user?.is_online;
  const colorId = user?.id || displayName;

  return (
    <div
      className={`avatar ${size}`}
      style={{ background: url ? undefined : getColor(colorId) }}
    >
      {url ? (
        <img src={url} alt={displayName} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        getInitials(displayName)
      )}
      {showOnline && online && <span className="online-dot" />}
    </div>
  );
}

export function formatLastSeen(lastSeen?: string | null): string {
  if (!lastSeen) return 'last seen recently';
  try {
    // Backend returns naive UTC datetimes without a Z suffix.
    // Without the Z, new Date() treats the string as local time,
    // making recent timestamps appear to be hours in the future.
    const normalized = /[Zz]|[+-]\d{2}:\d{2}$/.test(lastSeen) ? lastSeen : lastSeen + 'Z';
    return `last seen ${formatDistanceToNow(new Date(normalized), { addSuffix: true })}`;
  } catch {
    return 'last seen recently';
  }
}
