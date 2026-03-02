-- Wallet: balance_pending for escrow/ledger display (balance = available)
-- Run once; if column already exists, skip or use: ALTER TABLE wallets ADD COLUMN balance_pending INT NOT NULL DEFAULT 0 AFTER balance;
ALTER TABLE wallets
  ADD COLUMN balance_pending INT NOT NULL DEFAULT 0 AFTER balance;

-- Extend transaction types for escrow and payouts (include existing gift types)
ALTER TABLE transactions
  MODIFY COLUMN type ENUM(
    'credit',
    'debit',
    'earn',
    'commission',
    'gift_spend',
    'gift_earn',
    'gift_commission',
    'ESCROW_HELD',
    'SELLER_PAYOUT',
    'REFUND',
    'FEE',
    'COMMISSION',
    'order_sale',
    'order_commission',
    'stripe_topup'
  ) NOT NULL;
