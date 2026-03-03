# Creator Studio — Dev Build Instructions & Testing

## Overview

Creator Studio adds:
1. **TikTok-like Recording** — 15 min max, segmented, right tools, filter drawer
2. **Filters Pipeline** — Effects engine with pluggable providers (stub/DeepAR/Banuba)
3. **Upload Pipeline** — Cloudinary with progress, retry, signed upload option
4. **Agora Live** — Host + viewer screens, chat, moderation, marketing shop + pin
5. **SuperLike** — Earn (welcome, ads, referral), spend on videos/live; creator earnings

---

## Recording (Step 1)

- **Route**: Create → Shoot Short → RecordingScreen
- **Tech**: expo-camera (CameraView, recordAsync)
- **Max**: 15 min total; per-segment limits: 15s / 60s / 3m / 10m / 15m
- **Flow**: Tap to start/stop → segments stored → Next → VideoEdit → VideoPublish

### Required

- `app.json` plugins: `expo-camera` (camera + recordAudioAndroid)
- Permissions: Camera, Microphone

---

## Filters (Step 2)

- **Path**: `mobile/src/modules/effects/`
- **Engine**: `effects.engine.js` — `setBeauty`, `setLut`, `setArEffect`, `clearEffects`
- **Provider**: `providers/stub.provider.js` (placeholder)
- **UI**: FilterDrawer with tabs: Trending, Portrait, Cinematic, Fun/Game

### Add Real Effects

```js
import { setEffectsProvider } from './effects.engine';
import { getDeeparProvider } from './providers/deepar.provider';
setEffectsProvider(getDeeparProvider({ licenseKey: '...' }));
```

---

## Upload (Step 3)

- **Progress**: `uploadToCloudinaryWithProgress(uri, "video", onProgress)` in `env.js`
- **Retry**: 2 retries, 1.5s delay
- **Backend**: `POST /videos/upload/sign` (auth) returns Cloudinary signed params
- **Create**: `POST /videos` accepts tags, hashtags, language

### Compression (Optional)

For 15‑min videos, add client-side compression:
- `ffmpeg-kit-react-native` or `expo-video-manipulator`
- Target bitrate + max duration 15 min

---

## Agora Live (Step 4)

### Current state

- **Host screen**: Uses Agora when available (publishes video to channel). Fallback: expo-camera preview.
- **Viewer screen**: Uses Agora when available (receives host video). Fallback: placeholder.

### To enable full live streaming (host → viewers)

1. Install the Agora SDK:

```bash
cd mobile
npm install react-native-agora
npx pod-install  # iOS
```

2. Add to `.env`:

```env
EXPO_PUBLIC_AGORA_APP_ID=your_agora_app_id
```

3. Ensure backend `.env` has:

```env
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate
```

4. Rebuild the dev client (Expo Dev Client required for native modules):

```bash
npx expo prebuild
npx expo run:ios   # or run:android
```

Without Agora installed, the host sees expo-camera preview and viewers see a placeholder.

### Backend

- `POST /streams` — create stream
- `POST /streams/:id/token` — Agora token (broadcaster/audience)
- `POST /streams/:id/end` — host ends
- `POST /admin/streams/:id/end` — admin force end
- `PATCH /admin/streams/:id/ban` — ban stream
- Report threshold: 3 unique reporters in 24h → stream status `flagged`
- Socket: `stream:join`, `stream:leave`, `stream:chat:new`, `stream:viewerCount`, `live:pinUpdated`, `livestream_stop`

### Screens

- **LiveHostScreen** — expo-camera preview (host sees themselves). For real streaming to viewers: install `react-native-agora`.
- **LivePlayerScreen** — viewer placeholder. Needs react-native-agora for actual live video.

---

## Testing Checklist

- [ ] Recording: permissions, tap start/stop, segments, Next → VideoEdit
- [ ] Filter drawer opens, tabs work, filter selection updates store
- [ ] Upload: progress bar, retry on fail, create video with tags
- [ ] Live: create stream, get token, host/viewer screens load
- [ ] Live chat: stream:join, stream:chat:send, messages appear
- [ ] Marketing: shop icon visible, PinItemSheet opens
- [ ] Report: 3 reports → stream flagged, admin can end/ban
- [ ] Admin: POST /admin/streams/:id/end, PATCH /admin/streams/:id/ban

---

## SuperLike (Step 5)

### Backend
- Migration: `059_superlike_system.sql` — user_superlike_balance, superlike_tx, creator_monthly
- GET /superlikes/balance
- POST /superlikes/earn/welcome (one-time 5)
- POST /superlikes/earn/ad (1 per ad, daily limit 10)
- POST /superlikes/earn/referral (3 per referral, body: { referredUserId })
- POST /videos/:id/superlike
- POST /streams/:id/superlike
- GET /creators/earnings/monthly?month=YYYY-MM

### Mobile
- `api/superlike.api.js`, `store/superlike.store.js`
- Cannot send to own content
- Payout window 15 days (display rule)

---

## Analytics Events (Step 6)

Add to your analytics service:

- `record_start`, `record_stop`
- `upload_success`, `upload_fail`
- `live_start`, `live_end`
- `superlike_sent`
- `ad_reward_earned`
