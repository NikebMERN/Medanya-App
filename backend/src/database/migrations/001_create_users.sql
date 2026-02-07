CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NULL,
    firebase_uid VARCHAR(128) UNIQUE,
    display_name VARCHAR(100) NULL,
    avatar_url VARCHAR(500) NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_verified TINYINT(1) NOT NULL DEFAULT 0,
    privacy_hide_phone TINYINT(1) NOT NULL DEFAULT 1,
    notification_enabled TINYINT(1) NOT NULL DEFAULT 1,
    is_banned TINYINT(1) NOT NULL DEFAULT 0,
    banned_reason VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Define indices here instead of separate commands
    INDEX idx_users_phone (phone_number),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;