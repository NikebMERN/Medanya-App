-- KYC sessions for provider (Sumsub/Veriff) flow
CREATE TABLE IF NOT EXISTS kyc_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    provider ENUM('SUMSUB','VERIFF') NOT NULL,
    provider_applicant_id VARCHAR(128) NULL,
    provider_session_id VARCHAR(128) NULL,
    provider_external_id VARCHAR(128) NULL,
    session_url VARCHAR(512) NULL,
    status ENUM('CREATED','STARTED','COMPLETED','VERIFIED','REJECTED','EXPIRED') NOT NULL DEFAULT 'CREATED',
    reject_labels JSON NULL,
    reject_reason_summary VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_kyc_sessions_user (user_id),
    INDEX idx_kyc_sessions_provider (provider),
    INDEX idx_kyc_sessions_status (status),
    INDEX idx_kyc_sessions_provider_applicant (provider_applicant_id),
    INDEX idx_kyc_sessions_provider_session (provider_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
