# Medanya Backend

- **Cloudinary (avatar uploads):** See [CLOUDINARY_SETUP.md](./CLOUDINARY_SETUP.md). Use **signed** upload: set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env`. No unsigned preset needed.
- **Migrations:** Run all migrations in `src/database/migrations/` in order. Migration `012_account_privacy_follow_requests.sql` is required for private accounts, follow requests, and last-known location.
