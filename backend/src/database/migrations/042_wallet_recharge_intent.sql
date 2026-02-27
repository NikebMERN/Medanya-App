CREATE TABLE IF NOT EXISTS stripe_recharge_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    event_id VARCHAR(128) NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    coins INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_stripe_recharge_idempotency (idempotency_key),
    INDEX idx_stripe_recharge_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
