-- Scam ML: training samples + ml columns
CREATE TABLE IF NOT EXISTS scam_training_samples (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    target_type ENUM('JOB','MARKET','CHAT') NOT NULL,
    target_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    text LONGTEXT NOT NULL,
    lang VARCHAR(10) NULL,
    weak_label ENUM('SCAM','LEGIT','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    final_label ENUM('SCAM','LEGIT') NULL,
    label_source ENUM('RULES','REPORTS','ADMIN','AUTO_SURVIVED_7D','MODEL') NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_sample_target (target_type, target_id),
    INDEX idx_samples_final_label (final_label),
    INDEX idx_samples_created (created_at),
    INDEX idx_samples_label_source (label_source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE jobs ADD COLUMN ml_score FLOAT NULL AFTER ai_explanation;
ALTER TABLE jobs ADD COLUMN ml_model_version VARCHAR(64) NULL AFTER ml_score;
ALTER TABLE jobs ADD COLUMN ml_confidence FLOAT NULL AFTER ml_model_version;

ALTER TABLE marketplace_items ADD COLUMN ml_score FLOAT NULL AFTER ai_explanation;
ALTER TABLE marketplace_items ADD COLUMN ml_model_version VARCHAR(64) NULL AFTER ml_score;
ALTER TABLE marketplace_items ADD COLUMN ml_confidence FLOAT NULL AFTER ml_model_version;
