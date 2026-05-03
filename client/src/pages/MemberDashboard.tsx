import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth';
import ResourceTable, { type ResourceColumn, type ResourceRow } from './ResourceTable';

type SubscriptionRow = ResourceRow & {
  subscription_id: number;
  plan_name: string;
  start_date: string;
  end_date: string;
  status: string;
  price: number;
};

type PaymentRow = ResourceRow & {
  payment_id: number;
  plan_name: string;
  amount: number;
  payment_date: string;
  payment_status: string;
};

type SessionRow = ResourceRow & {
  session_id: number;
  session_type: string;
  session_date: string;
  start_time: string;
  end_time: string;
  trainer_name: string;
  trainer_specialty: string;
  description: string | null;
  location: string;
  difficulty: string;
  capacity: number;
  booked_count: number;
  status: string;
};

type BookingRow = ResourceRow & {
  booking_id: number;
  session_id: number;
  session_type: string;
  session_date: string;
  start_time: string;
  end_time: string;
  trainer_name: string;
  booking_status: string;
};

type PlanRow = ResourceRow & {
  plan_id: number;
  plan_name: string;
  duration_months: number;
  price: number;
  description: string | null;
};

type MemberDashboardData = {
  subscriptions: SubscriptionRow[];
  payments: PaymentRow[];
  sessions: SessionRow[];
  bookings: BookingRow[];
  plans: PlanRow[];
};

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

const subscriptionColumns: ResourceColumn<SubscriptionRow>[] = [
  { key: 'subscription_id', label: 'ID' },
  { key: 'plan_name', label: 'Plan' },
  { key: 'start_date', label: 'Start', format: formatDate },
  { key: 'end_date', label: 'End', format: formatDate },
  { key: 'status', label: 'Status' },
  { key: 'price', label: 'Price' }
];

const paymentColumns: ResourceColumn<PaymentRow>[] = [
  { key: 'payment_id', label: 'ID' },
  { key: 'plan_name', label: 'Plan' },
  { key: 'amount', label: 'Amount' },
  { key: 'payment_date', label: 'Date', format: formatDate },
  { key: 'payment_status', label: 'Status' }
];

