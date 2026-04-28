import { useEffect, useState } from 'react';
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

const subscriptionColumns: ResourceColumn<SubscriptionRow>[] = [
  { key: 'subscription_id', label: 'ID' },
  { key: 'plan_name', label: 'Plan' },
  { key: 'start_date', label: 'Start' },
  { key: 'end_date', label: 'End' },
  { key: 'status', label: 'Status' },
  { key: 'price', label: 'Price' }
];

const paymentColumns: ResourceColumn<PaymentRow>[] = [
  { key: 'payment_id', label: 'ID' },
  { key: 'plan_name', label: 'Plan' },
  { key: 'amount', label: 'Amount' },
  { key: 'payment_date', label: 'Date' },
  { key: 'payment_status', label: 'Status' }
];

const planColumns: ResourceColumn<PlanRow>[] = [
  { key: 'plan_id', label: 'ID' },
  { key: 'plan_name', label: 'Plan' },
  { key: 'duration_months', label: 'Months' },
  { key: 'price', label: 'Price' },
  { key: 'description', label: 'Description' }
];

export default function MemberDashboard() {
  const { request } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshAll() {
    const [subscriptionData, paymentData, sessionData, bookingData, planData] = await Promise.all([
      request<{ subscriptions: SubscriptionRow[] }>('/subscriptions'),
      request<{ payments: PaymentRow[] }>('/payments'),
      request<{ sessions: SessionRow[] }>('/sessions'),
      request<{ bookings: BookingRow[] }>('/bookings'),
      request<{ plans: PlanRow[] }>('/plans')
    ]);
    setSubscriptions(subscriptionData.subscriptions);
    setPayments(paymentData.payments);
    setSessions(sessionData.sessions.filter((session) => session.status === 'scheduled'));
    setBookings(bookingData.bookings);
    setPlans(planData.plans);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    refreshAll()
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

  async function runBookingAction(id: number, action: () => Promise<unknown>, successMessage: string) {
    setActionId(id);
    setError(null);
    setMessage(null);
    try {
      await action();
      await refreshAll();
      setMessage(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking action failed');
    } finally {
      setActionId(null);
    }
  }

  const activeBookingBySession = new Map(bookings.filter((booking) => booking.booking_status === 'booked').map((booking) => [booking.session_id, booking]));
  const sessionColumns: ResourceColumn<SessionRow>[] = [
    { key: 'session_type', label: 'Type' },
    { key: 'trainer_name', label: 'Trainer' },
    { key: 'session_date', label: 'Date' },
    { key: 'start_time', label: 'Start' },
    { key: 'end_time', label: 'End' },
    { key: 'booked_count', label: 'Booked' },
    { key: 'capacity', label: 'Capacity' },
    {
      key: 'action',
      label: 'Action',
      render: (session) => {
        const alreadyBooked = activeBookingBySession.has(session.session_id);
        return (
          <button type="button" className="small-button" disabled={alreadyBooked || actionId === session.session_id} onClick={() => runBookingAction(session.session_id, () => request('/bookings', { method: 'POST', body: JSON.stringify({ session_id: session.session_id }) }), 'Session booked.')}>
            {alreadyBooked ? 'Booked' : actionId === session.session_id ? 'Booking...' : 'Book'}
          </button>
        );
      }
    }
  ];

  const bookingColumns: ResourceColumn<BookingRow>[] = [
    { key: 'booking_id', label: 'ID' },
    { key: 'session_type', label: 'Type' },
    { key: 'trainer_name', label: 'Trainer' },
    { key: 'session_date', label: 'Date' },
    { key: 'start_time', label: 'Start' },
    { key: 'booking_status', label: 'Status' },
    {
      key: 'action',
      label: 'Action',
      render: (booking) => booking.booking_status === 'booked' ? (
        <button type="button" className="small-button danger" disabled={actionId === booking.booking_id} onClick={() => runBookingAction(booking.booking_id, () => request(`/bookings/${booking.booking_id}/cancel`, { method: 'PATCH' }), 'Booking cancelled.')}>
          {actionId === booking.booking_id ? 'Cancelling...' : 'Cancel'}
        </button>
      ) : '-'
    }
  ];

  return (
    <div className="dashboard-stack">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Member workflow</p>
          <h1>Membership and sessions</h1>
          <p className="muted">Review your plan, payments, available classes, and bookings.</p>
        </div>
      </section>

      {error ? <p className="error" role="alert">{error}</p> : null}
      {message ? <p className="success" role="status">{message}</p> : null}

      <div className="two-column">
        <ResourceTable title="Subscriptions" rows={subscriptions} columns={subscriptionColumns} loading={loading} />
        <ResourceTable title="Payments" rows={payments} columns={paymentColumns} loading={loading} />
      </div>
      <ResourceTable title="Available scheduled sessions" rows={sessions} columns={sessionColumns} loading={loading} />
      <ResourceTable title="Booked sessions" rows={bookings} columns={bookingColumns} loading={loading} />
      <ResourceTable title="Membership plans" rows={plans} columns={planColumns} loading={loading} />
    </div>
  );
}
