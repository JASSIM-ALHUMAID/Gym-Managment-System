# Gym Management System

Role-based web app for managing gym members, trainers, plans, subscriptions, payments, sessions, bookings, and attendance.

## Functionality and Queries

### Login

Authenticates an active user by username, loads the related member or trainer profile id when available, then verifies the bcrypt password before issuing a JWT.

```sql
SELECT u.user_id, u.username, u.password_hash, u.role, u.full_name, u.email, u.status,
       m.member_id, t.trainer_id
  FROM users u
  LEFT JOIN members m ON m.user_id = u.user_id
  LEFT JOIN trainers t ON t.user_id = u.user_id
 WHERE u.username = ?
 LIMIT 1;
```

### Member Registration

Creates a new active member account in one transaction by inserting the user record first, then inserting the matching member profile.

```sql
INSERT INTO users (username, password_hash, role, full_name, email, phone, status)
VALUES (?, ?, 'member', ?, ?, ?, 'active');

INSERT INTO members (user_id, gender, join_date)
VALUES (?, ?, CURRENT_DATE);
```

### Admin Dashboard Counts

Shows high-level gym metrics for admins: active members, active subscriptions, scheduled sessions, and pending or failed payments.

```sql
SELECT COUNT(*) AS count FROM users WHERE role = 'member' AND status = 'active';
SELECT COUNT(*) AS count FROM subscriptions WHERE status = 'active';
SELECT COUNT(*) AS count FROM sessions WHERE status = 'scheduled';
SELECT COUNT(*) AS count FROM payments WHERE payment_status IN ('pending', 'failed');
```

### Membership Plans

Lists available plans for authenticated users. Admins can also create, update, and delete plans.

```sql
SELECT plan_id, plan_name, duration_months, price, description
  FROM membership_plans
 ORDER BY plan_id;
```

Create plan query:

```sql
INSERT INTO membership_plans (plan_name, duration_months, price, description)
VALUES (?, ?, ?, ?);
```

Update plan query:

```sql
UPDATE membership_plans
   SET plan_name = ?, duration_months = ?, price = ?, description = ?
 WHERE plan_id = ?;
```

Delete plan query:

```sql
DELETE FROM membership_plans WHERE plan_id = ?;
```

### Members

Allows admins to view member profiles with their linked user contact and account status information.

```sql
SELECT m.member_id, m.gender, m.join_date,
       u.user_id, u.full_name, u.email, u.phone, u.status
  FROM members m
  JOIN users u ON u.user_id = m.user_id
 ORDER BY m.member_id;
```

### Trainers

Allows admins and members to view trainers. Member responses hide trainer email and phone in the API response.

```sql
SELECT t.trainer_id, t.specialty, t.hire_date,
       u.user_id, u.full_name, u.email, u.phone, u.status
  FROM trainers t
  JOIN users u ON u.user_id = t.user_id
 ORDER BY t.trainer_id;
```

### Subscriptions

Members view only their own subscriptions, while admins view all subscriptions with plan and member details.

```sql
SELECT s.*, p.plan_name, p.duration_months, p.price
  FROM subscriptions s
  JOIN membership_plans p ON p.plan_id = s.plan_id
 WHERE s.member_id = ?
 ORDER BY s.start_date DESC;
```

Admin subscription query:

```sql
SELECT s.*, p.plan_name, p.duration_months, p.price,
       m.member_id, u.user_id AS member_user_id, u.full_name AS member_name, u.email AS member_email
  FROM subscriptions s
  JOIN membership_plans p ON p.plan_id = s.plan_id
  JOIN members m ON m.member_id = s.member_id
  JOIN users u ON u.user_id = m.user_id
 ORDER BY s.start_date DESC;
```

Request subscription query:

```sql
INSERT INTO subscriptions (member_id, plan_id, start_date, end_date, status)
VALUES (?, ?, ?, ?, 'pending');
```

Activate subscription query:

```sql
UPDATE subscriptions
   SET status = 'active', approved_by_user_id = ?, cancelled_at = NULL
 WHERE subscription_id = ? AND status = 'pending';
```

Cancel subscription query:

```sql
UPDATE subscriptions
   SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
 WHERE subscription_id = ?;
```

