import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { DemoUser } from '../api';
import { useAuth } from '../auth';

const demoUsers = [
  'admin1',
  'staff1',
  'trainer_ahmed',
  'trainer_lina',
  'member_omar',
  'member_noor',
  'member_sara',
  'member_faisal'
];

export function dashboardPathFor(user: DemoUser) {
  if (user.role === 'admin' || user.role === 'staff') return '/admin';
  if (user.role === 'trainer') return '/trainer';
  return '/member';
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(demoUsers[0]);
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
        <p className="muted">Choose a seeded demo account to preview the role workflows.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Demo user</label>
          <select id="username" name="username" value={username} onChange={(event) => setUsername(event.target.value)}>
            {demoUsers.map((demoUser) => <option key={demoUser} value={demoUser}>{demoUser}</option>)}
          </select>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );
}
