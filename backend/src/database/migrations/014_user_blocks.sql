-- User blocks (blacklist)
CREATE TABLE IF NOT EXISTS user_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blocker_id VARCHAR(36) NOT NULL,
    blocked_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_blocker_blocked (blocker_id, blocked_id),
    KEY idx_blocker (blocker_id),
    KEY idx_blocked (blocked_id)
);
