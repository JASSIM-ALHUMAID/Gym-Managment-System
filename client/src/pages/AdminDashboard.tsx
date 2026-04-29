import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../auth';
import ResourceTable, { type ResourceColumn, type ResourceRow } from './ResourceTable';

type DashboardCounts = {
  activeMembers: number;
  activeSubscriptions: number;
  scheduledSessions: number;
  openPayments: number;
};

type ResourceConfig = {
  key: string;
  label: string;
  path: string;
  responseKey: string;
  columns: ResourceColumn<ResourceRow>[];
};

type TrainerRow = ResourceRow & { trainer_id: number; full_name: string };

const emptyPlanForm = { plan_id: '', plan_name: '', duration_months: '1', price: '', description: '' };
const emptySessionForm = {
  session_id: '',
  trainer_id: '',
  session_type: '',
  description: '',
  location: 'Main Studio',
  difficulty: 'beginner',
  session_date: '',
  start_time: '',
  end_time: '',
  capacity: '10'
};

function labelFor(key: string) {
  return key.replace(/_/g, ' ');
}

const baseResources: ResourceConfig[] = [
  { key: 'users', label: 'Users', path: '/users', responseKey: 'users', columns: ['user_id', 'username', 'role', 'full_name', 'email', 'status'].map((key) => ({ key, label: labelFor(key) })) },
  { key: 'members', label: 'Members', path: '/members', responseKey: 'members', columns: ['member_id', 'full_name', 'email', 'phone', 'gender', 'join_date', 'status'].map((key) => ({ key, label: labelFor(key) })) },
  { key: 'trainers', label: 'Trainers', path: '/trainers', responseKey: 'trainers', columns: ['trainer_id', 'full_name', 'email', 'phone', 'specialty', 'hire_date', 'status'].map((key) => ({ key, label: labelFor(key) })) },
  { key: 'plans', label: 'Plans', path: '/plans', responseKey: 'plans', columns: ['plan_id', 'plan_name', 'duration_months', 'price', 'description'].map((key) => ({ key, label: labelFor(key) })) },
  { key: 'subscriptions', label: 'Subscriptions', path: '/subscriptions', responseKey: 'subscriptions', columns: ['subscription_id', 'member_name', 'plan_name', 'start_date', 'end_date', 'status', 'price'].map((key) => ({ key, label: labelFor(key) })) },
  { key: 'payments', label: 'Payments', path: '/payments', responseKey: 'payments', columns: ['payment_id', 'member_name', 'plan_name', 'amount', 'payment_date', 'payment_method', 'payment_status'].map((key) => ({ key, label: labelFor(key) })) },
  { key: 'sessions', label: 'Sessions', path: '/sessions', responseKey: 'sessions', columns: ['session_id', 'session_type', 'trainer_name', 'location', 'difficulty', 'session_date', 'start_time', 'end_time', 'capacity', 'booked_count', 'status'].map((key) => ({ key, label: labelFor(key) })) },
  { key: 'bookings', label: 'Bookings', path: '/bookings', responseKey: 'bookings', columns: ['booking_id', 'member_name', 'session_type', 'trainer_name', 'session_date', 'booking_status'].map((key) => ({ key, label: labelFor(key) })) },
  { key: 'attendance', label: 'Attendance', path: '/attendance', responseKey: 'attendance', columns: ['attendance_id', 'member_name', 'trainer_name', 'session_type', 'session_date', 'attendance_status', 'marked_at'].map((key) => ({ key, label: labelFor(key) })) }
];

const dashboardCards = [
  { key: 'activeMembers', label: 'Active members' },
  { key: 'activeSubscriptions', label: 'Active subscriptions' },
  { key: 'scheduledSessions', label: 'Scheduled sessions' },
  { key: 'openPayments', label: 'Open payments' }
] as const;

