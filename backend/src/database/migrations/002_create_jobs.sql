CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_by BIGINT UNSIGNED NOT NULL,

  title VARCHAR(120) NOT NULL,
  category VARCHAR(60) NOT NULL,
  salary VARCHAR(60) NULL,
  location VARCHAR(120) NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  image_url VARCHAR(500) NULL,

  status ENUM('active','closed') NOT NULL DEFAULT 'active',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_jobs_category (category),
  INDEX idx_jobs_location (location),
  INDEX idx_jobs_status (status),
  INDEX idx_jobs_created_by (created_by),
  FULLTEXT INDEX ftx_jobs_title_location (title, location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