export default function MemberDashboard() {
  const { request } = useAuth();
  const mountedRef = useRef(true);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingPlanIds, setPendingPlanIds] = useState<Set<number>>(() => new Set());
  const [pendingSessionIds, setPendingSessionIds] = useState<Set<number>>(() => new Set());
  const [pendingBookingIds, setPendingBookingIds] = useState<Set<number>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'sessions' | 'bookings'>('overview');

  async function loadMemberDashboardData(): Promise<MemberDashboardData> {
    const [subscriptionData, paymentData, sessionData, bookingData, planData] = await Promise.all([
      request<{ subscriptions: SubscriptionRow[] }>('/subscriptions'),
      request<{ payments: PaymentRow[] }>('/payments'),
      request<{ sessions: SessionRow[] }>('/sessions'),
      request<{ bookings: BookingRow[] }>('/bookings'),
      request<{ plans: PlanRow[] }>('/plans')
    ]);
    return {
      subscriptions: subscriptionData.subscriptions,
      payments: paymentData.payments,
      sessions: sessionData.sessions.filter((session) => session.status === 'scheduled'),
      bookings: bookingData.bookings,
      plans: planData.plans
    };
  }

  function applyMemberDashboardData(data: MemberDashboardData) {
    setSubscriptions(data.subscriptions);
    setPayments(data.payments);
    setSessions(data.sessions);
    setBookings(data.bookings);
    setPlans(data.plans);
  }

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadMemberDashboardData()
      .then((data) => {
        if (!cancelled) applyMemberDashboardData(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load member dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request]);

  async function refreshAllSafely() {
    const data = await loadMemberDashboardData();
    if (mountedRef.current) applyMemberDashboardData(data);
  }

  async function runMemberAction(action: () => Promise<unknown>, successMessage: string, setPending: Dispatch<SetStateAction<Set<number>>>, pendingId: number) {
    setPending((current) => {
      const next = new Set(current);
      next.add(pendingId);
      return next;
    });
    setError(null);
    setMessage(null);
    try {
      await action();
      await refreshAllSafely();
      if (mountedRef.current) setMessage(successMessage);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      if (mountedRef.current) {
        setPending((current) => {
          const next = new Set(current);
          next.delete(pendingId);
          return next;
        });
      }
    }
  }

  async function requestSubscription(planId: number) {
    if (pendingPlanIds.size > 0 || hasPendingSubscription) return;
    await runMemberAction(
      () => request('/subscriptions/request', { method: 'POST', body: JSON.stringify({ plan_id: planId }) }),
      'Request created. Admin will review it soon.',
      setPendingPlanIds,
      planId
    );
  }

  function planFeatures(plan: PlanRow) {
    const name = plan.plan_name.toLowerCase();
    if (name.includes('premium')) return ['Includes Basic access', 'Includes Plus group classes', 'Trainer consultation'];
    if (name.includes('plus')) return ['Includes Basic access', 'Group classes'];
    return ['Gym facilities during standard hours'];
  }

  function planButtonLabel(plan: PlanRow) {
    const activePlan = subscriptions.find((subscription) => subscription.status === 'active');
    const pendingPlan = subscriptions.find((subscription) => subscription.status === 'pending');
    if (activePlan?.plan_name === plan.plan_name) return 'Current plan';
    if (pendingPlan?.plan_name === plan.plan_name) return `Request made for ${plan.plan_name}`;
    if (pendingPlan) return `Request already made for ${pendingPlan.plan_name}`;
    if (activePlan) return 'Request upgrade';
    return 'Request plan';
  }

  function isCurrentPlan(plan: PlanRow) {
    return subscriptions.some((subscription) => subscription.status === 'active' && subscription.plan_name === plan.plan_name);
  }

  const activeBookingBySession = new Map(bookings.filter((booking) => booking.booking_status === 'booked').map((booking) => [booking.session_id, booking]));
  const activeSubscription = subscriptions.find((subscription) => subscription.status === 'active');
  const pendingSubscription = subscriptions.find((subscription) => subscription.status === 'pending');
  const latestPayment = payments[0];
  const hasActiveSubscription = subscriptions.some((subscription) => subscription.status === 'active');
  const hasPendingSubscription = subscriptions.some((subscription) => subscription.status === 'pending');
  const isPlanRequestPending = pendingPlanIds.size > 0;
  const sessionColumns: ResourceColumn<SessionRow>[] = [
    { key: 'session_type', label: 'Type' },
    { key: 'trainer_name', label: 'Trainer' },
    { key: 'trainer_specialty', label: 'Specialty' },
    { key: 'location', label: 'Location' },
    { key: 'difficulty', label: 'Difficulty' },
    { key: 'session_date', label: 'Date', format: formatDate },
    { key: 'start_time', label: 'Start', format: formatTime },
    { key: 'end_time', label: 'End', format: formatTime },
    { key: 'booked_count', label: 'Booked' },
    { key: 'capacity', label: 'Capacity' },
    {
      key: 'action',
      label: 'Action',
      render: (session) => {
        const alreadyBooked = activeBookingBySession.has(session.session_id);
        const isFull = Number(session.booked_count) >= Number(session.capacity);
        const isBooking = pendingSessionIds.has(session.session_id);
        const label = alreadyBooked ? 'Booked' : !hasActiveSubscription ? 'Plan required' : isFull ? 'Full' : isBooking ? 'Booking...' : 'Book';
        return (
          <button type="button" className="small-button" disabled={alreadyBooked || !hasActiveSubscription || isFull || isBooking} onClick={() => runMemberAction(() => request('/bookings', { method: 'POST', body: JSON.stringify({ session_id: session.session_id }) }), 'Session booked.', setPendingSessionIds, session.session_id)}>
            {label}
          </button>
        );
      }
    }
  ];

  const bookingColumns: ResourceColumn<BookingRow>[] = [
    { key: 'booking_id', label: 'ID' },
    { key: 'session_type', label: 'Type' },
    { key: 'trainer_name', label: 'Trainer' },
    { key: 'session_date', label: 'Date', format: formatDate },
    { key: 'start_time', label: 'Start', format: formatTime },
    { key: 'end_time', label: 'End', format: formatTime },
    { key: 'booking_status', label: 'Status' },
    {
      key: 'action',
      label: 'Action',
      render: (booking) => booking.booking_status === 'booked' ? (
        <button type="button" className="small-button danger" disabled={pendingBookingIds.has(booking.booking_id)} onClick={() => runMemberAction(() => request(`/bookings/${booking.booking_id}/cancel`, { method: 'PATCH' }), 'Booking cancelled.', setPendingBookingIds, booking.booking_id)}>
          {pendingBookingIds.has(booking.booking_id) ? 'Cancelling...' : 'Cancel'}
        </button>
      ) : '-'
    }
  ];

  return (
    <div className="dashboard-stack">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Member hub</p>
          <h1>Membership and booking control</h1>
          <p className="muted">Review your plan status, request a subscription, book sessions, and track payments.</p>
        </div>
      </section>

      {error ? <p className="error" role="alert">{error}</p> : null}
      {message ? <p className="success" role="status">{message}</p> : null}

      {!hasActiveSubscription ? (
        <p className="empty-state">Choose a plan below and wait for admin approval before booking sessions.</p>
      ) : null}

      <section className="tabs dashboard-tabs" aria-label="Member dashboard sections">
        <button type="button" className={activeTab === 'overview' ? 'active' : ''} aria-pressed={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Overview</button>
        <button type="button" className={activeTab === 'plans' ? 'active' : ''} aria-pressed={activeTab === 'plans'} onClick={() => setActiveTab('plans')}>Plans</button>
        <button type="button" className={activeTab === 'sessions' ? 'active' : ''} aria-pressed={activeTab === 'sessions'} onClick={() => setActiveTab('sessions')}>Sessions</button>
        <button type="button" className={activeTab === 'bookings' ? 'active' : ''} aria-pressed={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')}>Bookings</button>
      </section>

      {activeTab === 'overview' ? <section className="status-card-grid" aria-label="Membership status summary">
        <article className="status-card">
          <p className="eyebrow">Current active plan</p>
          <h2>{activeSubscription ? activeSubscription.plan_name : 'No active plan'}</h2>
          <p className="muted">{activeSubscription ? `${formatDate(activeSubscription.start_date)} to ${formatDate(activeSubscription.end_date)}` : 'Choose a plan and wait for admin approval.'}</p>
          <span className="pill">{activeSubscription ? activeSubscription.status : 'Inactive'}</span>
        </article>
        <article className="status-card">
          <p className="eyebrow">Pending request</p>
          <h2>{pendingSubscription ? pendingSubscription.plan_name : 'No pending request'}</h2>
          <p className="muted">{pendingSubscription ? `${formatDate(pendingSubscription.start_date)} to ${formatDate(pendingSubscription.end_date)}` : 'New requests will appear here until admin reviews them.'}</p>
          <span className="pill">{pendingSubscription ? pendingSubscription.status : 'Clear'}</span>
        </article>
        <article className="status-card">
          <p className="eyebrow">Latest payment</p>
          <h2>{latestPayment ? `${Number(latestPayment.amount).toFixed(2)} SAR` : 'No payment yet'}</h2>
          <p className="muted">{latestPayment ? `${latestPayment.plan_name} on ${formatDate(latestPayment.payment_date)}` : 'Payments appear here after admin records them.'}</p>
          <span className="pill">{latestPayment ? latestPayment.payment_status : 'None'}</span>
        </article>
      </section> : null}

      {activeTab === 'plans' ? <><section className="plan-grid" aria-label="Membership plan comparison">
        {plans.map((plan) => (
          <article className="plan-card" key={plan.plan_id}>
            <p className="eyebrow">{plan.duration_months} month{plan.duration_months === 1 ? '' : 's'}</p>
            <h2>{plan.plan_name}</h2>
            <strong>{Number(plan.price).toFixed(2)} SAR</strong>
            <p className="muted">{plan.description}</p>
            <ul className="plan-features">
              {planFeatures(plan).map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <button type="button" disabled={isPlanRequestPending || hasPendingSubscription || isCurrentPlan(plan)} onClick={() => requestSubscription(plan.plan_id)}>
              {pendingPlanIds.has(plan.plan_id) ? 'Creating request...' : planButtonLabel(plan)}
            </button>
          </article>
        ))}
      </section></> : null}

      {activeTab === 'sessions' ? <ResourceTable title="Available scheduled sessions" rows={sessions} columns={sessionColumns} loading={loading} getRowKey={(session) => session.session_id} /> : null}

      {activeTab === 'bookings' ? <ResourceTable title="Booked sessions" rows={bookings} columns={bookingColumns} loading={loading} getRowKey={(booking) => booking.booking_id} /> : null}
    </div>
  );
}
