-- Add neighborhood, bio, preferred_theme for profile and UI
ALTER TABLE users
  ADD COLUMN neighborhood VARCHAR(120) NULL AFTER avatar_url,
  ADD COLUMN bio VARCHAR(500) NULL AFTER neighborhood,
  ADD COLUMN preferred_theme VARCHAR(20) NOT NULL DEFAULT 'dark' AFTER bio;
