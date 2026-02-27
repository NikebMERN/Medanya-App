-- Device Fingerprinting: capture device_id and IP on login/register
CREATE TABLE IF NOT EXISTS user_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    device_id VARCHAR(128) NOT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_devices_user (user_id),
    INDEX idx_user_devices_device (device_id),
    INDEX idx_user_devices_ip (ip_address(45))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