export default function AdminDashboard() {
  const { request, user } = useAuth();
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState(baseResources[0].key);
  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);

  const selectedResource = baseResources.find((resource) => resource.key === selectedKey) ?? baseResources[0];

  async function loadResource(resource = selectedResource) {
    setLoading(true);
    setError(null);
    const data = await request<Record<string, ResourceRow[]>>(resource.path);
    setRows(data[resource.responseKey] ?? []);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    request<DashboardCounts>('/dashboard')
      .then((data) => {
        if (!cancelled) setCounts(data);
      })
      .catch((err) => {
        if (!cancelled) setCountsError(err instanceof Error ? err.message : 'Failed to load dashboard');
      });
    request<{ trainers: TrainerRow[] }>('/trainers')
      .then((data) => {
        if (!cancelled) setTrainers(data.trainers);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [request]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    request<Record<string, ResourceRow[]>>(selectedResource.path)
      .then((data) => {
        if (!cancelled) setRows(data[selectedResource.responseKey] ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : `Failed to load ${selectedResource.label}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request, selectedResource]);

  async function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body = {
        plan_name: planForm.plan_name,
        duration_months: Number(planForm.duration_months),
        price: Number(planForm.price),
        description: planForm.description
      };
      if (planForm.plan_id) {
        await request(`/plans/${planForm.plan_id}`, { method: 'PUT', body: JSON.stringify(body) });
        setMessage('Plan updated.');
      } else {
        await request('/plans', { method: 'POST', body: JSON.stringify(body) });
        setMessage('Plan created.');
      }
      setPlanForm(emptyPlanForm);
      await loadResource(baseResources.find((resource) => resource.key === 'plans'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  }

  async function submitSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body = {
        trainer_id: Number(sessionForm.trainer_id),
        session_type: sessionForm.session_type,
        description: sessionForm.description,
        location: sessionForm.location,
        difficulty: sessionForm.difficulty,
        session_date: sessionForm.session_date,
        start_time: sessionForm.start_time,
        end_time: sessionForm.end_time,
        capacity: Number(sessionForm.capacity)
      };
      if (sessionForm.session_id) {
        await request(`/sessions/${sessionForm.session_id}`, { method: 'PUT', body: JSON.stringify(body) });
        setMessage('Session updated.');
      } else {
        await request('/sessions', { method: 'POST', body: JSON.stringify(body) });
        setMessage('Session created.');
      }
      setSessionForm(emptySessionForm);
      await loadResource(baseResources.find((resource) => resource.key === 'sessions'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session');
    } finally {
      setSaving(false);
    }
  }

  async function updateSubscription(subscriptionId: number, action: 'activate' | 'cancel') {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await request(`/subscriptions/${subscriptionId}/${action}`, { method: 'PATCH' });
      setMessage(action === 'activate' ? 'Subscription activated.' : 'Subscription cancelled.');
      await loadResource(baseResources.find((resource) => resource.key === 'subscriptions'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subscription');
    } finally {
      setSaving(false);
    }
  }

  const subscriptionColumns: ResourceColumn<ResourceRow>[] = selectedResource.key === 'subscriptions'
    ? [
        ...selectedResource.columns,
        {
          key: 'actions',
          label: 'Actions',
          render: (row) => (
            <div className="row-actions">
              <button className="small-button" type="button" disabled={saving || row.status === 'active'} onClick={() => updateSubscription(Number(row.subscription_id), 'activate')}>Activate</button>
              <button className="small-button danger" type="button" disabled={saving || row.status === 'cancelled'} onClick={() => updateSubscription(Number(row.subscription_id), 'cancel')}>Cancel</button>
            </div>
          )
        }
      ]
    : selectedResource.columns;

  return (
    <div className="dashboard-stack">
      <section className="page-hero">
        <div>
          <p className="eyebrow">{user?.role === 'staff' ? 'Staff' : 'Admin'} operations</p>
          <h1>Gym operations console</h1>
          <p className="muted">Manage plans, sessions, subscriptions, and daily workflow health.</p>
        </div>
      </section>

      <section className="card-grid">
        {dashboardCards.map((card) => (
          <article className="metric-card" key={card.key}>
            <span>{card.label}</span>
            <strong>{counts ? counts[card.key] : '--'}</strong>
          </article>
        ))}
      </section>
      {countsError ? <p className="error" role="alert">{countsError}</p> : null}
      {error ? <p className="error" role="alert">{error}</p> : null}
      {message ? <p className="success" role="status">{message}</p> : null}

      <section className="admin-controls">
        <form className="panel control-form" onSubmit={submitPlan}>
          <h2>Plan control</h2>
          <input placeholder="Plan ID to update (blank creates)" value={planForm.plan_id} onChange={(event) => setPlanForm((current) => ({ ...current, plan_id: event.target.value }))} />
          <input placeholder="Plan name" value={planForm.plan_name} onChange={(event) => setPlanForm((current) => ({ ...current, plan_name: event.target.value }))} />
          <input placeholder="Duration months" type="number" min="1" value={planForm.duration_months} onChange={(event) => setPlanForm((current) => ({ ...current, duration_months: event.target.value }))} />
          <input placeholder="Price" type="number" min="1" step="0.01" value={planForm.price} onChange={(event) => setPlanForm((current) => ({ ...current, price: event.target.value }))} />
          <textarea placeholder="Description" value={planForm.description} onChange={(event) => setPlanForm((current) => ({ ...current, description: event.target.value }))} />
          <button type="submit" disabled={saving}>{planForm.plan_id ? 'Update plan' : 'Create plan'}</button>
        </form>

        <form className="panel control-form" onSubmit={submitSession}>
          <h2>Session control</h2>
          <input placeholder="Session ID to update (blank creates)" value={sessionForm.session_id} onChange={(event) => setSessionForm((current) => ({ ...current, session_id: event.target.value }))} />
          <select value={sessionForm.trainer_id} onChange={(event) => setSessionForm((current) => ({ ...current, trainer_id: event.target.value }))}>
            <option value="">Choose trainer</option>
            {trainers.map((trainer) => <option key={trainer.trainer_id} value={trainer.trainer_id}>{trainer.full_name}</option>)}
          </select>
          <input placeholder="Session type" value={sessionForm.session_type} onChange={(event) => setSessionForm((current) => ({ ...current, session_type: event.target.value }))} />
          <input placeholder="Location" value={sessionForm.location} onChange={(event) => setSessionForm((current) => ({ ...current, location: event.target.value }))} />
          <select value={sessionForm.difficulty} onChange={(event) => setSessionForm((current) => ({ ...current, difficulty: event.target.value }))}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <input type="date" value={sessionForm.session_date} onChange={(event) => setSessionForm((current) => ({ ...current, session_date: event.target.value }))} />
          <input type="time" value={sessionForm.start_time} onChange={(event) => setSessionForm((current) => ({ ...current, start_time: event.target.value }))} />
          <input type="time" value={sessionForm.end_time} onChange={(event) => setSessionForm((current) => ({ ...current, end_time: event.target.value }))} />
          <input placeholder="Capacity" type="number" min="1" value={sessionForm.capacity} onChange={(event) => setSessionForm((current) => ({ ...current, capacity: event.target.value }))} />
          <textarea placeholder="Description" value={sessionForm.description} onChange={(event) => setSessionForm((current) => ({ ...current, description: event.target.value }))} />
          <button type="submit" disabled={saving}>{sessionForm.session_id ? 'Update session' : 'Create session'}</button>
        </form>
      </section>

      <section className="tabs" aria-label="Admin resources">
        {baseResources.map((resource) => (
          <button className={resource.key === selectedKey ? 'active' : ''} key={resource.key} type="button" onClick={() => setSelectedKey(resource.key)}>
            {resource.label}
          </button>
        ))}
      </section>

      <ResourceTable title={selectedResource.label} rows={rows} columns={subscriptionColumns} loading={loading} error={error} />
    </div>
  );
}
