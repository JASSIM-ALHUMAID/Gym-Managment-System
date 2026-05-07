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
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Dumping structure for table gym_management.member
CREATE TABLE IF NOT EXISTS `member` (
  `UserID` int(11) NOT NULL,
  `Gender` varchar(20) NOT NULL,
  `JoinDate` date NOT NULL,
  PRIMARY KEY (`UserID`),
  CONSTRAINT `fk_member_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_member_gender` CHECK (`Gender` in ('Male','Female'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Dumping structure for table gym_management.trainer
CREATE TABLE IF NOT EXISTS `trainer` (
  `UserID` int(11) NOT NULL,
  `Specialty` varchar(100) DEFAULT NULL,
  `HireDate` date NOT NULL,
  PRIMARY KEY (`UserID`),
  CONSTRAINT `fk_trainer_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
