-- Add neighborhood, bio, preferred_theme for profile and UI (one column per statement for idempotency)
ALTER TABLE users ADD COLUMN neighborhood VARCHAR(120) NULL AFTER avatar_url;
ALTER TABLE users ADD COLUMN bio VARCHAR(500) NULL AFTER neighborhood;
ALTER TABLE users ADD COLUMN preferred_theme VARCHAR(20) NOT NULL DEFAULT 'dark' AFTER bio;
