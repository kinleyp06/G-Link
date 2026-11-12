-- The CST guest house and its rooms.
INSERT INTO guest_houses (guesthouse_id, guesthouse_name, location, description, contact_number, status) VALUES
  (1, 'CST Guest House', 'Rinchending, Phuentsholing', 'Guest house on the College of Science and Technology campus.', '05251000', 'Available')
ON DUPLICATE KEY UPDATE guesthouse_name = VALUES(guesthouse_name);

-- The CST guest house: rooms 1-4 on the ground floor, rooms 5-8 on the first floor (3 beds each),
-- and two suites reserved for college VIP guests (Suite 1 ground floor, Suite 2 first floor).
INSERT INTO rooms (guesthouse_id, room_number, room_type, capacity, floor, vip_only, room_status, description) VALUES
  (1, '1',       'Triple', 3, 0, FALSE, 'Available', 'Attached bathroom'),
  (1, '2',       'Triple', 3, 0, FALSE, 'Available', 'Attached bathroom'),
  (1, '3',       'Triple', 3, 0, FALSE, 'Available', 'Attached bathroom'),
  (1, '4',       'Triple', 3, 0, FALSE, 'Available', 'Attached bathroom'),
  (1, '5',       'Triple', 3, 1, FALSE, 'Available', 'Attached bathroom'),
  (1, '6',       'Triple', 3, 1, FALSE, 'Available', 'Attached bathroom'),
  (1, '7',       'Triple', 3, 1, FALSE, 'Available', 'Attached bathroom'),
  (1, '8',       'Triple', 3, 1, FALSE, 'Available', 'Attached bathroom'),
  (1, 'Suite 1', 'Suite',  1, 0, TRUE,  'Available', 'Double bed, lounge, kitchenette and bathroom'),
  (1, 'Suite 2', 'Suite',  1, 1, TRUE,  'Available', 'Double bed, lounge, kitchenette and bathroom')
ON DUPLICATE KEY UPDATE room_type = VALUES(room_type);
