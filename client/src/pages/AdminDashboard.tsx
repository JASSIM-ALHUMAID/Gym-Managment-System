import { useEffect, useState } from 'react';
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

function labelFor(key: string) {
  return key.replace(/_/g, ' ');
}

const resources: ResourceConfig[] = [
  { key: 'users', label: 'Users', path: '/users', responseKey: 'users', columns: ['user_id', 'username', 'role', 'full_name', 'email', 'status'].map((key) => ({ key, label: labelFor(key) })) },
  { key: 'members', label: 'Members', path: '/members', responseKey: 'members', columns: ['member_id', 'full_name', 'email', 'phone', 'gender', 'join_date', 'status'].map((key) => ({ key, label: labelFor(key) })) },
  { key: 'trainers', label: 'Trainers', path: '/trainers', responseKey: 'trainers', columns: ['trainer_id', 'full_name', 'email', 'phone', 'specialty', 'hire_date', 'status'].map((key) => ({ key, label: labelFor(key) })) },
  { key: 'plans', label: 'Plans', path: '/plans', responseKey: 'plans', columns: ['plan_id', 'plan_name', 'duration_months', 'price', 'description'].map((key) => ({ key, label: labelFor(key) })) },
  { key: 'subscriptions', label: 'Subscriptions', path: '/subscriptions', responseKey: 'subscriptions', columns: ['subscription_id', 'member_name', 'plan_name', 'start_date', 'end_date', 'status', 'price'].map((key) => ({ key, label: labelFor(key) })) },
  { key: 'payments', label: 'Payments', path: '/payments', responseKey: 'payments', columns: ['payment_id', 'member_name', 'plan_name', 'amount', 'payment_date', 'payment_method', 'payment_status'].map((key) => ({ key, label: labelFor(key) })) },
  { key: 'sessions', label: 'Sessions', path: '/sessions', responseKey: 'sessions', columns: ['session_id', 'session_type', 'trainer_name', 'session_date', 'start_time', 'end_time', 'capacity', 'booked_count', 'status'].map((key) => ({ key, label: labelFor(key) })) },
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
  const [selectedKey, setSelectedKey] = useState(resources[0].key);
  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedResource = resources.find((resource) => resource.key === selectedKey) ?? resources[0];

  useEffect(() => {
    let cancelled = false;
    request<DashboardCounts>('/dashboard')
      .then((data) => {
        if (!cancelled) setCounts(data);
      })
      .catch((err) => {
        if (!cancelled) setCountsError(err instanceof Error ? err.message : 'Failed to load dashboard');
      });
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

  return (
    <div className="dashboard-stack">
      <section className="page-hero">
        <div>
          <p className="eyebrow">{user?.role === 'staff' ? 'Staff' : 'Admin'} operations</p>
          <h1>Gym overview</h1>
          <p className="muted">Review seeded resources and daily workflow health.</p>
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

      <section className="tabs" aria-label="Admin resources">
        {resources.map((resource) => (
          <button className={resource.key === selectedKey ? 'active' : ''} key={resource.key} type="button" onClick={() => setSelectedKey(resource.key)}>
            {resource.label}
          </button>
        ))}
      </section>

      <ResourceTable title={selectedResource.label} rows={rows} columns={selectedResource.columns} loading={loading} error={error} />
    </div>
  );
}
