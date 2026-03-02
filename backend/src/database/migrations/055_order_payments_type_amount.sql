-- Payment type (full vs COD deposit) and amount/currency for transfers
ALTER TABLE order_payments
  ADD COLUMN payment_type ENUM('FULL','COD_DEPOSIT') NOT NULL DEFAULT 'FULL' AFTER provider,
  ADD COLUMN amount_captured INT UNSIGNED NULL COMMENT 'amount in cents' AFTER charge_id,
  ADD COLUMN currency VARCHAR(3) NULL DEFAULT 'aed' AFTER amount_captured;
