# AdMob Setup for Watch Ads (Earn Coins)

To enable the "Watch Ads" feature in Earn MedCoins, you need to configure Google AdMob.

## What You Need to Provide

### 1. **AdMob App ID (Android)**
- Format: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`
- From: [AdMob Console](https://admob.google.com) → Apps → Your app → App settings

### 2. **AdMob App ID (iOS)**
- Format: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`
- Same place in AdMob, create/link an iOS app if needed

### 3. **Rewarded Ad Unit ID** (one per platform or shared)
- Format: `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`
- From: AdMob → Apps → [Your app] → Ad units → Create ad unit → Rewarded

---

## Setup Steps

### Step 1: Create an AdMob account
1. Go to https://admob.google.com
2. Sign in with your Google account
3. Create a new app (or link existing Firebase app)

### Step 2: Create Ad Units
1. In AdMob, select your app (or create one for Android and one for iOS)
2. Click "Ad units" → "Add ad unit"
3. Choose **Rewarded**
4. Name it (e.g. "Earn Coins - Rewarded")
5. Copy the Ad unit ID (e.g. `ca-app-pub-1234567890123456/9876543210`)

### Step 3: Add to mobile app

**Option A: app.json** (for App IDs – required for native build)
Edit `mobile/app.json` and replace the test IDs in the plugin config:
```json
["react-native-google-mobile-ads", {
  "androidAppId": "ca-app-pub-YOUR_ANDROID_APP_ID",
  "iosAppId": "ca-app-pub-YOUR_IOS_APP_ID"
}]
```

**Option B: .env** (for Rewarded ad unit – used at runtime)
Add to `mobile/.env`:
```
EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
```

### Step 4: Rebuild the app
AdMob requires a native build. Run:
```bash
cd mobile
npx expo prebuild
npx expo run:ios   # or run:android
```

For EAS Build:
```bash
eas build --platform all
```

---

## Test IDs (Development)
The app uses Google's test ad unit IDs in development:
- App IDs in app.json: `ca-app-pub-3940256099942544~...` (Google test)
- Rewarded: `ca-app-pub-3940256099942544/5224354917`

Replace these with your real IDs before publishing to production.
