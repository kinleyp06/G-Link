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
