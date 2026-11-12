-- Run this ONCE on a g_link database made before the International guest booking page came back.
-- It lets the admin book for an international guest who has no account:
-- bookings.user_id may be empty, and bookings.created_by records which admin entered it.
-- (A fresh database made from all_in_one.sql already has this; running it there gives
--  "Duplicate column name 'created_by'", which is harmless.)
USE g_link;

ALTER TABLE bookings MODIFY user_id INT NULL;
ALTER TABLE bookings ADD COLUMN created_by INT NULL AFTER user_id;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_created_by FOREIGN KEY (created_by) REFERENCES users(user_id);
