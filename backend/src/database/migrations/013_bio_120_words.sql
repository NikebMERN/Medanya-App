-- Allow bio up to 120 words (~800 chars)
ALTER TABLE users MODIFY COLUMN bio VARCHAR(800) NULL;
