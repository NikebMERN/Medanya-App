-- COD vs Stripe separation: COD fee handshake + delivery_fee_status
-- ACCEPTED_PENDING_FEE_CONFIRM = seller accepted and proposed fee, buyer must confirm/decline
ALTER TABLE orders
  ADD COLUMN delivery_fee_status ENUM('NONE','PROPOSED','CONFIRMED') NOT NULL DEFAULT 'NONE' AFTER delivery_fee_accepted_at;

ALTER TABLE orders
  MODIFY COLUMN status ENUM(
    'PENDING_PAYMENT',
    'AUTHORIZED',
    'COD_SELECTED',
    'SHIPPED',
    'DELIVERED_PENDING_CODE',
    'COMPLETED',
    'DISPUTED',
    'CANCELED',
    'EXPIRED',
    'PLACED',
    'ACCEPTED',
    'ACCEPTED_PENDING_FEE_CONFIRM',
    'PACKED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED'
  ) NOT NULL DEFAULT 'PENDING_PAYMENT';
