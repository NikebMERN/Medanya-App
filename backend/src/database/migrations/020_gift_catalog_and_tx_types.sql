-- Gift catalog for livestream virtual gifts
CREATE TABLE IF NOT EXISTS gift_catalog (
  id VARCHAR(32) NOT NULL,
  name VARCHAR(100) NOT NULL,
  icon_url VARCHAR(500) DEFAULT NULL,
  coins_cost INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_gift_active (is_active)
) ENGINE=InnoDB;

-- Extend transactions type for gift flows
ALTER TABLE transactions
  MODIFY COLUMN type ENUM(
    'credit','debit','earn','commission',
    'gift_spend','gift_earn','gift_commission'
  ) NOT NULL;

-- Optional: add columns for gift audit (run only if your MySQL supports it; else use metadata JSON)
-- ALTER TABLE transactions ADD COLUMN from_user_id BIGINT NULL AFTER user_id;
-- ALTER TABLE transactions ADD COLUMN to_user_id BIGINT NULL AFTER from_user_id;
-- ALTER TABLE transactions ADD COLUMN stream_id VARCHAR(24) NULL AFTER to_user_id;
-- ALTER TABLE transactions ADD COLUMN gift_id VARCHAR(32) NULL AFTER stream_id;
-- ALTER TABLE transactions ADD COLUMN platform_fee_coins INT NULL AFTER amount;
