# Medanya Backend

- **Cloudinary (avatar uploads):** See [CLOUDINARY_SETUP.md](./CLOUDINARY_SETUP.md). Use **signed** upload: set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env`. No unsigned preset needed.
- **Migrations:** Run all migrations in `src/database/migrations/` in order. Migration `012_account_privacy_follow_requests.sql` is required for private accounts, follow requests, and last-known location. Migration `043_analytics_consent.sql` adds `analytics_consent` for Level 2 anti-bot.

## Analytics

- **Seed:** `npm run seed:analytics` (or `node scripts/seed_analytics.js [days] [users] [creators]`)
- **Dev endpoint:** `GET /api/analytics/dev/seed?days=30` (admin only, non-production)
- **Tests:** `npm run test:analytics`
