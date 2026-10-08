-- D-01 Set up the database (Sonam)
-- Run this first. It creates the empty G-Link database.

CREATE DATABASE IF NOT EXISTS g_link
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE g_link;

-- Each team member can use their own login. Copy these lines, change the name and
-- the password, and run them as root. NEVER commit a real password to Git.
--
-- CREATE USER IF NOT EXISTS 'sonam'@'localhost' IDENTIFIED BY 'CHANGE_ME';
-- GRANT ALL PRIVILEGES ON g_link.* TO 'sonam'@'localhost';
-- FLUSH PRIVILEGES;