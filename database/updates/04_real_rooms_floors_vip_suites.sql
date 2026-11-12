-- Run this ONCE on a g_link database made before the real room list was added. It:
--   1. adds rooms.floor (0 = ground floor, 1 = first floor) and rooms.vip_only, and a 'Triple' room type,
--   2. turns the six sample rooms into rooms 1-3 (ground floor) and 5-7 (first floor), so existing
--      bookings keep their room, and adds room 4, room 8, Suite 1 and Suite 2 (VIP only).
-- Easier if your data is only test data: DROP DATABASE g_link; then run all_in_one.sql instead.
USE g_link;

ALTER TABLE rooms MODIFY room_type ENUM('Single','Double','Triple','Suite') NOT NULL DEFAULT 'Triple';
ALTER TABLE rooms ADD COLUMN floor TINYINT NOT NULL DEFAULT 0 AFTER capacity;
ALTER TABLE rooms ADD COLUMN vip_only BOOLEAN NOT NULL DEFAULT FALSE AFTER floor;

UPDATE rooms SET room_number = '1', floor = 0 WHERE guesthouse_id = 1 AND room_number = '101';
UPDATE rooms SET room_number = '2', floor = 0 WHERE guesthouse_id = 1 AND room_number = '102';
UPDATE rooms SET room_number = '3', floor = 0 WHERE guesthouse_id = 1 AND room_number = '103';
UPDATE rooms SET room_number = '5', floor = 1 WHERE guesthouse_id = 1 AND room_number = '201';
UPDATE rooms SET room_number = '6', floor = 1 WHERE guesthouse_id = 1 AND room_number = '202';
UPDATE rooms SET room_number = '7', floor = 1 WHERE guesthouse_id = 1 AND room_number = '203';
UPDATE rooms SET room_type = 'Triple', capacity = 3, vip_only = FALSE,
                 description = 'Attached bathroom'
 WHERE guesthouse_id = 1 AND room_number IN ('1','2','3','5','6','7');

INSERT INTO rooms (guesthouse_id, room_number, room_type, capacity, floor, vip_only, room_status, description) VALUES
  (1, '4',       'Triple', 3, 0, FALSE, 'Available', 'Attached bathroom'),
  (1, '8',       'Triple', 3, 1, FALSE, 'Available', 'Attached bathroom'),
  (1, 'Suite 1', 'Suite',  1, 0, TRUE,  'Available', 'Double bed, lounge, kitchenette and bathroom'),
  (1, 'Suite 2', 'Suite',  1, 1, TRUE,  'Available', 'Double bed, lounge, kitchenette and bathroom')
ON DUPLICATE KEY UPDATE room_number = room_number;
