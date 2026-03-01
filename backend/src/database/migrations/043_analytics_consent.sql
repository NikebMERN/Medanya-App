-- Analytics consent for Level 2 anti-bot. Default true for backward compatibility.
ALTER TABLE users ADD COLUMN analytics_consent TINYINT(1) NOT NULL DEFAULT 1;
