# Provider KYC Setup (Veriff / Sumsub)

Production-ready KYC using **Veriff** (recommended) or Sumsub. Select provider via `KYC_PROVIDER=veriff` or `KYC_PROVIDER=sumsub`. For Veriff, copy `.env.veriff.example` into `.env` and fill credentials.

## 1. Run Migrations

```bash
cd backend
npm run tables
```

Adds: `users.kyc_provider`, `users.kyc_verified_at`, `users.kyc_last_reason`, `users.ban_level`, and `kyc_sessions` table.

## 2. Environment Variables

### Veriff

- `KYC_PROVIDER=veriff`
- `VERIFF_API_KEY` — from Veriff portal
- `VERIFF_SHARED_SECRET` — from Veriff portal
- `VERIFF_WEBHOOK_SECRET` — for webhook signature verification
- `VERIFF_CALLBACK_URL` (optional) — server-side callback
- `VERIFF_BASE_URL` (optional) — default `https://stationapi.veriff.com`

### Sumsub

- `KYC_PROVIDER=sumsub`
- `SUMSUB_APP_TOKEN` — from Sumsub dashboard
- `SUMSUB_SECRET_KEY` — from Sumsub dashboard
- `SUMSUB_WEBHOOK_SECRET` (optional) — falls back to SECRET_KEY
- `SUMSUB_BASE_URL` (optional) — default `https://api.sumsub.com`
- `SUMSUB_LEVEL_NAME` (optional) — default `basic-kyc-level`

## 3. Webhook URLs

Configure in provider dashboards:

- **Veriff**: `POST https://your-api.com/api/webhooks/veriff/decision`
- **Sumsub**: `POST https://your-api.com/api/webhooks/sumsub/applicantReviewed`

## 4. Mobile SDKs

```bash
cd mobile
npx expo install @veriff/react-native-sdk @sumsub/react-native-mobilesdk-module
```

For Sumsub, `npx expo prebuild` may be required (native module).

## 5. Flow

1. User taps "Start verification" in Profile → Identity Verification.
2. `POST /kyc/start` returns `{ provider, sessionUrl }` (Veriff) or `{ provider, accessToken, applicantId }` (Sumsub).
3. Mobile launches SDK; on completion, polls `GET /kyc/status` every 4s for up to 60s.
4. Webhooks update `users.kyc_status` and `kyc_sessions`.
5. Posting (jobs/marketplace) requires `kyc_status=verified` and `kyc_level>=2`.

## 6. Age Gates (verified users)

- **Jobs**: 18+
- **Marketplace, Video, Live stream**: 16+

## 7. Document Duplication

Both providers detect duplicate documents. On rejection with "duplicate document", the doc hash is added to `bans` (type `DOC_HASH`) to block reuse.
