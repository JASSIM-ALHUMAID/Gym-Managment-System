import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, apiFetch, type DemoUser } from './api';

const STORAGE_KEY = 'gym-demo-user';

type LoginResponse = {
  user: DemoUser;
};

type AuthContextValue = {
  user: DemoUser | null;
  login: (username: string) => Promise<DemoUser>;
  logout: () => void;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(() => {
    const storedUser = localStorage.getItem(STORAGE_KEY);
    if (!storedUser) return null;

    try {
      return JSON.parse(storedUser) as DemoUser;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  async function login(username: string) {
    const data = await apiFetch<LoginResponse>('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
    setUser(data.user);
    return data.user;
  }

  function logout() {
    setUser(null);
  }

  async function request<T>(path: string, options: RequestInit = {}) {
    try {
      return await apiFetch<T>(path, options, user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setUser(null);
      throw err;
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, request }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
