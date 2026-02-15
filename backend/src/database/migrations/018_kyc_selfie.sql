-- KYC selfie for face match: store selfie image URL with submission
ALTER TABLE kyc_submissions ADD COLUMN selfie_image_url VARCHAR(600) NULL AFTER cloudinary_url_private;
