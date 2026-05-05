import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import type { DemoUser } from '../api';
import { useAuth } from '../auth';

const sampleUsers = [
  { username: 'admin1', label: 'Admin User', role: 'Admin' }
];

export function dashboardPathFor(user: DemoUser) {
  if (user.role === 'admin') return '/admin';
  if (user.role === 'trainer') return '/trainer';
  return '/member';
}

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [sampleUser, setSampleUser] = useState('admin1');
  const [username, setUsername] = useState(initialMode === 'register' ? '' : 'admin1');
  const [password, setPassword] = useState(initialMode === 'register' ? '' : 'password123');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('other');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to={dashboardPathFor(user)} replace />;

  function chooseSampleUser(value: string) {
    setSampleUser(value);
    setUsername(value);
    setPassword('password123');
    setMode('login');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const authenticatedUser = mode === 'login'
        ? await login(username, password)
        : await register({ username, password, full_name: fullName, email, phone, gender });
      navigate(dashboardPathFor(authenticatedUser), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page auth-page">
      <section className="login-card wide-login-card auth-card">
        <Link className="brand-mark auth-card-brand" to="/">
          <span className="brand-symbol" aria-hidden="true">GMS</span>
          <span>Gym Management System</span>
        </Link>
        <p className="eyebrow">Pulse Studio Access</p>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create member account'}</h1>
        <p className="muted">Use the seeded admin profile or register a new member account. The demo login uses <code>password123</code>.</p>

        <label className="quick-login" htmlFor="sampleUser">
          <span>Quick sample login</span>
          <select id="sampleUser" value={sampleUser} onChange={(event) => chooseSampleUser(event.target.value)}>
            {sampleUsers.map((sample) => <option key={sample.username} value={sample.username}>{sample.label} - {sample.role}</option>)}
          </select>
        </label>

        <div className="segmented-control" role="group" aria-label="Authentication mode">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input id="username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} />

          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />

          {mode === 'register' ? (
            <>
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" name="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} />

              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />

              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />

              <label htmlFor="gender">Gender</label>
              <select id="gender" name="gender" value={gender} onChange={(event) => setGender(event.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </>
          ) : null}

          {error ? <p className="error" role="alert">{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <Link className="text-link auth-back-link" to="/">Back to landing page</Link>
      </section>
    </main>
  );
}
