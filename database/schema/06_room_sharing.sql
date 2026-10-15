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
