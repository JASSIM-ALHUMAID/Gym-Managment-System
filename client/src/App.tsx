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
  { to: '/admin', label: 'Admin ops', roles: ['admin', 'staff'] },
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
      <header className="top-navbar">
        <div className="brand-block">
          <p className="eyebrow">Gym Management</p>
          <h2>System</h2>
        </div>
        <nav className="top-nav-tabs" aria-label="Primary navigation">
          {visibleLinks.map((link) => (
            <NavLink key={link.to} to={link.to}>{link.label}</NavLink>
          ))}
        </nav>
        <div className="user-menu">
          <div className="avatar" aria-hidden="true">{initials}</div>
          <div className="user-meta">
            <strong>{user?.full_name}</strong>
            <span>{user?.role}</span>
          </div>
          <button className="secondary" type="button" onClick={logout}>Log out</button>
        </div>
      </header>
      <main id="main-content" className="dashboard-content">{children}</main>
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
          <ProtectedRoute roles={['admin', 'staff']}>
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
