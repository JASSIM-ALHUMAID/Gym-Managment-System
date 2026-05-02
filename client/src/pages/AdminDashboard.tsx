import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
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

function parsePositiveNumber(value: string, label: string, options: { integer?: boolean } = {}) {
  const number = Number(value);
  if (!value.trim() || !Number.isFinite(number) || number <= 0 || (options.integer && !Number.isInteger(number))) {
    throw new Error(`${label} must be a positive ${options.integer ? 'whole number' : 'number'}`);
  }
  return number;
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
  const mountedRef = useRef(true);
  const resourceRequestIdRef = useRef(0);
  const dashboardRequestIdRef = useRef(0);
  const selectedKeyRef = useRef(selectedKey);
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'controls' | 'resources'>('overview');

  const selectedResource = baseResources.find((resource) => resource.key === selectedKey) ?? baseResources[0];
  selectedKeyRef.current = selectedKey;

  const loadResource = useCallback(async (resource = selectedResource) => {
    if (!mountedRef.current) return;
    const requestId = resourceRequestIdRef.current + 1;
    resourceRequestIdRef.current = requestId;
    if (mountedRef.current && requestId === resourceRequestIdRef.current) setLoading(true);
    if (mountedRef.current && requestId === resourceRequestIdRef.current) setError(null);
    try {
      const data = await request<Record<string, ResourceRow[]>>(resource.path);
      if (mountedRef.current && requestId === resourceRequestIdRef.current) setRows(data[resource.responseKey] ?? []);
    } catch (err) {
      if (mountedRef.current && requestId === resourceRequestIdRef.current) setError(err instanceof Error ? err.message : `Failed to load ${resource.label}`);
    } finally {
      if (mountedRef.current && requestId === resourceRequestIdRef.current) setLoading(false);
    }
  }, [request, selectedResource]);

  const loadDashboard = useCallback(async () => {
    if (!mountedRef.current) return;
    const requestId = dashboardRequestIdRef.current + 1;
    dashboardRequestIdRef.current = requestId;
    try {
      const data = await request<DashboardCounts>('/dashboard');
      if (mountedRef.current && requestId === dashboardRequestIdRef.current) {
        setCounts(data);
        setCountsError(null);
      }
    } catch (err) {
      if (mountedRef.current && requestId === dashboardRequestIdRef.current) setCountsError(err instanceof Error ? err.message : 'Failed to load dashboard');
    }
  }, [request]);

  async function showResource(resourceKey: string) {
    if (!mountedRef.current) return;
    const resource = baseResources.find((current) => current.key === resourceKey);
    if (!resource) return;
    setDashboardTab('resources');
    if (selectedKeyRef.current === resourceKey) {
      await loadResource(resource);
    } else {
      if (!mountedRef.current) return;
      resourceRequestIdRef.current += 1;
      setRows([]);
      setLoading(true);
      setSelectedKey(resourceKey);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      dashboardRequestIdRef.current += 1;
      resourceRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadDashboard();
    request<{ trainers: TrainerRow[] }>('/trainers')
      .then((data) => {
        if (!cancelled) setTrainers(data.trainers);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      dashboardRequestIdRef.current += 1;
    };
  }, [loadDashboard, request]);

  useEffect(() => {
    loadResource(selectedResource);
    return () => {
      resourceRequestIdRef.current += 1;
    };
  }, [loadResource, selectedResource]);

  async function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const durationMonths = parsePositiveNumber(planForm.duration_months, 'Duration months', { integer: true });
      const price = parsePositiveNumber(planForm.price, 'Price');
      const body = {
        plan_name: planForm.plan_name,
        duration_months: durationMonths,
        price,
        description: planForm.description
      };
      if (planForm.plan_id) {
        await request(`/plans/${planForm.plan_id}`, { method: 'PUT', body: JSON.stringify(body) });
        if (!mountedRef.current) return;
        setMessage('Plan updated.');
      } else {
        await request('/plans', { method: 'POST', body: JSON.stringify(body) });
        if (!mountedRef.current) return;
        setMessage('Plan created.');
      }
      if (!mountedRef.current) return;
      setPlanForm(emptyPlanForm);
      await loadDashboard();
      if (!mountedRef.current) return;
      await showResource('plans');
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  async function submitSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const trainerId = parsePositiveNumber(sessionForm.trainer_id, 'Trainer', { integer: true });
      const capacity = parsePositiveNumber(sessionForm.capacity, 'Capacity', { integer: true });
      const body = {
        trainer_id: trainerId,
        session_type: sessionForm.session_type,
        description: sessionForm.description,
        location: sessionForm.location,
        difficulty: sessionForm.difficulty,
        session_date: sessionForm.session_date,
        start_time: sessionForm.start_time,
        end_time: sessionForm.end_time,
        capacity
      };
      if (sessionForm.session_id) {
        await request(`/sessions/${sessionForm.session_id}`, { method: 'PUT', body: JSON.stringify(body) });
        if (!mountedRef.current) return;
        setMessage('Session updated.');
      } else {
        await request('/sessions', { method: 'POST', body: JSON.stringify(body) });
        if (!mountedRef.current) return;
        setMessage('Session created.');
      }
      if (!mountedRef.current) return;
      setSessionForm(emptySessionForm);
      await loadDashboard();
      if (!mountedRef.current) return;
      await showResource('sessions');
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to save session');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  async function updateSubscription(subscriptionId: number, action: 'activate' | 'cancel') {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await request(`/subscriptions/${subscriptionId}/${action}`, { method: 'PATCH' });
      if (!mountedRef.current) return;
      setMessage(action === 'activate' ? 'Subscription activated.' : 'Subscription cancelled.');
      await loadDashboard();
      if (!mountedRef.current) return;
      await showResource('subscriptions');
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to update subscription');
    } finally {
      if (mountedRef.current) setSaving(false);
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
          <p className="eyebrow">{user?.role === 'staff' ? 'Staff command' : 'Admin command'}</p>
          <h1>Operations command center</h1>
          <p className="muted">Control plans, sessions, subscriptions, and the resource grid from one role-protected workspace.</p>
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

      <section className="tabs dashboard-tabs" aria-label="Dashboard sections">
        <button type="button" className={dashboardTab === 'overview' ? 'active' : ''} onClick={() => setDashboardTab('overview')}>Overview</button>
        <button type="button" className={dashboardTab === 'controls' ? 'active' : ''} onClick={() => setDashboardTab('controls')}>Controls</button>
        <button type="button" className={dashboardTab === 'resources' ? 'active' : ''} onClick={() => setDashboardTab('resources')}>Resources</button>
      </section>

      {dashboardTab === 'overview' ? <section className="panel overview-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Today</p>
            <h2>Operational snapshot</h2>
          </div>
          <span className="pill">Live data</span>
        </div>
        <p className="muted">Use Controls for high-impact actions, or Resources for table-level review.</p>
      </section> : null}

      {dashboardTab === 'controls' ? <section className="admin-controls">
        <form className="panel control-form" onSubmit={submitPlan}>
          <h2>Plan control</h2>
          <label htmlFor="planId">Plan ID to update</label>
          <input id="planId" placeholder="Leave blank to create" value={planForm.plan_id} onChange={(event) => setPlanForm((current) => ({ ...current, plan_id: event.target.value }))} />
          <label htmlFor="planName">Plan name</label>
          <input id="planName" value={planForm.plan_name} onChange={(event) => setPlanForm((current) => ({ ...current, plan_name: event.target.value }))} required />
          <label htmlFor="planDuration">Duration months</label>
          <input id="planDuration" type="number" min="1" value={planForm.duration_months} onChange={(event) => setPlanForm((current) => ({ ...current, duration_months: event.target.value }))} required />
          <label htmlFor="planPrice">Price</label>
          <input id="planPrice" type="number" min="1" step="0.01" value={planForm.price} onChange={(event) => setPlanForm((current) => ({ ...current, price: event.target.value }))} required />
          <label htmlFor="planDescription">Description</label>
          <textarea id="planDescription" value={planForm.description} onChange={(event) => setPlanForm((current) => ({ ...current, description: event.target.value }))} />
          <button type="submit" disabled={saving}>{planForm.plan_id ? 'Update plan' : 'Create plan'}</button>
        </form>

        <form className="panel control-form" onSubmit={submitSession}>
          <h2>Session control</h2>
          <label htmlFor="sessionId">Session ID to update</label>
          <input id="sessionId" placeholder="Leave blank to create" value={sessionForm.session_id} onChange={(event) => setSessionForm((current) => ({ ...current, session_id: event.target.value }))} />
          <label htmlFor="sessionTrainer">Trainer</label>
          <select id="sessionTrainer" value={sessionForm.trainer_id} onChange={(event) => setSessionForm((current) => ({ ...current, trainer_id: event.target.value }))} required>
            <option value="">Choose trainer</option>
            {trainers.map((trainer) => <option key={trainer.trainer_id} value={trainer.trainer_id}>{trainer.full_name}</option>)}
          </select>
          <label htmlFor="sessionType">Session type</label>
          <input id="sessionType" value={sessionForm.session_type} onChange={(event) => setSessionForm((current) => ({ ...current, session_type: event.target.value }))} required />
          <label htmlFor="sessionLocation">Location</label>
          <input id="sessionLocation" value={sessionForm.location} onChange={(event) => setSessionForm((current) => ({ ...current, location: event.target.value }))} required />
          <label htmlFor="sessionDifficulty">Difficulty</label>
          <select id="sessionDifficulty" value={sessionForm.difficulty} onChange={(event) => setSessionForm((current) => ({ ...current, difficulty: event.target.value }))}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <label htmlFor="sessionDate">Date</label>
          <input id="sessionDate" type="date" value={sessionForm.session_date} onChange={(event) => setSessionForm((current) => ({ ...current, session_date: event.target.value }))} required />
          <label htmlFor="sessionStart">Start time</label>
          <input id="sessionStart" type="time" value={sessionForm.start_time} onChange={(event) => setSessionForm((current) => ({ ...current, start_time: event.target.value }))} required />
          <label htmlFor="sessionEnd">End time</label>
          <input id="sessionEnd" type="time" value={sessionForm.end_time} onChange={(event) => setSessionForm((current) => ({ ...current, end_time: event.target.value }))} required />
          <label htmlFor="sessionCapacity">Capacity</label>
          <input id="sessionCapacity" type="number" min="1" value={sessionForm.capacity} onChange={(event) => setSessionForm((current) => ({ ...current, capacity: event.target.value }))} required />
          <label htmlFor="sessionDescription">Description</label>
          <textarea id="sessionDescription" value={sessionForm.description} onChange={(event) => setSessionForm((current) => ({ ...current, description: event.target.value }))} />
          <button type="submit" disabled={saving}>{sessionForm.session_id ? 'Update session' : 'Create session'}</button>
        </form>
      </section> : null}

      {dashboardTab === 'resources' ? <><section className="tabs" aria-label="Admin resources">
        {baseResources.map((resource) => (
          <button className={resource.key === selectedKey ? 'active' : ''} key={resource.key} type="button" onClick={() => void showResource(resource.key)}>
            {resource.label}
          </button>
        ))}
      </section>

      <ResourceTable title={selectedResource.label} rows={rows} columns={subscriptionColumns} loading={loading} error={error} /></> : null}
    </div>
  );
}
