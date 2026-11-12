-- The meeting hall is inside the CST guest house (guesthouse_id 1).
INSERT INTO halls (hall_id, guesthouse_id, hall_name, capacity, price_per_day, status) VALUES
  (1, 1, 'Meeting Hall', 25, 5000.00, 'Available')
ON DUPLICATE KEY UPDATE hall_name = VALUES(hall_name);
