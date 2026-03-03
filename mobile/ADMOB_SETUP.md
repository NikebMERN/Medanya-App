# AdMob Setup for Medanya

Real AdMob ads (no simulated/fake ads). Uses test IDs in `__DEV__`, real IDs in production.

## Requirements

- **AdMob does NOT work in Expo Go.** Use EAS dev client or production build.
- Build: `npm run build:dev` (or `build:dev:ios` / `build:dev:android`), then `npm run start:dev-client`
- **keytool** (for local Android keystore): Comes with Java JDK. Install [OpenJDK](https://adoptium.net/) if you see "keytool not found". EAS can generate keystores in the cloud if keytool is unavailable.

## Configuration

### App IDs (app.json)

Already in `app.json` plugins:
```json
["react-native-google-mobile-ads", {
  "androidAppId": "ca-app-pub-1717403054658770~9594579402",
  "iosAppId": "ca-app-pub-1717403054658770~7234011500"
}]
```

### Ad Unit IDs (.env)

- **`__DEV__`**: Google test IDs used automatically (AdMob policy)
- **Production**: Set real IDs in `mobile/.env`:

```
EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
# Or platform-specific:
# EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS=
# EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID=

# Optional: Banner, Interstitial
# EXPO_PUBLIC_ADMOB_BANNER_ID=
# EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID=
```

## Consent & ATT

- **iOS**: ATT prompt shown before loading ads (via `expo-tracking-transparency`)
- **GDPR/EEA**: `AdsConsent.loadAndShowConsentFormIfRequired()` runs before init

## Files

- `src/config/ads.config.js` — Dev vs prod ad unit IDs
- `src/services/ads.service.js` — Init, showRewardedAd, showInterstitialAd
- `src/store/ads.store.js` — Zustand `adsReady` flag
- `src/components/ads/` — AdBanner, useRewardedAd, useInterstitialAd
- `src/modules/gifts/hooks/useWatchAdEarn.js` — Earn Coins integration
