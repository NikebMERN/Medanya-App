# Livestream Setup (Agora)

This guide fixes common livestream errors and explains how to enable video viewing on all platforms.

## Fix: "react-native-agora doesn't seem to be linked"

**Cause:** You're using Expo Go or the native app wasn't rebuilt after adding `react-native-agora`.

**Solution (iOS/Android):**

1. **Do not use Expo Go** — Agora requires native code. Use a **development build** instead.

2. **Build a dev client:**
   ```bash
   npx expo prebuild
   cd ios && pod install && cd ..
   npx expo run:ios
   # or for Android:
   npx expo run:android
   ```
   Or use EAS: `npx eas build --profile development --platform ios` (or `android`).

3. **Run with the dev client:**
   ```bash
   npm run start:dev-client
   ```
   Then open the built app (not Expo Go).

## Fix: "Requiring unknown module 1155" / importedAll of undefined

**Cause:** Metro bundler cache corruption, often after dependency changes.

**Solution:**

1. Clear caches and restart:
   ```bash
   npm run start:clean
   # or
   npx expo start --clear
   ```

2. If that fails, do a full clean:
   ```bash
   npm run clean
   rm -rf node_modules
   npm install
   npx expo start --clear
   ```

## Env requirements

Add to your `.env`:
```
EXPO_PUBLIC_AGORA_APP_ID=your_agora_app_id
```
Get it from [Agora Console](https://console.agora.io). The backend also needs `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE`.

## Platform support

| Platform | Host | Viewer |
|----------|------|--------|
| iOS      | Yes (dev build) | Yes (dev build) |
| Android  | Yes (dev build) | Yes (dev build) |
| Web      | No | Yes (Agora Web SDK) |

- **Native:** Requires dev build (not Expo Go), `pod install` for iOS, and `EXPO_PUBLIC_AGORA_APP_ID`.
- **Web:** Viewers can watch streams. Hosting on web is not supported.
