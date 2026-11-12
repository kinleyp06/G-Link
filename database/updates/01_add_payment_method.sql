-- Run this ONCE on a g_link database that was created before the payment method was added.
-- (A fresh database made from all_in_one.sql already has the column; running this there gives
--  "Duplicate column name 'payment_method'", which is harmless.)
USE g_link;

ALTER TABLE payments
  ADD COLUMN payment_method ENUM('mBOB','MPay','DK','TPay','DrukPay','BDBLePay','Cash') NULL AFTER paid_at;
