-- Add columns for decision pull debugging
ALTER TABLE kyc_sessions ADD COLUMN last_decision_poll_at TIMESTAMP NULL;
ALTER TABLE kyc_sessions ADD COLUMN last_decision_poll_result JSON NULL;
