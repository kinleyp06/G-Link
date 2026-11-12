-- 3. Rooms: availability managed per bed. Charges live in rates, not here.
-- floor: 0 = ground floor, 1 = first floor. vip_only: reserved for college VIP guests (the suites):
-- guests cannot book it; the admin reserves it with a room block.
CREATE TABLE IF NOT EXISTS rooms (
  room_id        INT AUTO_INCREMENT PRIMARY KEY,
  guesthouse_id  INT         NOT NULL,
  room_number    VARCHAR(10) NOT NULL,
  room_type      ENUM('Single','Double','Triple','Suite') NOT NULL DEFAULT 'Triple',
  capacity       INT         NOT NULL DEFAULT 3,
  floor          TINYINT     NOT NULL DEFAULT 0,
  vip_only       BOOLEAN     NOT NULL DEFAULT FALSE,
  room_status    ENUM('Available','Occupied','Maintenance') NOT NULL DEFAULT 'Available',
  description    TEXT        NULL,
  CONSTRAINT fk_rooms_guesthouse FOREIGN KEY (guesthouse_id) REFERENCES guest_houses(guesthouse_id),
  CONSTRAINT uq_room_number UNIQUE (guesthouse_id, room_number),
  CONSTRAINT chk_room_capacity CHECK (capacity > 0),
  CONSTRAINT chk_room_floor CHECK (floor >= 0)
) ENGINE=InnoDB;
