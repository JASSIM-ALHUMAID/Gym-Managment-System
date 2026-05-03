export type DemoUser = {
  user_id: number;
  username: string;
  role: 'admin' | 'trainer' | 'member';
  full_name: string;
  email: string | null;
  status: string;
  member_id?: number;
  trainer_id?: number;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`/api${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new ApiError(data.error ?? 'Request failed', response.status);
  return data as T;
}
