-- 8. Room_Blocks: rooms/beds blocked by an admin (VIP/official reservations). No booking is created.
-- end_date works like a check-out date: the beds are blocked for the nights from start_date up to (not including) end_date.
CREATE TABLE IF NOT EXISTS room_blocks (
  block_id      INT AUTO_INCREMENT PRIMARY KEY,
  room_id       INT NOT NULL,
  beds_blocked  INT NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  reason        VARCHAR(100) NOT NULL,
  blocked_by    INT NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_blocks_room FOREIGN KEY (room_id)    REFERENCES rooms(room_id),
  CONSTRAINT fk_blocks_user FOREIGN KEY (blocked_by) REFERENCES users(user_id),
  CONSTRAINT chk_block_dates CHECK (end_date > start_date),
  CONSTRAINT chk_block_beds  CHECK (beds_blocked > 0)
) ENGINE=InnoDB;
