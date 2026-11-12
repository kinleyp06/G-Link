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
