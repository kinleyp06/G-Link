-- 1. Users: everyone who can log in (Guest, Incharge, Admin, Super Admin)
-- Profile fields (phone, CID, gender, SID, department) are filled in before the first booking.
CREATE TABLE IF NOT EXISTS users (
  user_id         INT AUTO_INCREMENT PRIMARY KEY,
  first_name      VARCHAR(20)  NOT NULL,
  last_name       VARCHAR(20)  NOT NULL,
  email           VARCHAR(100) NOT NULL UNIQUE,
  email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
  phone_number    VARCHAR(11)  NULL,
  citizenship_id  VARCHAR(20)  NULL UNIQUE,
  gender          ENUM('Male','Female','Other') NULL,
  sid             VARCHAR(20)  NULL,
  department      VARCHAR(50)  NULL,
  password        VARCHAR(60)  NOT NULL,
  role            ENUM('Guest','Incharge','Admin','Super Admin') NOT NULL DEFAULT 'Guest',
  status          ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
