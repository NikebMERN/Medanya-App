-- Payout tracking + COD deposit (Option A: small online deposit, rest cash on delivery)
ALTER TABLE orders
  ADD COLUMN cod_deposit_cents INT UNSIGNED NULL COMMENT 'COD: deposit captured online' AFTER address_json,
  ADD COLUMN cod_cash_due_cents INT UNSIGNED NULL COMMENT 'COD: amount buyer pays cash on delivery' AFTER cod_deposit_cents,
  ADD COLUMN payout_mode VARCHAR(32) NOT NULL DEFAULT 'STRIPE_CONNECT' AFTER cod_cash_due_cents,
  ADD COLUMN payout_status ENUM('NONE','PENDING','PAID','FAILED') NOT NULL DEFAULT 'NONE' AFTER payout_mode,
  ADD COLUMN payout_transfer_id VARCHAR(128) NULL AFTER payout_status;

CREATE INDEX idx_orders_payout_status ON orders(payout_status);
