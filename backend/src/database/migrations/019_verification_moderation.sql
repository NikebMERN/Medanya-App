-- Verification & Moderation: users full_name/dob, bans table, KYC submission fields
-- Run after 018_kyc_selfie.sql

-- Users: full name and date of birth (for KYC tier + age gate)
ALTER TABLE users ADD COLUMN full_name VARCHAR(120) NULL AFTER display_name;
ALTER TABLE users ADD COLUMN dob DATE NULL AFTER full_name;

-- Bans: USER | PHONE | DEVICE | DOC_HASH
CREATE TABLE IF NOT EXISTS bans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    value_hash VARCHAR(128) NOT NULL,
    reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unq_bans_type_hash (type, value_hash),
    KEY idx_bans_type (type),
    KEY idx_bans_value (value_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- KYC submissions: auto-verification fields and extended status
ALTER TABLE kyc_submissions ADD COLUMN full_name VARCHAR(120) NULL AFTER selfie_image_url;
ALTER TABLE kyc_submissions ADD COLUMN birthdate DATE NULL AFTER full_name;
ALTER TABLE kyc_submissions ADD COLUMN extracted_name VARCHAR(120) NULL AFTER birthdate;
ALTER TABLE kyc_submissions ADD COLUMN extracted_dob DATE NULL AFTER extracted_name;
ALTER TABLE kyc_submissions ADD COLUMN face_match_score DECIMAL(5,4) NULL AFTER extracted_dob;
ALTER TABLE kyc_submissions ADD COLUMN name_match_score DECIMAL(5,4) NULL AFTER face_match_score;
ALTER TABLE kyc_submissions ADD COLUMN doc_quality_ok TINYINT(1) NULL AFTER name_match_score;
ALTER TABLE kyc_submissions ADD COLUMN doc_hash_duplicate TINYINT(1) NOT NULL DEFAULT 0 AFTER doc_quality_ok;

-- Extend status: keep existing pending/approved/rejected; add new for auto flow
-- MySQL: modify enum to include new values (add one at a time if needed)
ALTER TABLE kyc_submissions MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'pending';
