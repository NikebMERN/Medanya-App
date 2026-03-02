CREATE TABLE IF NOT EXISTS in_app_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NULL,
    data_json JSON NULL,
    seen TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ian_user (user_id),
    INDEX idx_ian_seen (seen),
    INDEX idx_ian_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
