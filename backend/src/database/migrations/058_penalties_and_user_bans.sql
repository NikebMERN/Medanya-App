-- Penalties table: pay-to-unban fines
CREATE TABLE IF NOT EXISTS penalties (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    level TINYINT UNSIGNED NOT NULL DEFAULT 1,
    reason_code VARCHAR(32) NOT NULL,
    reason_text VARCHAR(500) NULL,
    evidence_refs JSON NULL,
    fine_amount_cents INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('UNPAID','PAID','WAIVED') NOT NULL DEFAULT 'UNPAID',
    ban_until DATETIME NULL,
    stripe_payment_intent_id VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_penalties_user (user_id),
    INDEX idx_penalties_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Extend users for penalty-linked bans
ALTER TABLE users ADD COLUMN ban_until DATETIME NULL AFTER banned_reason;
ALTER TABLE users ADD COLUMN active_penalty_id INT UNSIGNED NULL AFTER ban_until;
