import { FormEvent, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { DemoUser } from './api';
import { AuthProvider, useAuth } from './auth';

function dashboardPathFor(user: DemoUser) {
  if (user.role === 'admin' || user.role === 'staff') return '/admin';
  if (user.role === 'trainer') return '/trainer';
  return '/member';
}

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to={dashboardPathFor(user)} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const loggedInUser = await login(username);
      navigate(dashboardPathFor(loggedInUser), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">Gym Management</p>
        <h1>Demo Login</h1>
        <p className="muted">Sign in with a seeded demo username to preview each dashboard.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin, trainer, member..."
            autoComplete="username"
            required
          />
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: DemoUser['role'][] }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={dashboardPathFor(user)} replace />;
  return children;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Gym Portal</p>
          <h2>{user?.full_name}</h2>
          <p className="muted">{user?.role}</p>
        </div>
        <nav>
          <NavLink to="/admin">Admin</NavLink>
          <NavLink to="/trainer">Trainer</NavLink>
          <NavLink to="/member">Member</NavLink>
        </nav>
        <button className="secondary" type="button" onClick={logout}>Log out</button>
      </aside>
      <main className="dashboard-content">{children}</main>
    </div>
  );
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? dashboardPathFor(user) : '/login'} replace />;
}

function DashboardPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="dashboard-card">
      <p className="eyebrow">Task 7 Placeholder</p>
      <h1>{title}</h1>
      <p className="muted">{description}</p>
      <div className="stats-grid">
        <article>
          <span>Today</span>
          <strong>--</strong>
        </article>
        <article>
          <span>This week</span>
          <strong>--</strong>
        </article>
        <article>
          <span>Needs review</span>
          <strong>--</strong>
        </article>
      </div>
    </section>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin', 'staff']}>
            <Shell><DashboardPlaceholder title="Admin Dashboard" description="Manage users, plans, subscriptions, and gym operations." /></Shell>
          </ProtectedRoute>
        } />
        <Route path="/trainer" element={
          <ProtectedRoute roles={['trainer']}>
            <Shell><DashboardPlaceholder title="Trainer Dashboard" description="Track assigned members, sessions, and attendance." /></Shell>
          </ProtectedRoute>
        } />
        <Route path="/member" element={
          <ProtectedRoute roles={['member']}>
            <Shell><DashboardPlaceholder title="Member Dashboard" description="View memberships, bookings, payments, and progress." /></Shell>
          </ProtectedRoute>
        } />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
