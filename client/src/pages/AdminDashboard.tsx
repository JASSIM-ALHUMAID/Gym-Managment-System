import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth';
import ResourceTable, { type ResourceColumn, type ResourceRow } from './ResourceTable';

type DashboardCounts = {
  activeMembers: number;
  activeSubscriptions: number;
  scheduledSessions: number;
  openPayments: number;
  totalMembers?: number;
  totalTrainers?: number;
  totalPlans?: number;
  totalBookings?: number;
  totalPayments?: number;
  totalAttendance?: number;
};

type ResourceConfig = {
  key: string;
  label: string;
  path: string;
  responseKey: string;
  columns: ResourceColumn<ResourceRow>[];
};

type TrainerRow = ResourceRow & { trainer_id: number; full_name: string };
type AdminTab = 'overview' | 'members' | 'plans' | 'sessions' | 'payments' | 'reports';
type ControlDialog = 'plan' | 'session' | null;

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

function formatDate(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) return '-';
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(Number(year), Number(month) - 1, Number(day)));
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatTime(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) return '-';
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value;
  const date = new Date(2000, 0, 1, hour, minute);
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatDateTime(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function statusLabel(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) return 'Unknown';
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  { key: 'members', label: 'Members', path: '/members', responseKey: 'members', columns: [
    { key: 'member_id', label: labelFor('member_id') },
    { key: 'full_name', label: labelFor('full_name') },
    { key: 'email', label: labelFor('email') },
    { key: 'phone', label: labelFor('phone') },
    { key: 'gender', label: labelFor('gender') },
    { key: 'join_date', label: labelFor('join_date'), format: formatDate },
    { key: 'status', label: labelFor('status') }
  ] },
  { key: 'trainers', label: 'Trainers', path: '/trainers', responseKey: 'trainers', columns: [
    { key: 'trainer_id', label: labelFor('trainer_id') },
    { key: 'full_name', label: labelFor('full_name') },
    { key: 'email', label: labelFor('email') },
    { key: 'phone', label: labelFor('phone') },
    { key: 'specialty', label: labelFor('specialty') },
    { key: 'hire_date', label: labelFor('hire_date'), format: formatDate },
    { key: 'status', label: labelFor('status') }
  ] },
  { key: 'plans', label: 'Plans', path: '/plans', responseKey: 'plans', columns: ['plan_id', 'plan_name', 'duration_months', 'price', 'description'].map((key) => ({ key, label: labelFor(key) })) },
  { key: 'subscriptions', label: 'Subscriptions', path: '/subscriptions', responseKey: 'subscriptions', columns: [
    { key: 'subscription_id', label: labelFor('subscription_id') },
    { key: 'member_name', label: labelFor('member_name') },
    { key: 'plan_name', label: labelFor('plan_name') },
    { key: 'start_date', label: labelFor('start_date'), format: formatDate },
    { key: 'end_date', label: labelFor('end_date'), format: formatDate },
    { key: 'status', label: labelFor('status') },
    { key: 'price', label: labelFor('price') }
  ] },
  { key: 'payments', label: 'Payments', path: '/payments', responseKey: 'payments', columns: [
    { key: 'payment_id', label: labelFor('payment_id') },
    { key: 'member_name', label: labelFor('member_name') },
    { key: 'plan_name', label: labelFor('plan_name') },
    { key: 'amount', label: labelFor('amount') },
    { key: 'payment_date', label: labelFor('payment_date'), format: formatDate },
    { key: 'payment_method', label: labelFor('payment_method') },
    { key: 'payment_status', label: labelFor('payment_status') }
  ] },
  { key: 'sessions', label: 'Sessions', path: '/sessions', responseKey: 'sessions', columns: [
    { key: 'session_id', label: labelFor('session_id') },
    { key: 'session_type', label: labelFor('session_type') },
    { key: 'trainer_name', label: labelFor('trainer_name') },
    { key: 'location', label: labelFor('location') },
    { key: 'difficulty', label: labelFor('difficulty') },
    { key: 'session_date', label: labelFor('session_date'), format: formatDate },
    { key: 'start_time', label: labelFor('start_time'), format: formatTime },
    { key: 'end_time', label: labelFor('end_time'), format: formatTime },
    { key: 'capacity', label: labelFor('capacity') },
    { key: 'booked_count', label: labelFor('booked_count') },
    { key: 'status', label: labelFor('status') }
  ] },
  { key: 'bookings', label: 'Bookings', path: '/bookings', responseKey: 'bookings', columns: [
    { key: 'booking_id', label: labelFor('booking_id') },
    { key: 'member_name', label: labelFor('member_name') },
    { key: 'session_type', label: labelFor('session_type') },
    { key: 'trainer_name', label: labelFor('trainer_name') },
    { key: 'session_date', label: labelFor('session_date'), format: formatDate },
    { key: 'start_time', label: labelFor('start_time'), format: formatTime },
    { key: 'end_time', label: labelFor('end_time'), format: formatTime },
    { key: 'booking_status', label: labelFor('booking_status') }
  ] },
  { key: 'attendance', label: 'Attendance', path: '/attendance', responseKey: 'attendance', columns: [
    { key: 'attendance_id', label: labelFor('attendance_id') },
    { key: 'member_name', label: labelFor('member_name') },
    { key: 'trainer_name', label: labelFor('trainer_name') },
    { key: 'session_type', label: labelFor('session_type') },
    { key: 'session_date', label: labelFor('session_date'), format: formatDate },
    { key: 'attendance_status', label: labelFor('attendance_status') },
    { key: 'marked_at', label: labelFor('marked_at'), format: formatDateTime }
  ] }
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
  const dialogRef = useRef<HTMLElement | null>(null);
  const resourceRequestIdRef = useRef(0);
  const silentResourceRequestIdRef = useRef(0);
  const dashboardRequestIdRef = useRef(0);
  const selectedKeyRef = useRef(selectedKey);
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [planCatalog, setPlanCatalog] = useState<ResourceRow[]>([]);
  const [bookingRows, setBookingRows] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [dashboardTab, setDashboardTab] = useState<AdminTab>('overview');
  const [controlDialog, setControlDialog] = useState<ControlDialog>(null);

  const selectedResource = baseResources.find((resource) => resource.key === selectedKey) ?? baseResources[0];
  selectedKeyRef.current = selectedKey;

  const loadResource = useCallback(async (resource = selectedResource, options: { silent?: boolean } = {}) => {
    if (!mountedRef.current) return;
    if (options.silent) {
      const requestId = silentResourceRequestIdRef.current + 1;
      silentResourceRequestIdRef.current = requestId;
      try {
        const data = await request<Record<string, ResourceRow[]>>(resource.path);
        if (mountedRef.current && requestId === silentResourceRequestIdRef.current && selectedKeyRef.current === resource.key) setRows(data[resource.responseKey] ?? []);
      } catch {
        // Silent polling should not interrupt the visible workspace.
      }
      return;
    }
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

  const loadPlanCatalog = useCallback(async () => {
    const data = await request<Record<string, ResourceRow[]>>('/plans');
    if (mountedRef.current) setPlanCatalog(data.plans ?? []);
  }, [request]);

  async function openWorkspace(tab: AdminTab, resourceKey?: string) {
    if (!mountedRef.current) return;
    setDashboardTab(tab);
    if (!resourceKey) return;
    const resource = baseResources.find((current) => current.key === resourceKey);
    if (!resource) return;
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
      silentResourceRequestIdRef.current += 1;
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

  useEffect(() => {
    if (dashboardTab !== 'plans') return undefined;
    const subscriptionsResource = baseResources.find((resource) => resource.key === 'subscriptions');
    if (!subscriptionsResource) return undefined;
    loadPlanCatalog()
      .catch(() => undefined);
    void loadResource(subscriptionsResource);
    const intervalId = window.setInterval(() => {
      void loadResource(subscriptionsResource, { silent: true });
    }, 5000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [dashboardTab, loadPlanCatalog, loadResource]);

  useEffect(() => {
    if (!controlDialog) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => !element.hasAttribute('disabled'));
    focusable[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setControlDialog(null);
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [controlDialog]);

  useEffect(() => {
    if (dashboardTab !== 'sessions') return undefined;
    let cancelled = false;
    request<Record<string, ResourceRow[]>>('/bookings')
      .then((data) => {
        if (!cancelled && mountedRef.current) setBookingRows(data.bookings ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [dashboardTab, request]);

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
      setControlDialog(null);
      await loadPlanCatalog();
      await loadDashboard();
      if (!mountedRef.current) return;
      await openWorkspace('plans', 'subscriptions');
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
      setControlDialog(null);
      await loadDashboard();
      if (!mountedRef.current) return;
      await openWorkspace('sessions', 'sessions');
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
      await openWorkspace('plans', 'subscriptions');
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

  const pendingRequests = selectedResource.key === 'subscriptions'
    ? rows.filter((row) => row.status === 'pending')
    : [];
  const memberRows = selectedResource.key === 'members' ? rows : [];
  const activeMemberCount = memberRows.filter((row) => row.status === 'active').length;
  const inactiveMemberCount = memberRows.filter((row) => row.status !== 'active').length;

  function activeSubscriptionFor(row: ResourceRow) {
    return rows.find((current) => current.status === 'active' && current.member_id === row.member_id);
  }

  function requestTypeFor(row: ResourceRow) {
    const activeSubscription = activeSubscriptionFor(row);
    if (!activeSubscription) return 'New plan request';
    const requestedPrice = Number(row.price);
    const activePrice = Number(activeSubscription.price);
    if (Number.isFinite(requestedPrice) && Number.isFinite(activePrice)) {
      if (requestedPrice > activePrice) return 'Upgrade request';
      if (requestedPrice < activePrice) return 'Downgrade request';
    }
    return 'Plan change request';
  }

  return (
    <div className="dashboard-stack">
      <section className="page-hero">
        <div>
          <p className="eyebrow">{user?.role === 'staff' ? 'Staff command' : 'Admin command'}</p>
          <h1>Operations dashboard</h1>
          <p className="muted">Control members, plan requests, sessions, payments, and operations from focused admin workspaces.</p>
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
        <button type="button" className={dashboardTab === 'overview' ? 'active' : ''} aria-pressed={dashboardTab === 'overview'} onClick={() => setDashboardTab('overview')}>Overview</button>
        <button type="button" className={dashboardTab === 'members' ? 'active' : ''} aria-pressed={dashboardTab === 'members'} onClick={() => void openWorkspace('members', 'members')}>Members</button>
        <button type="button" className={dashboardTab === 'plans' ? 'active' : ''} aria-pressed={dashboardTab === 'plans'} onClick={() => void openWorkspace('plans', 'subscriptions')}>Plans</button>
        <button type="button" className={dashboardTab === 'sessions' ? 'active' : ''} aria-pressed={dashboardTab === 'sessions'} onClick={() => void openWorkspace('sessions', 'sessions')}>Sessions</button>
        <button type="button" className={dashboardTab === 'payments' ? 'active' : ''} aria-pressed={dashboardTab === 'payments'} onClick={() => void openWorkspace('payments', 'payments')}>Payments</button>
        <button type="button" className={dashboardTab === 'reports' ? 'active' : ''} aria-pressed={dashboardTab === 'reports'} onClick={() => void openWorkspace('reports', 'attendance')}>Reports</button>
      </section>

      {dashboardTab === 'overview' ? <section className="panel overview-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Today</p>
            <h2>Operational snapshot</h2>
          </div>
          <span className="pill">Live data</span>
        </div>
        <p className="muted">Use the focused workspaces below instead of digging through raw resources.</p>
        <h3>Jump to workspace</h3>
        <div className="overview-actions" aria-label="Quick resource actions">
          <button type="button" className="small-button" onClick={() => void openWorkspace('members', 'members')}>Open Members</button>
          <button type="button" className="small-button" onClick={() => void openWorkspace('plans', 'subscriptions')}>Review Plan Requests</button>
          <button type="button" className="small-button" onClick={() => void openWorkspace('sessions', 'sessions')}>Manage Sessions</button>
          <button type="button" className="small-button" onClick={() => void openWorkspace('payments', 'payments')}>Review Payments</button>
        </div>
      </section> : null}

      {dashboardTab === 'members' ? <>
        <section className="panel workspace-summary">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Member workspace</p>
              <h2>Member directory</h2>
            </div>
            <span className="pill">{memberRows.length} members</span>
          </div>
          <div className="workspace-summary-grid">
            <article className="workspace-summary-card"><span>Active members</span><strong>{loading ? '--' : activeMemberCount}</strong></article>
            <article className="workspace-summary-card"><span>Needs attention</span><strong>{loading ? '--' : inactiveMemberCount}</strong></article>
            <article className="workspace-summary-card"><span>Directory source</span><strong>Live</strong></article>
          </div>
        </section>
        <ResourceTable title="Member records" rows={memberRows} columns={baseResources.find((resource) => resource.key === 'members')?.columns ?? []} loading={loading} error={error} />
      </> : null}

      {dashboardTab === 'plans' ? <>
        <section className="panel request-board">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Pending approvals</p>
              <h2>Plan requests</h2>
            </div>
            <span className="pill">{pendingRequests.length} pending</span>
          </div>
          <p className="muted">New requests refresh automatically while this workspace is open.</p>
          {loading ? <p className="muted">Loading plan requests...</p> : null}
          {!loading && pendingRequests.length === 0 ? <p className="empty-state">No pending plan requests right now.</p> : null}
          {!loading && pendingRequests.length > 0 ? <div className="request-grid">
            {pendingRequests.map((row) => {
              const activeSubscription = activeSubscriptionFor(row);
              return (
                <article className="request-card" key={String(row.subscription_id)}>
                  <div className="request-card-header">
                    <div>
                      <p className="eyebrow">{requestTypeFor(row)}</p>
                      <h3>{String(row.member_name ?? 'Unknown member')}</h3>
                    </div>
                    <span className="pill">{statusLabel(row.status)}</span>
                  </div>
                  <dl className="request-details">
                    <div><dt>Requested plan</dt><dd>{String(row.plan_name ?? '-')}</dd></div>
                    <div><dt>Current plan</dt><dd>{activeSubscription ? String(activeSubscription.plan_name ?? '-') : 'No active plan'}</dd></div>
                    <div><dt>Price</dt><dd>{Number(row.price).toFixed(2)} SAR</dd></div>
                    <div><dt>Coverage</dt><dd>{formatDate(row.start_date)} to {formatDate(row.end_date)}</dd></div>
                  </dl>
                  <div className="row-actions">
                    <button className="small-button" type="button" disabled={saving} onClick={() => updateSubscription(Number(row.subscription_id), 'activate')}>Approve request</button>
                    <button className="small-button danger" type="button" disabled={saving} onClick={() => updateSubscription(Number(row.subscription_id), 'cancel')}>Reject request</button>
                  </div>
                </article>
              );
            })}
          </div> : null}
        </section>

        <div className="workspace-action-row">
          <button type="button" className="small-button" onClick={() => setControlDialog('plan')}>Create or update plan</button>
        </div>
        <ResourceTable title="Plan catalog" rows={planCatalog} columns={baseResources.find((resource) => resource.key === 'plans')?.columns ?? []} loading={loading && planCatalog.length === 0} getRowKey={(row) => Number(row.plan_id)} />
        <ResourceTable title="Subscription history" rows={selectedResource.key === 'subscriptions' ? rows : []} columns={baseResources.find((resource) => resource.key === 'subscriptions')?.columns ?? []} loading={loading} getRowKey={(row) => Number(row.subscription_id)} />
      </> : null}

      {dashboardTab === 'sessions' ? <>
        <div className="workspace-action-row">
          <button type="button" className="small-button" onClick={() => setControlDialog('session')}>Create or update session</button>
        </div>
        <ResourceTable title="Scheduled sessions" rows={selectedResource.key === 'sessions' ? rows : []} columns={baseResources.find((resource) => resource.key === 'sessions')?.columns ?? []} loading={loading} getRowKey={(row) => Number(row.session_id)} />
        <ResourceTable title="Bookings review" rows={bookingRows} columns={baseResources.find((resource) => resource.key === 'bookings')?.columns ?? []} loading={loading && bookingRows.length === 0} getRowKey={(row) => Number(row.booking_id)} />
      </> : null}

      {dashboardTab === 'payments' ? <ResourceTable title="Payments" rows={selectedResource.key === 'payments' ? rows : []} columns={baseResources.find((resource) => resource.key === 'payments')?.columns ?? []} loading={loading} error={error} getRowKey={(row) => Number(row.payment_id)} /> : null}

      {dashboardTab === 'reports' ? <ResourceTable title="Attendance reports" rows={selectedResource.key === 'attendance' ? rows : []} columns={baseResources.find((resource) => resource.key === 'attendance')?.columns ?? []} loading={loading} error={error} getRowKey={(row) => Number(row.attendance_id)} /> : null}

      {controlDialog ? <div className="dialog-backdrop" role="presentation" onMouseDown={() => setControlDialog(null)}>
        <section ref={dialogRef} className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby={`${controlDialog}DialogTitle`} onMouseDown={(event) => event.stopPropagation()}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Admin control</p>
              <h2 id={`${controlDialog}DialogTitle`}>{controlDialog === 'plan' ? 'Create or update plan' : 'Create or update session'}</h2>
            </div>
            <button type="button" className="small-button" onClick={() => setControlDialog(null)}>Close</button>
          </div>

          {controlDialog === 'plan' ? <form className="control-form" onSubmit={submitPlan}>
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
          </form> : null}

          {controlDialog === 'session' ? <form className="control-form" onSubmit={submitSession}>
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
          </form> : null}
        </section>
      </div> : null}
    </div>
  );
}
