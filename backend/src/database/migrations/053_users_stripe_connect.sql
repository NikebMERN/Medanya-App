-- Stripe Connect Express: seller payouts to their bank only after delivery confirmation
ALTER TABLE users
  ADD COLUMN stripe_account_id VARCHAR(64) NULL AFTER updated_at,
  ADD COLUMN stripe_onboarding_status ENUM('NOT_STARTED','PENDING','COMPLETE') NOT NULL DEFAULT 'NOT_STARTED' AFTER stripe_account_id,
  ADD COLUMN stripe_payouts_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER stripe_onboarding_status,
  ADD COLUMN stripe_charges_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER stripe_payouts_enabled;

CREATE INDEX idx_users_stripe_account ON users(stripe_account_id);
