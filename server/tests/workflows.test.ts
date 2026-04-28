import { describe, expect, it } from 'vitest';

function canBookSession(input: { status: string; capacity: number; bookedCount: number; alreadyBooked: boolean }) {
  if (input.status !== 'scheduled') return 'Session is not available for booking';
  if (input.alreadyBooked) return 'Member already booked this session';
  if (input.bookedCount >= input.capacity) return 'Session is full';
  return 'ok';
}

function isAttendanceStatus(value: string) {
  return ['present', 'absent', 'late'].includes(value);
}

describe('booking workflow rules', () => {
  it('rejects duplicate bookings', () => {
    expect(canBookSession({ status: 'scheduled', capacity: 5, bookedCount: 1, alreadyBooked: true })).toBe('Member already booked this session');
  });

  it('rejects full sessions', () => {
    expect(canBookSession({ status: 'scheduled', capacity: 2, bookedCount: 2, alreadyBooked: false })).toBe('Session is full');
  });

  it('accepts valid bookings', () => {
    expect(canBookSession({ status: 'scheduled', capacity: 2, bookedCount: 1, alreadyBooked: false })).toBe('ok');
  });
});

describe('attendance workflow rules', () => {
  it('allows present absent and late only', () => {
    expect(isAttendanceStatus('present')).toBe(true);
    expect(isAttendanceStatus('absent')).toBe(true);
    expect(isAttendanceStatus('late')).toBe(true);
    expect(isAttendanceStatus('excused')).toBe(false);
  });
});
