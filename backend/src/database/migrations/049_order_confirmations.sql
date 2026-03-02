-- Unified delivery confirmation (QR + 7-digit) for both COD and Stripe
CREATE TABLE IF NOT EXISTS order_confirmations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  code_hash VARCHAR(128) NOT NULL COMMENT 'bcrypt hash of 7-digit code',
  code_last4 VARCHAR(8) NULL COMMENT 'last 2-4 digits for UI masking e.g. ****1234',
  code_encrypted VARCHAR(255) NULL COMMENT 'encrypted full code for buyer reveal when canReveal',
  qr_token_hash VARCHAR(64) NULL COMMENT 'sha256 of qr token for verification',
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  used_by_seller_id BIGINT UNSIGNED NULL,
  attempts_count INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_order_confirmations_order (order_id),
  INDEX idx_order_confirmations_expires (expires_at),
  INDEX idx_order_confirmations_used (used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
