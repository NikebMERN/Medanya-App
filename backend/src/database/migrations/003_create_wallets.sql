CREATE TABLE IF NOT EXISTS marketplace_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seller_id BIGINT UNSIGNED NOT NULL,

  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,

  price DECIMAL(12,2) NOT NULL,
  category VARCHAR(60) NOT NULL,
  location VARCHAR(120) NOT NULL,

  image_urls JSON NULL,

  status ENUM('active','sold','removed') NOT NULL DEFAULT 'active',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_market_category (category),
  INDEX idx_market_location (location),
  INDEX idx_market_status (status),
  INDEX idx_market_created_at (created_at),
  INDEX idx_market_seller (seller_id),

  FULLTEXT INDEX ftx_market_title_desc (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
