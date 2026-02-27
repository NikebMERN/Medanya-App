-- Add created_by to bans (for audit; 019 created table without it, 025 CREATE IF NOT EXISTS doesn't alter)
ALTER TABLE bans ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER reason;
