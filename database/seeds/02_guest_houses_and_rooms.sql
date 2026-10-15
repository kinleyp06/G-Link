-- SAMPLE data so the app has something to show. Replace with the real guest house details later.
INSERT INTO guest_houses (guesthouse_id, guesthouse_name, location, description, contact_number, status) VALUES
  (1, 'CST Guest House', 'Rinchending, Phuentsholing', 'Guest house on the College of Science and Technology campus.', '05251000', 'Available')
ON DUPLICATE KEY UPDATE guesthouse_name = VALUES(guesthouse_name);

INSERT INTO rooms (guesthouse_id, room_number, room_type, capacity, room_status, description) VALUES
  (1, '101', 'Double', 3, 'Available', 'Ground floor, 3 beds'),
  (1, '102', 'Double', 3, 'Available', 'Ground floor, 3 beds'),
  (1, '103', 'Double', 3, 'Available', 'Ground floor, 3 beds'),
  (1, '201', 'Double', 3, 'Available', 'First floor, 3 beds'),
  (1, '202', 'Double', 3, 'Available', 'First floor, 3 beds'),
  (1, '203', 'Suite',  3, 'Available', 'First floor, 3 beds, attached sitting area')
ON DUPLICATE KEY UPDATE room_type = VALUES(room_type);
