CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type ENUM('credit','debit','earn','commission') NOT NULL,
  amount INT NOT NULL,
  reference_type VARCHAR(50) DEFAULT NULL,
  reference_id VARCHAR(100) DEFAULT NULL,
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_tx_user_created (user_id, created_at),
  INDEX idx_tx_reference (reference_type, reference_id)
) ENGINE=InnoDB;
