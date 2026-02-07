CREATE TABLE IF NOT EXISTS wallets (
  user_id BIGINT NOT NULL,
  balance INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT chk_wallet_balance_nonnegative CHECK (balance >= 0),
  -- 🔥 Define the index inside the table creation
  INDEX idx_wallets_updated_at (updated_at)
) ENGINE=InnoDB;