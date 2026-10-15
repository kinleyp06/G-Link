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
