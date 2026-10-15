-- Starting rates (per night, before 5% GST). International stays blank (NULL) until the administration sets it.
INSERT INTO rates (guest_category, charge_type, rate, gst_percent) VALUES
  ('RUB staff',      'Per Bed',        250.00, 5.00),
  ('RUB staff',      'Exclusive Room', 500.00, 5.00),
  ('Other national', 'Per Bed',        400.00, 5.00),
  ('Other national', 'Exclusive Room', 800.00, 5.00),
  ('International',  'Per Bed',        NULL,   5.00),
  ('International',  'Exclusive Room', NULL,   5.00)
ON DUPLICATE KEY UPDATE guest_category = guest_category;
