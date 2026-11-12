-- Run this ONCE on a g_link database made before this change. It:
--   1. keeps only two kinds of guest: RUB (Royal University of Bhutan) and Non-RUB (no International),
--   2. keeps only two genders (Male, Female),
--   3. adds users.is_rub_member (the RUB member switch on the profile),
--   4. puts the meeting hall inside the guest house (halls.guesthouse_id),
--   5. removes the admin-entered international bookings column (bookings.created_by).
-- Run 01_add_payment_method.sql first if you have not.
-- Easier if your data is only test data: DROP DATABASE g_link; then run all_in_one.sql instead.
USE g_link;

-- 1. Users: RUB member switch; 'Other' gender is cleared so the person picks Male or Female again.
ALTER TABLE users ADD COLUMN is_rub_member BOOLEAN NOT NULL DEFAULT FALSE AFTER gender;
UPDATE users SET is_rub_member = TRUE WHERE email LIKE '%@rub.edu.bt' OR email LIKE '%.rub.edu.bt';
UPDATE users SET gender = NULL WHERE gender = 'Other';
ALTER TABLE users MODIFY gender ENUM('Male','Female') NULL;

-- 2. Categories: allow old and new names, rename, then keep only the new ones.
ALTER TABLE rates          MODIFY guest_category ENUM('RUB staff','Other national','International','RUB','Non-RUB') NOT NULL;
ALTER TABLE bookings       MODIFY guest_category ENUM('RUB staff','Other national','International','RUB','Non-RUB') NOT NULL;
ALTER TABLE booking_guests MODIFY guest_category ENUM('RUB staff','Other national','International','RUB','Non-RUB') NOT NULL;
DELETE FROM rates WHERE guest_category = 'International';
UPDATE rates          SET guest_category = IF(guest_category = 'RUB staff', 'RUB', 'Non-RUB');
UPDATE bookings       SET guest_category = IF(guest_category = 'RUB staff', 'RUB', 'Non-RUB');
UPDATE booking_guests SET guest_category = IF(guest_category = 'RUB staff', 'RUB', 'Non-RUB');
ALTER TABLE rates          MODIFY guest_category ENUM('RUB','Non-RUB') NOT NULL;
ALTER TABLE bookings       MODIFY guest_category ENUM('RUB','Non-RUB') NOT NULL;
ALTER TABLE booking_guests MODIFY guest_category ENUM('RUB','Non-RUB') NOT NULL;

-- 3. Bookings and their guests: only Male / Female.
-- If either line fails with "Data truncated for column 'gender'", an old test booking used 'Other':
-- use DROP DATABASE g_link; + all_in_one.sql instead.
ALTER TABLE bookings       MODIFY gender ENUM('Male','Female') NOT NULL;
ALTER TABLE booking_guests MODIFY gender ENUM('Male','Female') NOT NULL;

-- 4. No more admin-entered international bookings.
ALTER TABLE bookings DROP FOREIGN KEY fk_bookings_created_by;
ALTER TABLE bookings DROP COLUMN created_by;

-- 5. The meeting hall is inside the guest house.
ALTER TABLE halls ADD COLUMN guesthouse_id INT NULL AFTER hall_id;
UPDATE halls SET guesthouse_id = (SELECT MIN(guesthouse_id) FROM guest_houses);
ALTER TABLE halls MODIFY guesthouse_id INT NOT NULL;
ALTER TABLE halls ADD CONSTRAINT fk_halls_guesthouse FOREIGN KEY (guesthouse_id) REFERENCES guest_houses(guesthouse_id);
