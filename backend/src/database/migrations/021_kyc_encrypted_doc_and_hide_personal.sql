-- Store full document number encrypted (not just last4)
-- hide_personal_data: when 1, never show full_name/dob even if account is public (used after KYC data change)
ALTER TABLE kyc_submissions ADD COLUMN doc_number_encrypted TEXT NULL AFTER last4;
ALTER TABLE users ADD COLUMN hide_personal_data TINYINT(1) NOT NULL DEFAULT 0 AFTER account_private;
