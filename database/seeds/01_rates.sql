-- Starting rates (per night, before 5% GST). Two kinds of guest: RUB (Royal University of Bhutan) members and Non-RUB.
INSERT INTO rates (guest_category, charge_type, rate, gst_percent) VALUES
  ('RUB',     'Per Bed',        250.00, 5.00),
  ('RUB',     'Exclusive Room', 500.00, 5.00),
  ('Non-RUB', 'Per Bed',        400.00, 5.00),
  ('Non-RUB', 'Exclusive Room', 800.00, 5.00)
ON DUPLICATE KEY UPDATE guest_category = guest_category;
