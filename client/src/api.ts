export type DemoUser = {
  user_id: number;
  username: string;
  role: 'admin' | 'staff' | 'trainer' | 'member';
  full_name: string;
  email: string | null;
  status: string;
  member_id?: number;
  trainer_id?: number;
};

export async function apiFetch<T>(path: string, options: RequestInit = {}, user?: DemoUser | null): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (user) headers.set('x-demo-user-id', String(user.user_id));

  const response = await fetch(`/api${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}
