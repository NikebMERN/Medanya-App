-- Store encrypted delivery code for getDeliveryCode API
ALTER TABLE orders ADD COLUMN delivery_code_encrypted VARCHAR(255) NULL AFTER delivery_code_sent_at;
