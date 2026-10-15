-- G-Link ALL-IN-ONE database script (made from schema/ and seeds/).
-- Run it in MySQL Workbench (open file -> run all) or:  mysql -u root -p < all_in_one.sql
-- Safe to run again: tables use IF NOT EXISTS and seeds will not duplicate.

-- ===================== schema/00_create_database.sql =====================
-- G-Link: create the database (run this first)
CREATE DATABASE IF NOT EXISTS g_link CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE g_link;

-- ===================== schema/01_users.sql =====================
-- 1. Users: everyone who can log in (Guest, Incharge, Admin, Super Admin)
-- Profile fields (phone, CID, gender, SID, department) are filled in before the first booking.
CREATE TABLE IF NOT EXISTS users (
  user_id         INT AUTO_INCREMENT PRIMARY KEY,
  first_name      VARCHAR(20)  NOT NULL,
  last_name       VARCHAR(20)  NOT NULL,
  email           VARCHAR(100) NOT NULL UNIQUE,
  email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
  phone_number    VARCHAR(11)  NULL,
  citizenship_id  VARCHAR(20)  NULL UNIQUE,
  gender          ENUM('Male','Female','Other') NULL,
  sid             VARCHAR(20)  NULL,
  department      VARCHAR(50)  NULL,
  password        VARCHAR(60)  NOT NULL,
  role            ENUM('Guest','Incharge','Admin','Super Admin') NOT NULL DEFAULT 'Guest',
  status          ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ===================== schema/02_guest_houses.sql =====================
-- 2. Guest_Houses
CREATE TABLE IF NOT EXISTS guest_houses (
  guesthouse_id    INT AUTO_INCREMENT PRIMARY KEY,
  guesthouse_name  VARCHAR(50) NOT NULL,
  location         VARCHAR(50) NOT NULL,
  description      TEXT        NULL,
  contact_number   VARCHAR(20) NULL,
  status           ENUM('Available','Closed','Maintenance') NOT NULL DEFAULT 'Available'
) ENGINE=InnoDB;

-- ===================== schema/03_rooms.sql =====================
-- 3. Rooms: 3-bedded, availability managed per bed. Charges live in rates, not here.
CREATE TABLE IF NOT EXISTS rooms (
  room_id        INT AUTO_INCREMENT PRIMARY KEY,
  guesthouse_id  INT         NOT NULL,
  room_number    VARCHAR(10) NOT NULL,
  room_type      ENUM('Single','Double','Suite') NOT NULL DEFAULT 'Double',
  capacity       INT         NOT NULL DEFAULT 3,
  room_status    ENUM('Available','Occupied','Maintenance') NOT NULL DEFAULT 'Available',
  description    TEXT        NULL,
  CONSTRAINT fk_rooms_guesthouse FOREIGN KEY (guesthouse_id) REFERENCES guest_houses(guesthouse_id),
  CONSTRAINT uq_room_number UNIQUE (guesthouse_id, room_number),
  CONSTRAINT chk_room_capacity CHECK (capacity > 0)
) ENGINE=InnoDB;

-- ===================== schema/04_bookings.sql =====================
-- 4. Bookings: one room booking. user_id is NULL when an admin enters it for an international guest.
CREATE TABLE IF NOT EXISTS bookings (
  booking_id        INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT  NULL,
  created_by        INT  NULL,
  room_id           INT  NOT NULL,
  booking_type      ENUM('Exclusive','Per Bed','Family/Group') NOT NULL,
  guest_category    ENUM('RUB staff','Other national','International') NOT NULL,
  gender            ENUM('Male','Female','Other') NOT NULL,
  check_in_date     DATE NOT NULL,
  check_out_date    DATE NOT NULL,
  booking_date      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  purpose_of_visit  VARCHAR(255) NOT NULL,
  number_of_guests  INT  NOT NULL DEFAULT 1,
  allow_sharing     BOOLEAN NOT NULL DEFAULT FALSE,
  extension_count   INT  NOT NULL DEFAULT 0,
  booking_status    ENUM('Pending','Approved','Rejected','Cancelled','Completed') NOT NULL DEFAULT 'Pending',
  approved_by       INT  NULL,
  approval_date     DATETIME NULL,
  checked_in_at     DATETIME NULL,
  checked_out_at    DATETIME NULL,
  checked_by        INT  NULL,
  CONSTRAINT fk_bookings_user       FOREIGN KEY (user_id)     REFERENCES users(user_id),
  CONSTRAINT fk_bookings_created_by FOREIGN KEY (created_by)  REFERENCES users(user_id),
  CONSTRAINT fk_bookings_room       FOREIGN KEY (room_id)     REFERENCES rooms(room_id),
  CONSTRAINT fk_bookings_approved   FOREIGN KEY (approved_by) REFERENCES users(user_id),
  CONSTRAINT fk_bookings_checked    FOREIGN KEY (checked_by)  REFERENCES users(user_id),
  CONSTRAINT chk_booking_dates  CHECK (check_out_date > check_in_date),
  CONSTRAINT chk_booking_guests CHECK (number_of_guests > 0),
  INDEX idx_bookings_room_dates (room_id, booking_status, check_in_date, check_out_date)
) ENGINE=InnoDB;

-- ===================== schema/05_booking_guests.sql =====================
-- 5. Booking_Guests: additional guests on a booking (the booker comes from users).
-- For admin-entered international bookings, ALL guests (including the main guest) are stored here.
CREATE TABLE IF NOT EXISTS booking_guests (
  guest_id        INT AUTO_INCREMENT PRIMARY KEY,
  booking_id      INT NOT NULL,
  full_name       VARCHAR(50) NOT NULL,
  gender          ENUM('Male','Female','Other') NOT NULL,
  contact_number  VARCHAR(11) NULL,
  citizenship_id  VARCHAR(20) NULL,
  staff_id        VARCHAR(20) NULL,
  guest_category  ENUM('RUB staff','Other national','International') NOT NULL,
  arrival_date    DATE NOT NULL,
  departure_date  DATE NOT NULL,
  CONSTRAINT fk_guests_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ===================== schema/06_room_sharing.sql =====================
-- 6. Room_Sharing: links a spare-bed booking to the occupant's booking.
-- No consent request: the occupant agreed in advance with allow_sharing; both sides only get a notice.
CREATE TABLE IF NOT EXISTS room_sharing (
  sharing_id           INT AUTO_INCREMENT PRIMARY KEY,
  host_booking_id      INT NOT NULL,
  guest_booking_id     INT NOT NULL,
  notice_acknowledged  BOOLEAN NOT NULL DEFAULT FALSE,
  host_notified_at     DATETIME NULL,
  requested_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sharing_host  FOREIGN KEY (host_booking_id)  REFERENCES bookings(booking_id),
  CONSTRAINT fk_sharing_guest FOREIGN KEY (guest_booking_id) REFERENCES bookings(booking_id),
  CONSTRAINT uq_sharing UNIQUE (host_booking_id, guest_booking_id)
) ENGINE=InnoDB;

-- ===================== schema/07_stay_extensions.sql =====================
-- 7. Stay_Extensions: if approved, bookings.check_out_date is updated and extension_count goes up by 1.
CREATE TABLE IF NOT EXISTS stay_extensions (
  extension_id             INT AUTO_INCREMENT PRIMARY KEY,
  booking_id               INT  NOT NULL,
  previous_check_out_date  DATE NOT NULL,
  new_check_out_date       DATE NOT NULL,
  extra_nights             INT  NOT NULL,
  extension_status         ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  requested_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by              INT  NULL,
  reviewed_at              DATETIME NULL,
  CONSTRAINT fk_ext_booking  FOREIGN KEY (booking_id)  REFERENCES bookings(booking_id),
  CONSTRAINT fk_ext_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(user_id),
  CONSTRAINT chk_ext_dates CHECK (new_check_out_date > previous_check_out_date)
) ENGINE=InnoDB;

-- ===================== schema/08_room_blocks.sql =====================
-- 8. Room_Blocks: rooms/beds blocked by an admin (VIP/official reservations). No booking is created.
-- end_date works like a check-out date: the beds are blocked for the nights from start_date up to (not including) end_date.
CREATE TABLE IF NOT EXISTS room_blocks (
  block_id      INT AUTO_INCREMENT PRIMARY KEY,
  room_id       INT NOT NULL,
  beds_blocked  INT NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  reason        VARCHAR(100) NOT NULL,
  blocked_by    INT NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_blocks_room FOREIGN KEY (room_id)    REFERENCES rooms(room_id),
  CONSTRAINT fk_blocks_user FOREIGN KEY (blocked_by) REFERENCES users(user_id),
  CONSTRAINT chk_block_dates CHECK (end_date > start_date),
  CONSTRAINT chk_block_beds  CHECK (beds_blocked > 0)
) ENGINE=InnoDB;

-- ===================== schema/09_halls.sql =====================
-- 9. Halls: meeting halls (one 25-seater hall, Nu. 5,000 per day before GST)
CREATE TABLE IF NOT EXISTS halls (
  hall_id        INT AUTO_INCREMENT PRIMARY KEY,
  hall_name      VARCHAR(50)   NOT NULL,
  capacity       INT           NOT NULL,
  price_per_day  DECIMAL(10,2) NOT NULL,
  status         ENUM('Available','Closed','Maintenance') NOT NULL DEFAULT 'Available'
) ENGINE=InnoDB;

-- ===================== schema/10_hall_bookings.sql =====================
-- 10. Hall_Bookings: separate from room bookings (own ID, dates, status and payment).
-- start_date and end_date are both days the hall is used (a 1-day booking has start_date = end_date).
CREATE TABLE IF NOT EXISTS hall_bookings (
  hall_booking_id      INT AUTO_INCREMENT PRIMARY KEY,
  user_id              INT  NOT NULL,
  hall_id              INT  NOT NULL,
  start_date           DATE NOT NULL,
  end_date             DATE NOT NULL,
  purpose              VARCHAR(255) NOT NULL,
  number_of_attendees  INT  NOT NULL,
  booking_date         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  booking_status       ENUM('Pending','Approved','Rejected','Cancelled') NOT NULL DEFAULT 'Pending',
  approved_by          INT  NULL,
  approval_date        DATETIME NULL,
  CONSTRAINT fk_hb_user     FOREIGN KEY (user_id)     REFERENCES users(user_id),
  CONSTRAINT fk_hb_hall     FOREIGN KEY (hall_id)     REFERENCES halls(hall_id),
  CONSTRAINT fk_hb_approved FOREIGN KEY (approved_by) REFERENCES users(user_id),
  CONSTRAINT chk_hb_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_hb_people CHECK (number_of_attendees > 0)
) ENGINE=InnoDB;

-- ===================== schema/11_rates.sql =====================
-- 11. Rates: admin-editable. One row per guest_category + charge_type. rate is per night, before GST.
CREATE TABLE IF NOT EXISTS rates (
  rate_id         INT AUTO_INCREMENT PRIMARY KEY,
  guest_category  ENUM('RUB staff','Other national','International') NOT NULL,
  charge_type     ENUM('Per Bed','Exclusive Room') NOT NULL,
  rate            DECIMAL(10,2) NULL,
  gst_percent     DECIMAL(4,2)  NOT NULL DEFAULT 5.00,
  updated_by      INT  NULL,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_rate UNIQUE (guest_category, charge_type),
  CONSTRAINT fk_rates_user FOREIGN KEY (updated_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

-- ===================== schema/12_payments.sql =====================
-- 12. Payments: the bill for a room OR hall booking. No online gateway; only records the charge and if it was paid.
-- total = subtotal + gst_amount. A booking can have several rows (e.g. extra nights from an extension).
CREATE TABLE IF NOT EXISTS payments (
  payment_id       INT AUTO_INCREMENT PRIMARY KEY,
  booking_id       INT NULL,
  hall_booking_id  INT NULL,
  description      VARCHAR(100) NULL,
  subtotal         DECIMAL(10,2) NOT NULL,
  gst_amount       DECIMAL(10,2) NOT NULL,
  total_amount     DECIMAL(10,2) NOT NULL,
  payment_status   ENUM('Unpaid','Paid') NOT NULL DEFAULT 'Unpaid',
  paid_at          DATETIME NULL,
  recorded_by      INT NULL,
  CONSTRAINT fk_pay_booking FOREIGN KEY (booking_id)      REFERENCES bookings(booking_id),
  CONSTRAINT fk_pay_hall    FOREIGN KEY (hall_booking_id) REFERENCES hall_bookings(hall_booking_id),
  CONSTRAINT fk_pay_user    FOREIGN KEY (recorded_by)     REFERENCES users(user_id),
  CONSTRAINT chk_pay_one_target CHECK ((booking_id IS NULL) <> (hall_booking_id IS NULL))
) ENGINE=InnoDB;

-- ===================== seeds/01_rates.sql =====================
-- Starting rates (per night, before 5% GST). International stays blank (NULL) until the administration sets it.
INSERT INTO rates (guest_category, charge_type, rate, gst_percent) VALUES
  ('RUB staff',      'Per Bed',        250.00, 5.00),
  ('RUB staff',      'Exclusive Room', 500.00, 5.00),
  ('Other national', 'Per Bed',        400.00, 5.00),
  ('Other national', 'Exclusive Room', 800.00, 5.00),
  ('International',  'Per Bed',        NULL,   5.00),
  ('International',  'Exclusive Room', NULL,   5.00)
ON DUPLICATE KEY UPDATE guest_category = guest_category;

-- ===================== seeds/02_guest_houses_and_rooms.sql =====================
-- SAMPLE data so the app has something to show. Replace with the real guest house details later.
INSERT INTO guest_houses (guesthouse_id, guesthouse_name, location, description, contact_number, status) VALUES
  (1, 'CST Guest House', 'Rinchending, Phuentsholing', 'Guest house on the College of Science and Technology campus.', '05251000', 'Available')
ON DUPLICATE KEY UPDATE guesthouse_name = VALUES(guesthouse_name);

INSERT INTO rooms (guesthouse_id, room_number, room_type, capacity, room_status, description) VALUES
  (1, '101', 'Double', 3, 'Available', 'Ground floor, 3 beds'),
  (1, '102', 'Double', 3, 'Available', 'Ground floor, 3 beds'),
  (1, '103', 'Double', 3, 'Available', 'Ground floor, 3 beds'),
  (1, '201', 'Double', 3, 'Available', 'First floor, 3 beds'),
  (1, '202', 'Double', 3, 'Available', 'First floor, 3 beds'),
  (1, '203', 'Suite',  3, 'Available', 'First floor, 3 beds, attached sitting area')
ON DUPLICATE KEY UPDATE room_type = VALUES(room_type);

-- ===================== seeds/03_halls.sql =====================
INSERT INTO halls (hall_id, hall_name, capacity, price_per_day, status) VALUES
  (1, 'Meeting Hall', 25, 5000.00, 'Available')
ON DUPLICATE KEY UPDATE hall_name = VALUES(hall_name);

