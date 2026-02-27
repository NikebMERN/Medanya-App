-- Scam AI: ai columns for jobs and marketplace_items
ALTER TABLE jobs ADD COLUMN ai_scam_score FLOAT NULL AFTER matched_keywords;
ALTER TABLE jobs ADD COLUMN ai_scam_labels JSON NULL AFTER ai_scam_score;
ALTER TABLE jobs ADD COLUMN ai_confidence FLOAT NULL AFTER ai_scam_labels;
ALTER TABLE jobs ADD COLUMN ai_provider VARCHAR(30) NULL AFTER ai_confidence;
ALTER TABLE jobs ADD COLUMN ai_explanation TEXT NULL AFTER ai_provider;

ALTER TABLE marketplace_items ADD COLUMN ai_scam_score FLOAT NULL AFTER matched_keywords;
ALTER TABLE marketplace_items ADD COLUMN ai_scam_labels JSON NULL AFTER ai_scam_score;
ALTER TABLE marketplace_items ADD COLUMN ai_confidence FLOAT NULL AFTER ai_scam_labels;
ALTER TABLE marketplace_items ADD COLUMN ai_provider VARCHAR(30) NULL AFTER ai_confidence;
ALTER TABLE marketplace_items ADD COLUMN ai_explanation TEXT NULL AFTER ai_provider;

CREATE TABLE IF NOT EXISTS scam_ai_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    target_type VARCHAR(20) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    content_hash VARCHAR(64) NULL,
    ai_provider VARCHAR(30) NULL,
    ai_score FLOAT NULL,
    ai_labels JSON NULL,
    ai_confidence FLOAT NULL,
    decision VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_scam_ai_target (target_type, target_id),
    INDEX idx_scam_ai_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
