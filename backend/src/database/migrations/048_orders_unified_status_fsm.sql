-- Unified order FSM: PLACED -> ACCEPTED -> PACKED -> OUT_FOR_DELIVERY -> DELIVERED -> COMPLETED
-- Plus terminal: CANCELLED, REFUNDED, DISPUTED
-- Add new statuses (keep existing for backward compatibility during transition)
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
    'PACKED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED'
  ) NOT NULL DEFAULT 'PENDING_PAYMENT';

-- Optional: item_price_cents and platform_fee for clarity (we have total_cents and commission_cents)
-- listing_id is used as item_id in API responses where needed
