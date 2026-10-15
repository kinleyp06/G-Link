-- 3. Rooms: 3-bedded, availability managed per bed. Charges live in rates, not here.
CREATE TABLE IF NOT EXISTS rooms (
  room_id        INT AUTO_INCREMENT PRIMARY KEY,
  guesthouse_id  INT         NOT NULL,
  room_number    VARCHAR(10) NOT NULL,
  room_type      ENUM('Single','Double','Suite') NOT NULL DEFAULT 'Double',
  capacity       INT         NOT NULL DEFAULT 3,
  room_status    ENUM('Available','Occupied','Maintenance') NOT NULL DEFAULT 'Available',
  description    TEXT        NULL,
  CONSTRAINT fk_rooms_guesthouse FOREIGN KEY (guesthouse_id) REFERENCES guest_houses(guesthouse_id),
  CONSTRAINT uq_room_number UNIQUE (guesthouse_id, room_number),
  CONSTRAINT chk_room_capacity CHECK (capacity > 0)
) ENGINE=InnoDB;
