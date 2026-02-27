CREATE TABLE IF NOT EXISTS ml_retrain_approval (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    labeled_count INT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by BIGINT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    model_version_before VARCHAR(64) NULL,
    model_version_after VARCHAR(64) NULL,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
