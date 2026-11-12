-- 5. Booking_Guests: additional guests on a booking (the booker comes from users).
-- Each is RUB (with staff ID) or Non-RUB and pays the per-bed rate of their own category.
-- For an international guest's booking (entered by an admin), ALL guests, the main guest too, are stored here.
CREATE TABLE IF NOT EXISTS booking_guests (
  guest_id        INT AUTO_INCREMENT PRIMARY KEY,
  booking_id      INT NOT NULL,
  full_name       VARCHAR(50) NOT NULL,
  gender          ENUM('Male','Female') NOT NULL,
  contact_number  VARCHAR(11) NULL,
  citizenship_id  VARCHAR(20) NULL,
  staff_id        VARCHAR(20) NULL,
  guest_category  ENUM('RUB','Non-RUB') NOT NULL,
  arrival_date    DATE NOT NULL,
  departure_date  DATE NOT NULL,
  CONSTRAINT fk_guests_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
) ENGINE=InnoDB;
