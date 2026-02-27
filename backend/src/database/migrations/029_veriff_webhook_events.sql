-- Veriff webhook event storage for diagnostics
CREATE TABLE IF NOT EXISTS veriff_webhook_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(128) NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    headers_json JSON NULL,
    payload_json JSON NULL,
    signature_valid TINYINT(1) NOT NULL DEFAULT 0,
    error_text VARCHAR(500) NULL,
    INDEX idx_veriff_events_session (session_id),
    INDEX idx_veriff_events_received (received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
