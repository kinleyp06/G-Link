-- 9. Halls: meeting halls (one 25-seater hall, Nu. 5,000 per day before GST)
CREATE TABLE IF NOT EXISTS halls (
  hall_id        INT AUTO_INCREMENT PRIMARY KEY,
  hall_name      VARCHAR(50)   NOT NULL,
  capacity       INT           NOT NULL,
  price_per_day  DECIMAL(10,2) NOT NULL,
  status         ENUM('Available','Closed','Maintenance') NOT NULL DEFAULT 'Available'
) ENGINE=InnoDB;
