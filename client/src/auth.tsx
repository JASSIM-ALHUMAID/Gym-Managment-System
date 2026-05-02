import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, apiFetch, type DemoUser } from './api';

const STORAGE_KEY = 'gym-auth-session';

type LoginResponse = {
  token: string;
  user: DemoUser;
};

type RegisterInput = {
  username: string;
  password: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
};

type StoredAuth = LoginResponse;

type AuthContextValue = {
  user: DemoUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<DemoUser>;
  register: (input: RegisterInput) => Promise<DemoUser>;
  logout: () => void;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => {
    localStorage.removeItem(STORAGE_KEY);
    const storedAuth = sessionStorage.getItem(STORAGE_KEY);
    if (!storedAuth) return null;

    try {
      return JSON.parse(storedAuth) as StoredAuth;
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });
  const user = auth?.user ?? null;
  const token = auth?.token ?? null;

  useEffect(() => {
    localStorage.removeItem(STORAGE_KEY);
    if (auth) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  async function login(username: string, password: string) {
    const data = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setAuth(data);
    return data.user;
  }

  async function register(input: RegisterInput) {
    const data = await apiFetch<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    setAuth(data);
    return data.user;
  }

  function logout() {
    setAuth(null);
  }

  async function request<T>(path: string, options: RequestInit = {}) {
    try {
      return await apiFetch<T>(path, options, token);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setAuth(null);
      throw err;
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, request }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
