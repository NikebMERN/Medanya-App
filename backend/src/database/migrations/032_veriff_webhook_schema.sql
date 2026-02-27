-- veriff_webhook_events: add kind and payload_raw for raw body storage
ALTER TABLE veriff_webhook_events ADD COLUMN kind VARCHAR(16) NULL AFTER id;
ALTER TABLE veriff_webhook_events ADD COLUMN payload_raw LONGTEXT NULL AFTER headers_json;
