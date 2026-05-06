import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(resolve(import.meta.dirname, '../../database/schema.sql'), 'utf8');

describe('database schema constraints', () => {
  it('restricts status columns to application-supported values', () => {
    expect(schema).toContain("CONSTRAINT `chk_user_status` CHECK (`Status` in ('Active','Inactive','Suspended'))");
    expect(schema).toContain("CONSTRAINT `chk_subscription_status` CHECK (`Status` in ('Pending','Active','Cancelled'))");
    expect(schema).toContain("CONSTRAINT `chk_payment_status` CHECK (`PaymentStatus` in ('Pending','Paid','Failed'))");
    expect(schema).toContain("CONSTRAINT `chk_session_status` CHECK (`Status` in ('Scheduled','Completed','Cancelled'))");
    expect(schema).toContain("CONSTRAINT `chk_booking_status` CHECK (`BookingStatus` in ('Confirmed','Booked','Cancelled'))");
    expect(schema).toContain("CONSTRAINT `chk_attendance_status` CHECK (`AttendanceStatus` in ('Present','Absent','Late'))");
  });

  it('restricts member gender to male and female values', () => {
    expect(schema).toContain('`Gender` varchar(20) NOT NULL');
    expect(schema).toContain("CONSTRAINT `chk_member_gender` CHECK (`Gender` in ('Male','Female'))");
  });

  it('requires workflow status columns and applies logical defaults', () => {
    expect(schema).toContain('`AttendanceStatus` varchar(20) NOT NULL');
    expect(schema).toContain("`BookingStatus` varchar(20) NOT NULL DEFAULT 'Confirmed'");
    expect(schema).toContain("`PaymentStatus` varchar(20) NOT NULL DEFAULT 'Pending'");
    expect(schema).toContain("`Status` varchar(20) NOT NULL DEFAULT 'Scheduled'");
    expect(schema).toContain("`Status` varchar(20) NOT NULL DEFAULT 'Pending'");
    expect(schema).toContain("`Status` varchar(20) NOT NULL DEFAULT 'Active'");
  });

  it('seeds bcrypt password hashes for all demo roles', () => {
    expect(schema).not.toContain("'hash001'");
    expect(schema).not.toContain("'hash002'");
    expect(schema).not.toContain("'hash003'");
    expect(schema).not.toContain("'hash004'");
    expect(schema).toMatch(/'ahmed_m', '\$2[aby]\$/);
    expect(schema).toMatch(/'sara_a', '\$2[aby]\$/);
    expect(schema).toMatch(/'khalid_t', '\$2[aby]\$/);
    expect(schema).toMatch(/'nora_t', '\$2[aby]\$/);
  });

  it('guards positive numeric fields and valid session times', () => {
    expect(schema).toContain('CONSTRAINT `chk_membershipplan_duration` CHECK (`DurationMonths` > 0)');
    expect(schema).toContain('CONSTRAINT `chk_membershipplan_price` CHECK (`Price` > 0)');
    expect(schema).toContain('CONSTRAINT `chk_payment_amount` CHECK (`Amount` > 0)');
    expect(schema).toContain('CONSTRAINT `chk_session_capacity` CHECK (`Capacity` > 0)');
    expect(schema).toContain('CONSTRAINT `chk_session_time_order` CHECK (`EndTime` > `StartTime`)');
  });
});
