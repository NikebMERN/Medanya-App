-- auth_provider for Firebase (google, facebook, otp)
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NULL DEFAULT 'otp' AFTER firebase_uid;
