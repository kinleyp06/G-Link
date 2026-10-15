-- 11. Rates: admin-editable. One row per guest_category + charge_type. rate is per night, before GST.
CREATE TABLE IF NOT EXISTS rates (
  rate_id         INT AUTO_INCREMENT PRIMARY KEY,
  guest_category  ENUM('RUB staff','Other national','International') NOT NULL,
  charge_type     ENUM('Per Bed','Exclusive Room') NOT NULL,
  rate            DECIMAL(10,2) NULL,
  gst_percent     DECIMAL(4,2)  NOT NULL DEFAULT 5.00,
  updated_by      INT  NULL,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_rate UNIQUE (guest_category, charge_type),
  CONSTRAINT fk_rates_user FOREIGN KEY (updated_by) REFERENCES users(user_id)
) ENGINE=InnoDB;
