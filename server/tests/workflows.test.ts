import { describe, expect, it } from 'vitest';
import {
  canBookSession,
  getBookingResponseStatus,
  getMarkedByTrainerId,
  isAttendanceStatus,
  type ExistingBooking
} from '../src/workflowRules.js';

describe('booking workflow rules', () => {
  it('rejects duplicate bookings', () => {
    expect(canBookSession({ status: 'scheduled', capacity: 5, bookedCount: 1, existingBookingStatus: 'booked' })).toBe('Member already booked this session');
  });

  it('rejects full sessions', () => {
    expect(canBookSession({ status: 'scheduled', capacity: 2, bookedCount: 2 })).toBe('Session is full');
  });

  it('accepts valid bookings', () => {
    expect(canBookSession({ status: 'scheduled', capacity: 2, bookedCount: 1 })).toBe('ok');
  });

  it('returns 200 when reactivating a cancelled booking', () => {
    const existingBooking: ExistingBooking = { booking_id: 1, booking_status: 'cancelled' };

    expect(getBookingResponseStatus(existingBooking)).toBe(200);
    expect(getBookingResponseStatus(null)).toBe(201);
  });
});

describe('attendance workflow rules', () => {
  it('allows present absent and late only', () => {
    expect(isAttendanceStatus('present')).toBe(true);
    expect(isAttendanceStatus('absent')).toBe(true);
    expect(isAttendanceStatus('late')).toBe(true);
    expect(isAttendanceStatus('excused')).toBe(false);
  });

  it('uses the session trainer when admin or staff submit another trainer', () => {
    expect(getMarkedByTrainerId(3, 8)).toBe(3);
  });
});
