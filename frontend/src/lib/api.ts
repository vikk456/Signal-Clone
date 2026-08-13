const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('signal_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) return null as T;
  return res.json();
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (data: { phone_number: string; username: string; display_name: string; password: string }) =>
      request<{ message: string; hint: string; phone_number: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    verifyOtp: (data: { phone_number: string; otp: string }) =>
      request<import('@/types').TokenResponse>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: (data: { username: string; password: string }) =>
      request<import('@/types').TokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    me: () => request<import('@/types').User>('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' }),
  },

  users: {
    search: (q: string) => request<import('@/types').User[]>(`/users/search?q=${encodeURIComponent(q)}`),
    get: (id: number) => request<import('@/types').User>(`/users/${id}`),
    updateMe: (data: { display_name?: string; bio?: string; avatar_url?: string }) =>
      request<import('@/types').User>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
    uploadAvatar: async (file: File) => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/users/me/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json() as Promise<import('@/types').User>;
    },
  },

  contacts: {
    list: () => request<import('@/types').User[]>('/contacts'),
    add: (contact_id: number, nickname?: string) =>
      request('/contacts', { method: 'POST', body: JSON.stringify({ contact_id, nickname }) }),
    remove: (id: number) => request(`/contacts/${id}`, { method: 'DELETE' }),
  },

  conversations: {
    list: () => request<import('@/types').Conversation[]>('/conversations'),
    get: (id: number) => request<import('@/types').Conversation>(`/conversations/${id}`),
    create: (data: {
      is_group?: boolean;
      member_ids: number[];
      group_name?: string;
      group_avatar?: string;
      group_description?: string;
    }) => request<import('@/types').Conversation>('/conversations', { method: 'POST', body: JSON.stringify(data) }),
    getMessages: (convId: number, beforeId?: number) => {
      const params = beforeId ? `?before_id=${beforeId}` : '';
      return request<import('@/types').Message[]>(`/conversations/${convId}/messages${params}`);
    },
    addMembers: (convId: number, user_ids: number[]) =>
      request<import('@/types').Conversation>(`/conversations/${convId}/members`, {
        method: 'POST',
        body: JSON.stringify({ user_ids }),
      }),
    removeMember: (convId: number, userId: number) =>
      request(`/conversations/${convId}/members/${userId}`, { method: 'DELETE' }),
  },

  messages: {
    send: (convId: number, data: { content: string; message_type?: string; reply_to_id?: number; disappears_at?: string }) =>
      request<import('@/types').Message>(`/conversations/${convId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    edit: (msgId: number, content: string) =>
      request<import('@/types').Message>(`/messages/${msgId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
    delete: (msgId: number) => request(`/messages/${msgId}`, { method: 'DELETE' }),
    react: (msgId: number, emoji: string) =>
      request<import('@/types').Message>(`/messages/${msgId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) }),
    markRead: (msgId: number) => request(`/messages/${msgId}/read`, { method: 'POST' }),
  },
};

export { getToken };
export const API_WS_BASE = API_BASE.replace(/^http/, 'ws');
