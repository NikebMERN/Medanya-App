CREATE TABLE IF NOT EXISTS video_pins (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    video_id VARCHAR(24) NOT NULL,
    listing_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_video_pins_video (video_id),
    INDEX idx_video_pins_listing (listing_id),
    INDEX idx_video_pins_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
