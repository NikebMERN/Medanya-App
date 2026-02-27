-- Provider KYC: users columns for Sumsub/Veriff flow
ALTER TABLE users ADD COLUMN kyc_provider VARCHAR(20) NULL AFTER kyc_level;
ALTER TABLE users ADD COLUMN kyc_verified_at TIMESTAMP NULL AFTER kyc_provider;
ALTER TABLE users ADD COLUMN kyc_last_reason VARCHAR(500) NULL AFTER kyc_verified_at;
ALTER TABLE users ADD COLUMN ban_level TINYINT(1) NOT NULL DEFAULT 0 AFTER banned_reason;
