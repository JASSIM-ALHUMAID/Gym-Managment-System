import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(resolve(import.meta.dirname, '../../database/schema.sql'), 'utf8');
const seed = readFileSync(resolve(import.meta.dirname, '../../database/seed.sql'), 'utf8');

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

  it('keeps sample data separate from schema definitions', () => {
    expect(schema).not.toMatch(/INSERT INTO/i);
    expect(seed).toMatch(/INSERT INTO `user`/);
    expect(seed).toMatch(/INSERT INTO `attendance`/);
  });

  it('seeds bcrypt password hashes for all demo roles', () => {
    expect(seed).not.toContain("'hash001'");
    expect(seed).not.toContain("'hash002'");
    expect(seed).not.toContain("'hash003'");
    expect(seed).not.toContain("'hash004'");
    expect(seed).toMatch(/'ahmed_m', '\$2[aby]\$/);
    expect(seed).toMatch(/'sara_a', '\$2[aby]\$/);
    expect(seed).toMatch(/'khalid_t', '\$2[aby]\$/);
    expect(seed).toMatch(/'nora_t', '\$2[aby]\$/);
  });

  it('guards positive numeric fields and valid session times', () => {
    expect(schema).toContain('CONSTRAINT `chk_membershipplan_duration` CHECK (`DurationMonths` > 0)');
    expect(schema).toContain('CONSTRAINT `chk_membershipplan_price` CHECK (`Price` > 0)');
    expect(schema).toContain('CONSTRAINT `chk_payment_amount` CHECK (`Amount` > 0)');
    expect(schema).toContain('CONSTRAINT `chk_session_capacity` CHECK (`Capacity` > 0)');
    expect(schema).toContain('CONSTRAINT `chk_session_time_order` CHECK (`EndTime` > `StartTime`)');
  });
});
