export type ExistingBooking = { booking_id: number; booking_status: string };

export function canBookSession(input: { status: string; capacity: number; bookedCount: number; existingBookingStatus?: string }) {
  if (input.status !== 'scheduled') return 'Session is not available for booking';
  if (input.existingBookingStatus === 'booked') return 'Member already booked this session';
  if (input.bookedCount >= input.capacity) return 'Session is full';
  return 'ok';
}

export function getBookingResponseStatus(existingBooking: ExistingBooking | null) {
  return existingBooking ? 200 : 201;
}

export function isAttendanceStatus(value: string) {
  return ['present', 'absent', 'late'].includes(value);
}

export function getMarkedByTrainerId(sessionTrainerId: number, _submittedTrainerId?: number) {
  return sessionTrainerId;
}
