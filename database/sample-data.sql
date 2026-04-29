USE gym_management_system;

INSERT INTO users (username, password_hash, role, full_name, email, phone, status) VALUES
('admin1', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'admin', 'Admin User', 'admin@example.com', '0500000000', 'active'),
('staff1', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'staff', 'Staff User', 'staff@example.com', '0500000001', 'active'),
('trainer_ahmed', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'trainer', 'Ahmed Saleh', 'ahmed.saleh@example.com', '0551111111', 'active'),
('trainer_lina', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'trainer', 'Lina Adel', 'lina.adel@example.com', '0552222222', 'active'),
('member_omar', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'member', 'Omar Alharbi', 'omar.alharbi@example.com', '0501111111', 'active'),
('member_noor', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'member', 'Noor Hassan', 'noor.hassan@example.com', '0502222222', 'active'),
('member_sara', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'member', 'Sara Khalid', 'sara.khalid@example.com', '0503333333', 'active'),
('member_faisal', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'member', 'Faisal Nasser', 'faisal.nasser@example.com', '0504444444', 'inactive');

INSERT INTO members (user_id, gender, join_date) VALUES
(5, 'male', '2026-01-10'),
(6, 'female', '2026-02-05'),
(7, 'female', '2026-02-18'),
(8, 'male', '2026-03-02');

INSERT INTO trainers (user_id, specialty, hire_date) VALUES
(3, 'Strength Training', '2025-09-01'),
(4, 'Yoga and Mobility', '2025-10-15');

INSERT INTO membership_plans (plan_name, duration_months, price, description) VALUES
('Monthly Basic', 1, 200.00, 'Access to gym facilities during standard hours'),
('Quarterly Plus', 3, 550.00, 'Gym access plus group classes'),
('Annual Premium', 12, 1800.00, 'Full access including classes and trainer consultation');

INSERT INTO subscriptions (member_id, plan_id, start_date, end_date, status, requested_at, approved_by_user_id, cancelled_at) VALUES
(1, 2, '2026-02-01', '2026-04-30', 'active', '2026-01-28 10:00:00', 2, NULL),
(2, 1, '2026-03-01', '2026-03-31', 'expired', '2026-02-27 12:30:00', 2, NULL),
(2, 2, '2026-04-01', '2026-06-30', 'active', '2026-03-29 09:20:00', 2, NULL),
(3, 3, '2026-01-15', '2027-01-14', 'active', '2026-01-12 14:15:00', 1, NULL),
(4, 1, '2026-03-02', '2026-04-01', 'cancelled', '2026-03-02 08:00:00', 2, '2026-03-10 16:45:00');

INSERT INTO payments (subscription_id, amount, payment_date, payment_method, payment_status) VALUES
(1, 550.00, '2026-02-01', 'card', 'paid'),
(2, 200.00, '2026-03-01', 'cash', 'paid'),
(3, 550.00, '2026-04-01', 'transfer', 'paid'),
(4, 1800.00, '2026-01-15', 'card', 'paid'),
(5, 200.00, '2026-03-02', 'cash', 'refunded');

INSERT INTO sessions (trainer_id, session_type, description, location, difficulty, session_date, start_time, end_time, capacity, status) VALUES
(1, 'Morning Strength', 'Compound lifting and full-body strength fundamentals', 'Strength Zone', 'intermediate', '2026-04-22', '08:00:00', '09:00:00', 15, 'scheduled'),
(2, 'Yoga Flow', 'Breath-led mobility and flexibility class', 'Studio A', 'beginner', '2026-04-22', '10:00:00', '11:00:00', 20, 'scheduled'),
(1, 'Personal Training', 'Focused one-on-one coaching session', 'PT Room', 'advanced', '2026-04-22', '17:00:00', '18:00:00', 1, 'scheduled'),
(2, 'Evening Mobility', 'Recovery-focused mobility class for desk workers', 'Studio B', 'beginner', '2026-04-23', '18:00:00', '19:00:00', 12, 'scheduled'),
(1, 'Core and Conditioning', 'Core strength and conditioning circuit', 'Main Floor', 'intermediate', '2026-04-21', '19:00:00', '20:00:00', 18, 'completed');

INSERT INTO bookings (member_id, session_id, booking_date, booking_status) VALUES
(1, 1, '2026-04-20', 'booked'),
(2, 1, '2026-04-20', 'booked'),
(3, 2, '2026-04-20', 'booked'),
(1, 3, '2026-04-21', 'booked'),
(2, 4, '2026-04-21', 'booked'),
(3, 5, '2026-04-20', 'booked'),
(4, 5, '2026-04-20', 'booked');

INSERT INTO attendance (member_id, session_id, marked_by_trainer_id, attendance_status, marked_at) VALUES
(3, 5, 1, 'present', '2026-04-21 20:05:00'),
(4, 5, 1, 'absent', '2026-04-21 20:05:00'),
(1, 1, 1, 'present', '2026-04-22 09:05:00'),
(2, 1, 1, 'late', '2026-04-22 09:10:00');
