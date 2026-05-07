-- =====================================================================
-- Gym Management System - Sample Data
-- =====================================================================
-- Run AFTER database/schema.sql.
-- All seeded accounts use password: password123
-- =====================================================================

USE `gym_management`;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `attendance`;
TRUNCATE TABLE `booking`;
TRUNCATE TABLE `payment`;
TRUNCATE TABLE `subscription`;
TRUNCATE TABLE `session`;
TRUNCATE TABLE `membershipplan`;
TRUNCATE TABLE `staff`;
TRUNCATE TABLE `trainer`;
TRUNCATE TABLE `member`;
TRUNCATE TABLE `user`;
SET FOREIGN_KEY_CHECKS = 1;

-- Shared bcrypt hash for password123.
INSERT INTO `user` (`UserID`, `Username`, `PasswordHash`, `FullName`, `Email`, `Phone`, `Status`, `CreatedAt`) VALUES
(1,  'admin1', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Admin User',       'admin@gymsys.local',    '0500000000', 'Active',    '2026-01-01 08:00:00'),
(2,  'khalid_t', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Khalid Al-Saadi',  'khalid.t@gymsys.local', '0501000201', 'Active',    '2025-12-01 09:00:00'),
(3,  'nora_t', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Nora Al-Ghamdi',   'nora.t@gymsys.local',   '0501000202', 'Active',    '2025-12-10 09:00:00'),
(4,  'yusuf_t', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Yusuf Al-Dosari',  'yusuf.t@gymsys.local',  '0501000203', 'Active',    '2026-01-05 09:00:00'),
(5,  'lina_t', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Lina Hassan',      'lina.t@gymsys.local',   '0501000204', 'Inactive',  '2026-02-15 09:00:00'),
(6,  'ahmed_m', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Ahmed Mohammed',   'ahmed.m@example.com',   '0501000301', 'Active',    '2026-01-05 10:00:00'),
(7,  'sara_a', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Sara Ali',         'sara.a@example.com',    '0501000302', 'Active',    '2026-01-08 10:00:00'),
(8,  'fatima_z', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Fatima Al-Zahrani','fatima.z@example.com',  '0501000303', 'Active',    '2026-01-15 10:00:00'),
(9,  'nasser_o', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Nasser Al-Otaibi', 'nasser.o@example.com',  '0501000304', 'Active',    '2026-02-01 10:00:00'),
(10, 'huda_s', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Huda Al-Shehri',   'huda.s@example.com',    '0501000305', 'Active',    '2026-02-10 10:00:00'),
(11, 'ibrahim_r', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Ibrahim Al-Rashid','ibrahim.r@example.com', '0501000306', 'Active',    '2026-02-20 10:00:00'),
(12, 'layla_m', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Layla Mansour',    'layla.m@example.com',   '0501000307', 'Active',    '2026-03-01 10:00:00'),
(13, 'tariq_a', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Tariq Al-Ahmadi',  'tariq.a@example.com',   '0501000308', 'Suspended', '2026-03-10 10:00:00'),
(14, 'aisha_b', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Aisha Al-Balushi', 'aisha.b@example.com',   '0501000309', 'Active',    '2026-03-15 10:00:00'),
(15, 'omar_q', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Omar Al-Qahtani',  'omar.q@example.com',    '0501000310', 'Active',    '2026-03-25 10:00:00'),
(16, 'reem_h', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Reem Al-Harbi',    'reem.h@example.com',    '0501000311', 'Active',    '2026-04-05 10:00:00'),
(17, 'majed_n', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Majed Al-Najdi',   'majed.n@example.com',   '0501000312', 'Inactive',  '2026-04-15 10:00:00');

INSERT INTO `staff` (`UserID`, `Position`, `HireDate`) VALUES
(1, 'Admin', '2026-01-01');

INSERT INTO `trainer` (`UserID`, `Specialty`, `HireDate`) VALUES
(2, 'Strength & Conditioning', '2025-12-01'),
(3, 'Yoga & Pilates',          '2025-12-10'),
(4, 'CrossFit',                '2026-01-05'),
(5, 'Cardio & HIIT',           '2026-02-15');

INSERT INTO `member` (`UserID`, `Gender`, `JoinDate`) VALUES
(6,  'Male',   '2026-01-05'),
(7,  'Female', '2026-01-08'),
(8,  'Female', '2026-01-15'),
(9,  'Male',   '2026-02-01'),
(10, 'Female', '2026-02-10'),
(11, 'Male',   '2026-02-20'),
(12, 'Female', '2026-03-01'),
(13, 'Male',   '2026-03-10'),
(14, 'Female', '2026-03-15'),
(15, 'Male',   '2026-03-25'),
(16, 'Female', '2026-04-05'),
(17, 'Male',   '2026-04-15');

INSERT INTO `membershipplan` (`PlanID`, `PlanName`, `DurationMonths`, `Price`, `Description`) VALUES
(1, 'Monthly Basic',     1,   150.00, 'Basic one-month gym access with equipment.'),
(2, 'Quarterly Premium', 3,   400.00, 'Three-month access including group classes.'),
(3, 'Annual VIP',        12, 1200.00, 'Full-year access with premium benefits and PT sessions.'),
(4, 'Student Monthly',   1,   100.00, 'Discounted monthly plan for students with valid ID.'),
(5, 'Family Quarterly',  3,   650.00, 'Three-month access for up to 3 family members.');

INSERT INTO `subscription` (`SubscriptionID`, `MemberUserID`, `PlanID`, `StartDate`, `EndDate`, `Status`) VALUES
(1,  6,  1, '2026-01-05', '2026-02-04', 'Cancelled'),
(2,  6,  3, '2026-02-05', '2027-02-04', 'Active'),
(3,  7,  2, '2026-04-08', '2026-07-07', 'Active'),
(4,  8,  3, '2026-01-15', '2027-01-14', 'Active'),
(5,  9,  2, '2026-02-01', '2026-04-30', 'Cancelled'),
(6,  10, 1, '2026-02-10', '2026-03-09', 'Cancelled'),
(7,  10, 1, '2026-05-01', '2026-05-31', 'Active'),
(8,  11, 5, '2026-02-20', '2026-05-19', 'Active'),
(9,  12, 2, '2026-05-10', '2026-08-09', 'Pending'),
(10, 13, 1, '2026-03-10', '2026-04-09', 'Cancelled'),
(11, 14, 4, '2026-05-01', '2026-05-31', 'Active'),
(12, 15, 1, '2026-05-01', '2026-05-30', 'Active'),
(13, 16, 3, '2026-05-15', '2027-05-14', 'Pending'),
(14, 17, 1, '2026-04-15', '2026-05-14', 'Cancelled');

INSERT INTO `payment` (`PaymentID`, `SubscriptionID`, `Amount`, `PaymentDate`, `PaymentMethod`, `PaymentStatus`) VALUES
(1,  1,  150.00, '2026-01-05', 'Card',     'Paid'),
(2,  2,  600.00, '2026-02-05', 'Card',     'Paid'),
(3,  2,  600.00, '2026-08-05', 'Card',     'Pending'),
(4,  3,  400.00, '2026-01-08', 'Transfer', 'Paid'),
(5,  4, 1200.00, '2026-01-15', 'Card',     'Paid'),
(6,  5,  400.00, '2026-02-01', 'Card',     'Failed'),
(7,  5,  400.00, '2026-02-03', 'Cash',     'Paid'),
(8,  6,  150.00, '2026-02-10', 'Card',     'Paid'),
(9,  7,  150.00, '2026-04-01', 'Card',     'Paid'),
(10, 8,  650.00, '2026-02-20', 'Transfer', 'Paid'),
(11, 9,  400.00, '2026-05-08', 'Transfer', 'Pending'),
(12, 10, 150.00, '2026-03-10', 'Card',     'Failed'),
(13, 11, 100.00, '2026-03-15', 'Card',     'Paid'),
(14, 12, 150.00, '2026-04-01', 'Cash',     'Paid'),
(15, 13, 1200.00, '2026-05-12', 'Card',    'Pending'),
(16, 14, 150.00, '2026-04-15', 'Card',     'Failed');

INSERT INTO `session` (`SessionID`, `TrainerUserID`, `SessionTitle`, `SessionType`, `SessionDate`, `StartTime`, `EndTime`, `Capacity`, `Status`) VALUES
(1,  2, 'Morning Strength Foundations', 'Strength', '2026-04-10', '07:00:00', '08:00:00', 12, 'Completed'),
(2,  2, 'Powerlifting Workshop',        'Strength', '2026-04-17', '18:00:00', '19:30:00', 8,  'Completed'),
(3,  3, 'Sunrise Yoga Flow',            'Yoga',     '2026-04-12', '06:30:00', '07:30:00', 15, 'Completed'),
(4,  3, 'Power Pilates',                'Pilates',  '2026-04-19', '17:30:00', '18:30:00', 15, 'Completed'),
(5,  4, 'CrossFit Fundamentals',        'CrossFit', '2026-04-15', '17:00:00', '18:00:00', 10, 'Completed'),
(6,  2, 'Strength Circuit',             'Strength', '2026-05-08', '07:00:00', '08:00:00', 12, 'Scheduled'),
(7,  2, 'Olympic Lifting Clinic',       'Strength', '2026-05-15', '18:00:00', '19:30:00', 8,  'Scheduled'),
(8,  3, 'Restorative Yoga',             'Yoga',     '2026-05-09', '20:00:00', '21:00:00', 15, 'Scheduled'),
(9,  3, 'Pilates Intermediate',         'Pilates',  '2026-05-12', '17:30:00', '18:30:00', 15, 'Scheduled'),
(10, 4, 'CrossFit WOD',                 'CrossFit', '2026-05-10', '17:00:00', '18:00:00', 10, 'Scheduled'),
(11, 4, 'CrossFit Open Gym',            'CrossFit', '2026-05-14', '19:00:00', '20:30:00', 12, 'Scheduled'),
(12, 5, 'HIIT Blast',                   'HIIT',     '2026-05-05', '19:00:00', '19:45:00', 20, 'Cancelled');

INSERT INTO `booking` (`BookingID`, `MemberUserID`, `SessionID`, `BookingDate`, `BookingStatus`) VALUES
(1,  6,  1, '2026-04-08', 'Confirmed'),
(2,  7,  1, '2026-04-08', 'Confirmed'),
(3,  9,  1, '2026-04-09', 'Confirmed'),
(4,  6,  2, '2026-04-15', 'Confirmed'),
(5,  11, 2, '2026-04-15', 'Confirmed'),
(6,  7,  3, '2026-04-10', 'Confirmed'),
(7,  8,  3, '2026-04-10', 'Confirmed'),
(8,  10, 3, '2026-04-11', 'Confirmed'),
(9,  8,  4, '2026-04-17', 'Confirmed'),
(10, 14, 4, '2026-04-17', 'Confirmed'),
(11, 9,  5, '2026-04-13', 'Confirmed'),
(12, 11, 5, '2026-04-13', 'Confirmed'),
(13, 13, 5, '2026-04-14', 'Confirmed'),
(14, 6,  6, '2026-05-01', 'Booked'),
(15, 7,  6, '2026-05-02', 'Booked'),
(16, 8,  7, '2026-05-03', 'Booked'),
(17, 7,  8, '2026-05-02', 'Booked'),
(18, 10, 8, '2026-05-03', 'Booked'),
(19, 14, 9, '2026-05-04', 'Booked'),
(20, 6,  10, '2026-05-01', 'Booked'),
(21, 9,  10, '2026-05-02', 'Booked'),
(22, 11, 11, '2026-05-05', 'Booked'),
(23, 12, 6, '2026-05-01', 'Cancelled'),
(24, 15, 8, '2026-05-02', 'Cancelled'),
(25, 16, 4, '2026-04-16', 'Cancelled');

INSERT INTO `attendance` (`AttendanceID`, `BookingID`, `MarkedByTrainerUserID`, `AttendanceStatus`, `MarkedAt`) VALUES
(1,  1, 2, 'Present', '2026-04-10 08:05:00'),
(2,  2, 2, 'Present', '2026-04-10 08:05:00'),
(3,  3, 2, 'Late',    '2026-04-10 08:10:00'),
(4,  4, 2, 'Present', '2026-04-17 19:35:00'),
(5,  5, 2, 'Absent',  '2026-04-17 19:35:00'),
(6,  6, 3, 'Present', '2026-04-12 07:35:00'),
(7,  7, 3, 'Present', '2026-04-12 07:35:00'),
(8,  8, 3, 'Late',    '2026-04-12 07:38:00'),
(9,  9, 3, 'Present', '2026-04-19 18:35:00'),
(10, 10, 3, 'Present', '2026-04-19 18:35:00'),
(11, 11, 4, 'Present', '2026-04-15 18:05:00'),
(12, 12, 4, 'Present', '2026-04-15 18:05:00'),
(13, 13, 4, 'Absent',  '2026-04-15 18:05:00');
