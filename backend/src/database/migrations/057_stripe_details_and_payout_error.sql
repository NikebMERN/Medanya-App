-- Add stripe_details_submitted to users (for Connect onboarding status)
-- Add payout_error to orders (for failed transfer tracking)
ALTER TABLE users
  ADD COLUMN stripe_details_submitted TINYINT(1) NOT NULL DEFAULT 0 AFTER stripe_charges_enabled;

ALTER TABLE orders
  ADD COLUMN payout_error TEXT NULL AFTER payout_transfer_id;
