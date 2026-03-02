-- Delivery fee flow: seller proposes, buyer accepts/declines.
-- Cancel: store who cancelled and reason (seller must give reason).
ALTER TABLE orders
    ADD COLUMN delivery_fee_cents INT UNSIGNED NOT NULL DEFAULT 0 AFTER commission_cents,
    ADD COLUMN proposed_delivery_fee_cents INT UNSIGNED NULL AFTER delivery_fee_cents,
    ADD COLUMN proposed_delivery_fee_at TIMESTAMP NULL AFTER proposed_delivery_fee_cents,
    ADD COLUMN delivery_fee_accepted_at TIMESTAMP NULL AFTER proposed_delivery_fee_at,
    ADD COLUMN cancelled_by VARCHAR(16) NULL COMMENT 'buyer|seller' AFTER status,
    ADD COLUMN cancel_reason VARCHAR(64) NULL AFTER cancelled_by,
    ADD COLUMN cancel_reason_other TEXT NULL AFTER cancel_reason;
