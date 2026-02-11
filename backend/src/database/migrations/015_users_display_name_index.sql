-- Speed up discover/search by display_name (LIKE queries in discover)
CREATE INDEX idx_users_display_name ON users(display_name);
