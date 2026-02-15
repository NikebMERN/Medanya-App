-- Fraud prevention: OTP, KYC, rate limits, risk scoring
-- Users: OTP verified, KYC status, safety acknowledgment
ALTER TABLE users ADD COLUMN otp_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER is_verified;
ALTER TABLE users ADD COLUMN kyc_status VARCHAR(20) NOT NULL DEFAULT 'none' AFTER otp_verified;
ALTER TABLE users ADD COLUMN kyc_level TINYINT(1) NOT NULL DEFAULT 0 AFTER kyc_status;
ALTER TABLE users ADD COLUMN safety_acknowledged_at TIMESTAMP NULL AFTER kyc_level;

-- Jobs: risk score, keywords, reports count, extended status
ALTER TABLE jobs ADD COLUMN risk_score INT NULL AFTER image_url;
ALTER TABLE jobs ADD COLUMN matched_keywords JSON NULL AFTER risk_score;
ALTER TABLE jobs ADD COLUMN reports_count INT NOT NULL DEFAULT 0 AFTER matched_keywords;
ALTER TABLE jobs ADD COLUMN edit_count_24h INT NOT NULL DEFAULT 0 AFTER reports_count;
ALTER TABLE jobs ADD COLUMN last_edit_at TIMESTAMP NULL AFTER edit_count_24h;
ALTER TABLE jobs MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'active';

-- marketplace_items: same
ALTER TABLE marketplace_items ADD COLUMN risk_score INT NULL AFTER image_urls;
ALTER TABLE marketplace_items ADD COLUMN matched_keywords JSON NULL AFTER risk_score;
ALTER TABLE marketplace_items ADD COLUMN reports_count INT NOT NULL DEFAULT 0 AFTER matched_keywords;
ALTER TABLE marketplace_items ADD COLUMN edit_count_24h INT NOT NULL DEFAULT 0 AFTER reports_count;
ALTER TABLE marketplace_items ADD COLUMN last_edit_at TIMESTAMP NULL AFTER edit_count_24h;
ALTER TABLE marketplace_items MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'active';

-- KYC submissions
CREATE TABLE IF NOT EXISTS kyc_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    doc_type ENUM('passport','fayda','resident_id','other') NOT NULL,
    doc_hash VARCHAR(128) NULL,
    last4 VARCHAR(10) NULL,
    cloudinary_url_private VARCHAR(600) NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by BIGINT UNSIGNED NULL,
    reviewed_at TIMESTAMP NULL,
    reject_reason VARCHAR(255) NULL,
    retention_delete_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_kyc_user (user_id),
    KEY idx_kyc_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Posting rate counters (jobs per day, marketplace per day) - use existing created_at for counting
-- No extra table needed; we count from jobs/marketplace_items by created_at
