import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import type { DemoUser } from './api';
import { AuthProvider, useAuth } from './auth';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage, { dashboardPathFor } from './pages/LoginPage';
import MemberDashboard from './pages/MemberDashboard';
import TrainerDashboard from './pages/TrainerDashboard';

type DashboardLink = {
  to: string;
  label: string;
  roles: DemoUser['role'][];
};

const dashboardLinks: DashboardLink[] = [
  { to: '/admin', label: 'Admin', roles: ['admin', 'staff'] },
  { to: '/trainer', label: 'Trainer', roles: ['trainer'] },
  { to: '/member', label: 'Member', roles: ['member'] }
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
    .join('') || 'GM';

  return (
    <div className="app-shell">
      <header className="top-navbar">
        <div className="brand-block">
          <p className="eyebrow">Gym Portal</p>
          <h2>Command Center</h2>
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
      <main className="dashboard-content">{children}</main>
    </div>
  );
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? dashboardPathFor(user) : '/login'} replace />;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomeRedirect />} />
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
