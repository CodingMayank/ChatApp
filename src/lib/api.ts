export interface Group {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  created_at: string;
  creator_session_id: string;
  activeUsers?: number;
}

export interface Message {
  id: string;
  group_id: string;
  sender_name: string;
  content: string;
  session_id: string;
  created_at: string;
}

interface ActiveUserCounts {
  totalCount: number;
  groupCount: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new Error('Could not reach the chat server. Check that the server is running and DATABASE_URL is configured.');
  }

  const result = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(
      result?.error ||
        `The chat server returned HTTP ${response.status} for ${init?.method || 'GET'} ${path.split('?')[0]}.`,
    );
  }
  return result as T;
}

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(body),
});

export const api = {
  createSession: (sessionId: string, username: string) =>
    request<{ session_id: string }>('/api/sessions', post({ session_id: sessionId, username })),

  updateSessionGroup: (sessionId: string, groupId: string | null) =>
    request<{ status: string }>(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ group_id: groupId }),
    }),

  heartbeat: (sessionId: string) =>
    request<{ status: string }>(`/api/sessions/${encodeURIComponent(sessionId)}/heartbeat`, post({})),

  endSession: (sessionId: string) =>
    request<{ status: string }>(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),

  fetchGroups: () => request<Group[]>('/api/groups'),

  createGroup: (name: string, sessionId: string, latitude: number, longitude: number) =>
    request<Group>('/api/groups', post({
      name,
      creator_session_id: sessionId,
      latitude,
      longitude,
    })),

  fetchActiveUsers: (groupId?: string | null) => {
    const query = groupId ? `?groupId=${encodeURIComponent(groupId)}` : '';
    return request<ActiveUserCounts>(`/api/active-users${query}`);
  },

  fetchMessages: (groupId: string) =>
    request<Message[]>(`/api/groups/${encodeURIComponent(groupId)}/messages`),

  sendMessage: (groupId: string, senderName: string, content: string, sessionId: string) =>
    request<Message>(`/api/groups/${encodeURIComponent(groupId)}/messages`, post({
      sender_name: senderName,
      content,
      session_id: sessionId,
    })),

  deleteMessages: (groupId: string, sessionId?: string) => {
    const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
    return request<{ status: string }>(`/api/groups/${encodeURIComponent(groupId)}/messages${query}`, {
      method: 'DELETE',
    });
  },
};
