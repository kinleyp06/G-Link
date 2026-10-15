INSERT INTO halls (hall_id, hall_name, capacity, price_per_day, status) VALUES
  (1, 'Meeting Hall', 25, 5000.00, 'Available')
ON DUPLICATE KEY UPDATE hall_name = VALUES(hall_name);
