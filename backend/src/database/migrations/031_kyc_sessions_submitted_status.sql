-- Add SUBMITTED status for Veriff event webhook (user finished flow, waiting for decision)
ALTER TABLE kyc_sessions MODIFY COLUMN status ENUM('CREATED','STARTED','SUBMITTED','COMPLETED','VERIFIED','REJECTED','EXPIRED') NOT NULL DEFAULT 'CREATED';
