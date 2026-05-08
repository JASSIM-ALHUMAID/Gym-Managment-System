DROP DATABASE IF EXISTS `gym_management`;
CREATE DATABASE `gym_management`;
USE `gym_management`;

-- 1. User Table (Base Table)
CREATE TABLE IF NOT EXISTS `user` (
  `UserID` int NOT NULL AUTO_INCREMENT,
  `Username` varchar(50) NOT NULL,
  `PasswordHash` varchar(255) NOT NULL,
  `FullName` varchar(100) NOT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `Phone` varchar(20) DEFAULT NULL,
  `Status` varchar(20) NOT NULL DEFAULT 'Active',
  `CreatedAt` datetime NOT NULL,
  PRIMARY KEY (`UserID`),
  UNIQUE KEY `Username` (`Username`),
  UNIQUE KEY `Email` (`Email`),
  CONSTRAINT `chk_user_status` CHECK (`Status` in ('Active', 'Inactive', 'Suspended'))
);

-- 2. Staff Table (UserID is the Primary Key)
CREATE TABLE IF NOT EXISTS `staff` (
  `UserID` int NOT NULL,
  `Position` varchar(100) DEFAULT 'Admin',
  `HireDate` date NOT NULL,
  PRIMARY KEY (`UserID`),
  CONSTRAINT `fk_staff_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Trainer Table (UserID is the Primary Key)
CREATE TABLE IF NOT EXISTS `trainer` (
  `UserID` int NOT NULL,
  `Specialty` varchar(100) DEFAULT NULL,
  `HireDate` date NOT NULL,
  PRIMARY KEY (`UserID`),
  CONSTRAINT `fk_trainer_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. Member Table (UserID is the Primary Key)
CREATE TABLE IF NOT EXISTS `member` (
  `UserID` int NOT NULL,
  `Gender` varchar(20) NOT NULL,
  `JoinDate` date NOT NULL,
  PRIMARY KEY (`UserID`),
  CONSTRAINT `fk_member_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_member_gender` CHECK (`Gender` in ('Male', 'Female'))
);

-- 5. Membership Plans
CREATE TABLE IF NOT EXISTS `membershipplan` (
  `PlanID` int NOT NULL AUTO_INCREMENT,
  `PlanName` varchar(100) NOT NULL,
  `DurationMonths` int NOT NULL,
  `Price` decimal(10, 2) NOT NULL,
  `Description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`PlanID`),
  UNIQUE KEY `PlanName` (`PlanName`),
  CONSTRAINT `chk_membershipplan_duration` CHECK (`DurationMonths` > 0),
  CONSTRAINT `chk_membershipplan_price` CHECK (`Price` > 0)
);

-- 6. Subscriptions
CREATE TABLE IF NOT EXISTS `subscription` (
  `SubscriptionID` int NOT NULL AUTO_INCREMENT,
  `MemberUserID` int NOT NULL,
  `PlanID` int NOT NULL,
  `StartDate` date NOT NULL,
  `EndDate` date DEFAULT NULL,
  `Status` varchar(20) NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`SubscriptionID`),
  CONSTRAINT `fk_subscription_member` FOREIGN KEY (`MemberUserID`) REFERENCES `member` (`UserID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_subscription_plan` FOREIGN KEY (`PlanID`) REFERENCES `membershipplan` (`PlanID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_subscription_status` CHECK (`Status` in ('Pending', 'Active', 'Cancelled'))
);

-- 7. Payments
CREATE TABLE IF NOT EXISTS `payment` (
  `PaymentID` int NOT NULL AUTO_INCREMENT,
  `SubscriptionID` int NOT NULL,
  `Amount` decimal(10, 2) NOT NULL,
  `PaymentDate` date NOT NULL,
  `PaymentMethod` varchar(50) DEFAULT NULL,
  `PaymentStatus` varchar(20) NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`PaymentID`),
  CONSTRAINT `fk_payment_subscription` FOREIGN KEY (`SubscriptionID`) REFERENCES `subscription` (`SubscriptionID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_payment_amount` CHECK (`Amount` > 0),
  CONSTRAINT `chk_payment_status` CHECK (`PaymentStatus` in ('Pending', 'Paid', 'Failed'))
);

-- 8. Training Sessions
CREATE TABLE IF NOT EXISTS `session` (
  `SessionID` int NOT NULL AUTO_INCREMENT,
  `TrainerUserID` int NOT NULL,
  `SessionTitle` varchar(100) NOT NULL,
  `SessionType` varchar(50) DEFAULT NULL,
  `SessionDate` date NOT NULL,
  `StartTime` time NOT NULL,
  `EndTime` time NOT NULL,
  `Capacity` int DEFAULT NULL,
  `Status` varchar(20) NOT NULL DEFAULT 'Scheduled',
  PRIMARY KEY (`SessionID`),
  CONSTRAINT `fk_session_trainer` FOREIGN KEY (`TrainerUserID`) REFERENCES `trainer` (`UserID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_session_capacity` CHECK (`Capacity` > 0),
  CONSTRAINT `chk_session_status` CHECK (`Status` in ('Scheduled', 'Completed', 'Cancelled')),
  CONSTRAINT `chk_session_time_order` CHECK (`EndTime` > `StartTime`)
);

-- 9. Bookings
CREATE TABLE IF NOT EXISTS `booking` (
  `BookingID` int NOT NULL AUTO_INCREMENT,
  `MemberUserID` int NOT NULL,
  `SessionID` int NOT NULL,
  `BookingDate` date NOT NULL,
  `BookingStatus` varchar(20) NOT NULL DEFAULT 'Confirmed',
  PRIMARY KEY (`BookingID`),
  UNIQUE KEY `uq_booking_member_session` (`MemberUserID`, `SessionID`),
  CONSTRAINT `fk_booking_member` FOREIGN KEY (`MemberUserID`) REFERENCES `member` (`UserID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_session` FOREIGN KEY (`SessionID`) REFERENCES `session` (`SessionID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_booking_status` CHECK (`BookingStatus` in ('Confirmed', 'Booked', 'Cancelled'))
);

-- 10. Attendance
CREATE TABLE IF NOT EXISTS `attendance` (
  `AttendanceID` int NOT NULL AUTO_INCREMENT,
  `BookingID` int NOT NULL,
  `MarkedByTrainerUserID` int NOT NULL,
  `AttendanceStatus` varchar(20) NOT NULL,
  `MarkedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`AttendanceID`),
  UNIQUE KEY `uq_attendance_booking` (`BookingID`),
  CONSTRAINT `fk_attendance_booking` FOREIGN KEY (`BookingID`) REFERENCES `booking` (`BookingID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_attendance_trainer` FOREIGN KEY (`MarkedByTrainerUserID`) REFERENCES `trainer` (`UserID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_attendance_status` CHECK (`AttendanceStatus` in ('Present', 'Absent', 'Late'))
);
