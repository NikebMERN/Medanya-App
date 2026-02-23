-- Add currency column to marketplace_items
ALTER TABLE marketplace_items ADD COLUMN currency VARCHAR(10) NULL DEFAULT 'AED' AFTER price;
