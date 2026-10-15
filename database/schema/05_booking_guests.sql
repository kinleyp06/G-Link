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
