-- 9. Halls: meeting halls (one 25-seater hall, Nu. 5,000 per day before GST). A hall is inside a guest house,
-- so it belongs to that guest house and is closed when the guest house is closed.
CREATE TABLE IF NOT EXISTS halls (
  hall_id        INT AUTO_INCREMENT PRIMARY KEY,
  guesthouse_id  INT           NOT NULL,
  hall_name      VARCHAR(50)   NOT NULL,
  capacity       INT           NOT NULL,
  price_per_day  DECIMAL(10,2) NOT NULL,
  status         ENUM('Available','Closed','Maintenance') NOT NULL DEFAULT 'Available',
  CONSTRAINT fk_halls_guesthouse FOREIGN KEY (guesthouse_id) REFERENCES guest_houses(guesthouse_id)
) ENGINE=InnoDB;