### Payments

Members view payments for their own subscriptions, while admins view all payments with subscription, plan, and member details.

```sql
SELECT pay.*, s.subscription_id, s.status AS subscription_status, p.plan_id, p.plan_name
  FROM payments pay
  JOIN subscriptions s ON s.subscription_id = pay.subscription_id
  JOIN membership_plans p ON p.plan_id = s.plan_id
 WHERE s.member_id = ?
 ORDER BY pay.payment_date DESC;
```

Admin payments query:

```sql
SELECT pay.*, s.subscription_id, s.status AS subscription_status,
       p.plan_id, p.plan_name, m.member_id, u.full_name AS member_name, u.email AS member_email
  FROM payments pay
  JOIN subscriptions s ON s.subscription_id = pay.subscription_id
  JOIN membership_plans p ON p.plan_id = s.plan_id
  JOIN members m ON m.member_id = s.member_id
  JOIN users u ON u.user_id = m.user_id
 ORDER BY pay.payment_date DESC;
```

### Sessions

Shows sessions with trainer details and current booked count. Non-admin users only see scheduled sessions; admins use the same query without the `WHERE s.status = 'scheduled'` filter.

```sql
SELECT s.*, u.full_name AS trainer_name, t.specialty AS trainer_specialty, COALESCE(booked.booked_count, 0) AS booked_count
  FROM sessions s
  JOIN trainers t ON t.trainer_id = s.trainer_id
  JOIN users u ON u.user_id = t.user_id
  LEFT JOIN (
    SELECT session_id, COUNT(*) AS booked_count
      FROM bookings
     WHERE booking_status = 'booked'
     GROUP BY session_id
  ) booked ON booked.session_id = s.session_id
 WHERE s.status = 'scheduled'
 ORDER BY s.session_date, s.start_time;
```

Create session query:

```sql
INSERT INTO sessions (trainer_id, session_type, description, location, difficulty, session_date, start_time, end_time, capacity)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
```

Update session status query:

```sql
UPDATE sessions SET status = ? WHERE session_id = ?;
```

### Bookings

Members view their own bookings, while admins view all bookings with member and trainer names.

```sql
SELECT b.*, s.session_type, s.session_date, s.start_time, s.end_time, s.status AS session_status,
       u.full_name AS trainer_name
  FROM bookings b
  JOIN sessions s ON s.session_id = b.session_id
  JOIN trainers t ON t.trainer_id = s.trainer_id
  JOIN users u ON u.user_id = t.user_id
 WHERE b.member_id = ?
 ORDER BY s.session_date DESC, s.start_time DESC;
```

Create booking query:

```sql
INSERT INTO bookings (member_id, session_id, booking_date, booking_status)
VALUES (?, ?, CURDATE(), 'booked');
```

Cancel booking query:

```sql
UPDATE bookings SET booking_status = 'cancelled' WHERE booking_id = ?;
```

### Attendance

Trainers can view and mark attendance for their sessions. Attendance uses an upsert so marking the same member/session again updates the previous status.

```sql
SELECT b.member_id, u.full_name AS member_name, u.email AS member_email,
       a.attendance_id, a.attendance_status, a.marked_by_trainer_id, a.marked_at
  FROM bookings b
  JOIN members m ON m.member_id = b.member_id
  JOIN users u ON u.user_id = m.user_id
  LEFT JOIN attendance a ON a.session_id = b.session_id AND a.member_id = b.member_id
 WHERE b.session_id = ? AND b.booking_status = 'booked'
 ORDER BY u.full_name;
```

Mark attendance query:

```sql
INSERT INTO attendance (session_id, member_id, marked_by_trainer_id, attendance_status, marked_at)
VALUES (?, ?, ?, ?, NOW())
ON DUPLICATE KEY UPDATE marked_by_trainer_id = VALUES(marked_by_trainer_id),
                        attendance_status = VALUES(attendance_status),
                        marked_at = NOW();
```

### Users

Allows admins to view all user accounts without exposing password hashes.

```sql
SELECT user_id, username, role, full_name, email, phone, status, created_at
  FROM users
 ORDER BY user_id;
```


