-- KYC face verification: user must match document photo before posting jobs/trade
ALTER TABLE users ADD COLUMN kyc_face_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER kyc_level;
