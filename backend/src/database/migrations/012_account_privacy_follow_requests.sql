-- Private account: when 1, follow creates a request that target must accept
ALTER TABLE users
  ADD COLUMN account_private TINYINT(1) NOT NULL DEFAULT 0 AFTER privacy_hide_phone,
  ADD COLUMN last_lat DECIMAL(10, 8) NULL AFTER neighborhood,
  ADD COLUMN last_lng DECIMAL(11, 8) NULL AFTER last_lat;

CREATE TABLE IF NOT EXISTS follow_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  requester_id BIGINT UNSIGNED NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_request (requester_id, target_id),
  INDEX idx_fr_target (target_id),
  INDEX idx_fr_requester (requester_id),
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
