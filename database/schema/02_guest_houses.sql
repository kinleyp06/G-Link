-- 2. Guest_Houses
CREATE TABLE IF NOT EXISTS guest_houses (
  guesthouse_id    INT AUTO_INCREMENT PRIMARY KEY,
  guesthouse_name  VARCHAR(50) NOT NULL,
  location         VARCHAR(50) NOT NULL,
  description      TEXT        NULL,
  contact_number   VARCHAR(20) NULL,
  status           ENUM('Available','Closed','Maintenance') NOT NULL DEFAULT 'Available'
) ENGINE=InnoDB;
