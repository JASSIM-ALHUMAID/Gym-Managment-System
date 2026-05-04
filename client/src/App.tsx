import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import type { DemoUser } from './api';
import { AuthProvider, useAuth } from './auth';
import AdminDashboard from './pages/AdminDashboard';
import LandingPage from './pages/LandingPage';
import LoginPage, { dashboardPathFor } from './pages/LoginPage';
import MemberDashboard from './pages/MemberDashboard';
import TrainerDashboard from './pages/TrainerDashboard';

type DashboardLink = {
  to: string;
  label: string;
  roles: DemoUser['role'][];
};

const dashboardLinks: DashboardLink[] = [
  { to: '/admin', label: 'Admin ops', roles: ['admin'] },
  { to: '/trainer', label: 'Trainer floor', roles: ['trainer'] },
  { to: '/member', label: 'Member hub', roles: ['member'] }
];

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: DemoUser['role'][] }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={dashboardPathFor(user)} replace />;
  return children;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const visibleLinks = dashboardLinks.filter((link) => user && link.roles.includes(user.role));
  const initials = user?.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'IC';

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="command-sidebar" aria-label="Command navigation">
        <div className="brand-block">
          <p className="eyebrow">Iron Command</p>
          <h2>Gym Control</h2>
          <span>Operator #{user?.user_id ?? '----'}</span>
        </div>
        <nav className="top-nav-tabs" aria-label="Primary navigation">
          {visibleLinks.map((link) => (
            <NavLink key={link.to} to={link.to}>{link.label}</NavLink>
          ))}
        </nav>
        <button className="secondary sidebar-logout" type="button" onClick={logout}>Log session</button>
      </aside>
      <div className="command-main">
        <header className="top-navbar">
          <div className="command-status" aria-live="polite"><span aria-hidden="true" /> System operational</div>
          <div className="command-search" aria-label="Database query placeholder">Query database...</div>
          <button className="secondary system-log-button" type="button" disabled title="System log view is visual only">System_log</button>
        <div className="user-menu">
          <div className="avatar" aria-hidden="true">{initials}</div>
          <div className="user-meta">
            <strong>{user?.full_name}</strong>
            <span>{user?.role}</span>
          </div>
        </div>
        </header>
        <main id="main-content" className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}

function HomeRoute() {
  const { user } = useAuth();
  return user ? <Navigate to={dashboardPathFor(user)} replace /> : <LandingPage />;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <Shell><AdminDashboard /></Shell>
          </ProtectedRoute>
        } />
        <Route path="/trainer" element={
          <ProtectedRoute roles={['trainer']}>
            <Shell><TrainerDashboard /></Shell>
          </ProtectedRoute>
        } />
        <Route path="/member" element={
          <ProtectedRoute roles={['member']}>
            <Shell><MemberDashboard /></Shell>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
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
