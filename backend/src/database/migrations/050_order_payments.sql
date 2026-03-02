-- Stripe order payments: capture and escrow ledger
CREATE TABLE IF NOT EXISTS order_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  provider ENUM('STRIPE') NOT NULL DEFAULT 'STRIPE',
  payment_intent_id VARCHAR(128) NULL,
  charge_id VARCHAR(128) NULL,
  capture_status ENUM('NONE','CAPTURED','FAILED','CANCELLED') NOT NULL DEFAULT 'NONE',
  escrow_status ENUM('NONE','HELD','RELEASED','REFUNDED') NOT NULL DEFAULT 'NONE',
  paid_at TIMESTAMP NULL,
  refunded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_order_payments_order (order_id),
  INDEX idx_order_payments_intent (payment_intent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
