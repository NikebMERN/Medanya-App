CREATE TABLE IF NOT EXISTS user_device_tokens (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  token VARCHAR(255) NOT NULL,
  platform ENUM('ios','android','web') NOT NULL DEFAULT 'android',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_token (token),
  INDEX idx_user (user_id),
  INDEX idx_user_platform (user_id, platform)
) ENGINE=InnoDB;
