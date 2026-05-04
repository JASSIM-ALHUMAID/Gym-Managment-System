# Gym Management Schema Migration Design

## Goal

Replace the app-specific `gym_management_system` schema with the provided `gym_management.sql` schema, then update the app so it uses that schema directly.

## Database Design

The canonical schema becomes `gym_management`, using the provided singular table names and column names: `user`, `member`, `trainer`, `membershipplan`, `subscription`, `payment`, `session`, `booking`, and `attendance`.

The schema will be extended with a `staff` subtype table for admin users:

```sql
CREATE TABLE IF NOT EXISTS `staff` (
  `UserID` int(11) NOT NULL,
  `Position` varchar(100) DEFAULT 'Admin',
  `HireDate` date NOT NULL,
  PRIMARY KEY (`UserID`),
  CONSTRAINT `fk_staff_user`
    FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`)
    ON DELETE CASCADE ON UPDATE CASCADE
);
```

`member`, `trainer`, and `staff` are role subtype tables over `user`.

## Auth And Roles

The app will infer roles from subtype table membership:

- `staff.UserID` means app role `admin`.
- `trainer.UserID` means app role `trainer`.
- `member.UserID` means app role `member`.

If a user appears in more than one subtype table, staff takes precedence, then trainer, then member.

## Application Changes

Backend routes will be migrated from old snake_case plural tables to the new schema names. Response JSON can keep the existing frontend-friendly snake_case shape where practical, using SQL aliases such as `UserID AS user_id`.

Membership and trainer IDs in application code will map to `UserID` because the new model uses `UserID` as the primary key for `member`, `trainer`, and `staff`.

Attendance will be updated to use the new model: `attendance` references `BookingID`, not direct `member_id` and `session_id` columns.

## Data And Config

`database/schema.sql` will be replaced with the new schema. Server configuration will use `DB_NAME=gym_management`.

Sample data should include one staff/admin user so admin-only app features remain usable.

## Testing

Update backend tests to load the new schema and validate auth, admin workflows, member booking, trainer attendance, and payment/subscription reads against the new table names and relationships.
