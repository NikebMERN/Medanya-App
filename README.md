# Medanya App

## How to run the project

### 1. Backend

```bash
cd backend
npm install
# Add .env (copy from backend docs or existing .env with DB, Redis, Firebase, JWT, etc.)
npm start
```

Backend runs at `http://localhost:4001` (or the port in your `.env`). API base is `http://localhost:4001/api`.

### 2. Mobile (Expo)

```bash
cd mobile
npm install
# Add mobile/.env with EXPO_PUBLIC_* vars (see .env.example)
npx expo start
```

- Press `a` for Android or `i` for iOS, or scan the QR code with Expo Go.
- **On a physical device:** set `EXPO_PUBLIC_API_URL` in `mobile/.env` to your PC’s LAN IP (e.g. `http://192.168.0.101:4001`) so the app can reach the backend.

### 3. Phone OTP (Firebase)

- Firebase Phone Auth is used for SMS OTP. The backend needs `FIREBASE_WEB_API_KEY` in `backend/.env`.
- If you see “recaptchaToken is required”, add your number as a **test phone number** in [Firebase Console](https://console.firebase.google.com) → Authentication → Sign-in method → Phone → **Phone numbers for testing**, then use the code you set there. Or sign in with **Google** or **Facebook**.

### 4. Google / Facebook sign-in

1. **Google Cloud Console** — create OAuth 2.0 client IDs:
   - **Web client** (for Expo Go + dev builds): Add redirect URI `https://auth.expo.io/@YOUR_EXPO_USERNAME/medanya` (replace with your Expo username and app slug). Use this client’s ID for `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID`.
   - **Android client** (for dev/prod builds): Create an Android OAuth client, add your app’s SHA-1 fingerprint (from `cd android && ./gradlew signingReport`), and use its ID for `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.
   - **iOS client** (for dev/prod builds): Create an iOS OAuth client with bundle ID `com.medanya.app` and use its ID for `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.

2. **mobile/.env** — set:
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — Web OAuth client ID.
   - `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID` — Same or separate Web client for Expo Go (proxy). Fallback: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — iOS client (optional; defaults to web client).
   - `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` — Android client (optional; defaults to web client).
   - `EXPO_PUBLIC_FACEBOOK_APP_ID` — Facebook App ID.

3. **Redirect URIs**:
   - **Expo Go**: `https://auth.expo.io/@username/slug` — add to Google and Facebook allowed redirect URIs.
   - **Dev/Prod build**: `medanya://redirect` — add to Google and Facebook allowed redirect URIs.

### 5. Profile avatar (Cloudinary)

- **Optional.** If you add to `backend/.env`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (from [Cloudinary Console](https://console.cloudinary.com)), avatar uploads are stored in Cloudinary. If these are not set, the backend still accepts uploads and saves a placeholder avatar URL so the app works.

### 6. “Use my location” (Profile Creation)

- In `mobile`, run: `npx expo install expo-location`. If you see “Cannot find module” for location, install this package and restart the app.

### 7. AdMob (Watch Ads / Earn Coins)

AdMob does **not** work in Expo Go — it requires a development or production build with native code.

#### Testing ads (development build)

1. Build a development client: `eas build --profile development --platform ios` (or `android`)
2. Install the built app on your device/simulator
3. Run: `npx expo start --dev-client`
4. In `__DEV__`, Google test ad IDs are used automatically (AdMob policy)
5. Set `EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID` in `.env` for production

#### Production deployment

- Add real ad unit IDs to `mobile/.env`; ads use real IDs only when `!__DEV__`
- Build: `eas build --profile production --platform all`

#### Consent & ATT

- **iOS**: ATT prompt before loading ads (via `expo-tracking-transparency`)
- **GDPR/EEA**: Consent form shown when required via `AdsConsent`
