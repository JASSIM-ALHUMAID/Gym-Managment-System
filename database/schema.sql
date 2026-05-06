-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               10.4.32-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for gym_management
DROP DATABASE IF EXISTS `gym_management`;
CREATE DATABASE `gym_management` /*!40100 DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci */;
USE `gym_management`;

-- Dumping structure for table gym_management.attendance
CREATE TABLE IF NOT EXISTS `attendance` (
  `AttendanceID` int(11) NOT NULL AUTO_INCREMENT,
  `BookingID` int(11) NOT NULL,
  `MarkedByTrainerUserID` int(11) NOT NULL,
  `AttendanceStatus` varchar(20) NOT NULL,
  `MarkedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`AttendanceID`),
  UNIQUE KEY `BookingID` (`BookingID`),
  KEY `fk_attendance_trainer` (`MarkedByTrainerUserID`),
  CONSTRAINT `fk_attendance_booking` FOREIGN KEY (`BookingID`) REFERENCES `booking` (`BookingID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_attendance_trainer` FOREIGN KEY (`MarkedByTrainerUserID`) REFERENCES `trainer` (`UserID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_attendance_status` CHECK (`AttendanceStatus` in ('Present','Absent','Late'))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Dumping data for table gym_management.attendance: ~2 rows (approximately)
INSERT INTO `attendance` (`AttendanceID`, `BookingID`, `MarkedByTrainerUserID`, `AttendanceStatus`, `MarkedAt`) VALUES
	(1, 1, 3, 'Present', '2026-01-10 18:05:00'),
	(2, 2, 4, 'Present', '2026-01-11 09:05:00');

-- Dumping structure for table gym_management.booking
CREATE TABLE IF NOT EXISTS `booking` (
  `BookingID` int(11) NOT NULL AUTO_INCREMENT,
  `MemberUserID` int(11) NOT NULL,
  `SessionID` int(11) NOT NULL,
  `BookingDate` date NOT NULL,
  `BookingStatus` varchar(20) NOT NULL DEFAULT 'Confirmed',
  PRIMARY KEY (`BookingID`),
  UNIQUE KEY `uq_booking_member_session` (`MemberUserID`,`SessionID`),
  KEY `fk_booking_session` (`SessionID`),
  CONSTRAINT `fk_booking_member` FOREIGN KEY (`MemberUserID`) REFERENCES `member` (`UserID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_session` FOREIGN KEY (`SessionID`) REFERENCES `session` (`SessionID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_booking_status` CHECK (`BookingStatus` in ('Confirmed','Booked','Cancelled'))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Dumping data for table gym_management.booking: ~2 rows (approximately)
INSERT INTO `booking` (`BookingID`, `MemberUserID`, `SessionID`, `BookingDate`, `BookingStatus`) VALUES
	(1, 1, 1, '2026-01-08', 'Confirmed'),
	(2, 2, 2, '2026-01-09', 'Confirmed');

-- Dumping structure for table gym_management.member
CREATE TABLE IF NOT EXISTS `member` (
  `UserID` int(11) NOT NULL,
  `Gender` varchar(20) NOT NULL,
  `JoinDate` date NOT NULL,
  PRIMARY KEY (`UserID`),
  CONSTRAINT `fk_member_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_member_gender` CHECK (`Gender` in ('Male','Female'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Dumping data for table gym_management.member: ~2 rows (approximately)
INSERT INTO `member` (`UserID`, `Gender`, `JoinDate`) VALUES
	(1, 'Male', '2026-01-05'),
	(2, 'Female', '2026-01-06');

-- Dumping structure for table gym_management.membershipplan
CREATE TABLE IF NOT EXISTS `membershipplan` (
  `PlanID` int(11) NOT NULL AUTO_INCREMENT,
  `PlanName` varchar(100) NOT NULL,
  `DurationMonths` int(11) NOT NULL,
  `Price` decimal(10,2) NOT NULL,
  `Description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`PlanID`),
  UNIQUE KEY `PlanName` (`PlanName`),
  CONSTRAINT `chk_membershipplan_duration` CHECK (`DurationMonths` > 0),
  CONSTRAINT `chk_membershipplan_price` CHECK (`Price` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Dumping data for table gym_management.membershipplan: ~3 rows (approximately)
INSERT INTO `membershipplan` (`PlanID`, `PlanName`, `DurationMonths`, `Price`, `Description`) VALUES
	(1, 'Monthly Basic', 1, 150.00, 'Basic one-month gym access'),
	(2, 'Quarterly Premium', 3, 400.00, 'Three-month access with classes'),
	(3, 'Annual VIP', 12, 1200.00, 'Full-year access with premium benefits');

-- Dumping structure for table gym_management.payment
CREATE TABLE IF NOT EXISTS `payment` (
  `PaymentID` int(11) NOT NULL AUTO_INCREMENT,
  `SubscriptionID` int(11) NOT NULL,
  `Amount` decimal(10,2) NOT NULL,
  `PaymentDate` date NOT NULL,
  `PaymentMethod` varchar(50) DEFAULT NULL,
  `PaymentStatus` varchar(20) NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`PaymentID`),
  KEY `fk_payment_subscription` (`SubscriptionID`),
  CONSTRAINT `fk_payment_subscription` FOREIGN KEY (`SubscriptionID`) REFERENCES `subscription` (`SubscriptionID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_payment_amount` CHECK (`Amount` > 0),
  CONSTRAINT `chk_payment_status` CHECK (`PaymentStatus` in ('Pending','Paid','Failed'))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Dumping data for table gym_management.payment: ~2 rows (approximately)
INSERT INTO `payment` (`PaymentID`, `SubscriptionID`, `Amount`, `PaymentDate`, `PaymentMethod`, `PaymentStatus`) VALUES
	(1, 1, 150.00, '2026-01-05', 'Card', 'Paid'),
	(2, 2, 400.00, '2026-01-06', 'Cash', 'Paid');

-- Dumping structure for table gym_management.session
CREATE TABLE IF NOT EXISTS `session` (
  `SessionID` int(11) NOT NULL AUTO_INCREMENT,
  `TrainerUserID` int(11) NOT NULL,
  `SessionTitle` varchar(100) NOT NULL,
  `SessionType` varchar(50) DEFAULT NULL,
  `SessionDate` date NOT NULL,
  `StartTime` time NOT NULL,
  `EndTime` time NOT NULL,
  `Capacity` int(11) DEFAULT NULL,
  `Status` varchar(20) NOT NULL DEFAULT 'Scheduled',
  PRIMARY KEY (`SessionID`),
  KEY `fk_session_trainer` (`TrainerUserID`),
  CONSTRAINT `fk_session_trainer` FOREIGN KEY (`TrainerUserID`) REFERENCES `trainer` (`UserID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_session_capacity` CHECK (`Capacity` > 0),
  CONSTRAINT `chk_session_status` CHECK (`Status` in ('Scheduled','Completed','Cancelled')),
  CONSTRAINT `chk_session_time_order` CHECK (`EndTime` > `StartTime`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Dumping data for table gym_management.session: ~2 rows (approximately)
INSERT INTO `session` (`SessionID`, `TrainerUserID`, `SessionTitle`, `SessionType`, `SessionDate`, `StartTime`, `EndTime`, `Capacity`, `Status`) VALUES
	(1, 3, 'Upper Body Strength', 'Strength', '2026-01-10', '17:00:00', '18:00:00', 15, 'Scheduled'),
	(2, 4, 'Morning Yoga', 'Yoga', '2026-01-11', '08:00:00', '09:00:00', 20, 'Scheduled');

-- Dumping structure for table gym_management.subscription
CREATE TABLE IF NOT EXISTS `subscription` (
  `SubscriptionID` int(11) NOT NULL AUTO_INCREMENT,
  `MemberUserID` int(11) NOT NULL,
  `PlanID` int(11) NOT NULL,
  `StartDate` date NOT NULL,
  `EndDate` date DEFAULT NULL,
  `Status` varchar(20) NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`SubscriptionID`),
  KEY `fk_subscription_member` (`MemberUserID`),
  KEY `fk_subscription_plan` (`PlanID`),
  CONSTRAINT `fk_subscription_member` FOREIGN KEY (`MemberUserID`) REFERENCES `member` (`UserID`) ON UPDATE CASCADE,
  CONSTRAINT `fk_subscription_plan` FOREIGN KEY (`PlanID`) REFERENCES `membershipplan` (`PlanID`) ON UPDATE CASCADE,
  CONSTRAINT `chk_subscription_status` CHECK (`Status` in ('Pending','Active','Cancelled'))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Dumping data for table gym_management.subscription: ~2 rows (approximately)
INSERT INTO `subscription` (`SubscriptionID`, `MemberUserID`, `PlanID`, `StartDate`, `EndDate`, `Status`) VALUES
	(1, 1, 1, '2026-01-05', '2026-02-05', 'Active'),
	(2, 2, 2, '2026-01-06', '2026-04-06', 'Active');

-- Dumping structure for table gym_management.trainer
CREATE TABLE IF NOT EXISTS `trainer` (
  `UserID` int(11) NOT NULL,
  `Specialty` varchar(100) DEFAULT NULL,
  `HireDate` date NOT NULL,
  PRIMARY KEY (`UserID`),
  CONSTRAINT `fk_trainer_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Dumping data for table gym_management.trainer: ~2 rows (approximately)
INSERT INTO `trainer` (`UserID`, `Specialty`, `HireDate`) VALUES
	(3, 'Strength Training', '2025-12-01'),
	(4, 'Yoga', '2025-12-10');

CREATE TABLE IF NOT EXISTS `staff` (
  `UserID` int(11) NOT NULL,
  `Position` varchar(100) DEFAULT 'Admin',
  `HireDate` date NOT NULL,
  PRIMARY KEY (`UserID`),
  CONSTRAINT `fk_staff_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Dumping structure for table gym_management.user
CREATE TABLE IF NOT EXISTS `user` (
  `UserID` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `chk_user_status` CHECK (`Status` in ('Active','Inactive','Suspended'))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Dumping data for table gym_management.user: ~4 rows (approximately)
INSERT INTO `user` (`UserID`, `Username`, `PasswordHash`, `FullName`, `Email`, `Phone`, `Status`, `CreatedAt`) VALUES
	(1, 'ahmed_m', '$2b$10$e186jb97NAZ5kTTg3AyTE.vUGzPUhA5EUVVWRH2LLZzyB32.mjQr6', 'Ahmed Mohammed', 'ahmed@example.com', '0501111111', 'Active', '2026-01-01 09:00:00'),
	(2, 'sara_a', '$2b$10$vwgPDkaejd7exPeACEUozOpLcLyAKJ7A9mwCk7Lz4rcVGoq2icbhC', 'Sara Ali', 'sara@example.com', '0502222222', 'Active', '2026-01-02 10:00:00'),
	(3, 'khalid_t', '$2b$10$0NK7y0unBb6nByEaIdL/Xe71uNfO4jHbBOM1f4TKqThTYe3zeex7C', 'Khalid Trainer', 'khalid@example.com', '0503333333', 'Active', '2026-01-03 11:00:00'),
	(4, 'nora_t', '$2b$10$9zHoNYjxoghLgIxzpWVcb.NiWf9B8cMp79MRLU5paYxdC0jjSWuMq', 'Nora Trainer', 'nora@example.com', '0504444444', 'Active', '2026-01-04 12:00:00');

INSERT INTO `user` (`UserID`, `Username`, `PasswordHash`, `FullName`, `Email`, `Phone`, `Status`, `CreatedAt`) VALUES
  (5, 'admin1', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Admin User', 'admin@example.com', '0500000000', 'Active', '2026-01-01 08:00:00');

INSERT INTO `staff` (`UserID`, `Position`, `HireDate`) VALUES
  (5, 'Admin', '2026-01-01');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
