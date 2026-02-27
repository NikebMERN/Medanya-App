-- stream_pins table (MySQL for consistency with listings)
CREATE TABLE IF NOT EXISTS stream_pins (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(24) NOT NULL,
    listing_id BIGINT UNSIGNED NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_stream_pins_stream (stream_id),
    INDEX idx_stream_pins_listing (listing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
