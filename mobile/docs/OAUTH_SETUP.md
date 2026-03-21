# OAuth (Google & Facebook Sign-In)

## Auth Flow Summary

| Platform | Google | Facebook |
|----------|--------|----------|
| **Web** | Firebase `signInWithPopup` only | Firebase `signInWithPopup` only |
| **Native (iOS/Android)** | `@react-native-google-signin` → idToken → Firebase credential → backend | `react-native-fbsdk-next` → accessToken → Firebase credential → backend |

- **Web**: Uses Firebase popup exclusively. No expo-auth-session for Google/Facebook.
- **Native**: Uses native SDKs exclusively. Requires EAS/dev build — **not Expo Go**.
- **Backend**: All flows exchange Firebase idToken for JWT via `POST /auth/firebase`.

---

## 1. Firebase Console

### Authentication → Sign-in method
- Enable **Google**
- Enable **Facebook** (add App ID and App Secret from Meta)

### Authentication → Settings → Authorized domains
Add every domain where the web app runs:
- `localhost` (for local dev)
- `medanya.app` (or your production domain)
- Any staging domain

Without these, web sign-in fails with "misconfigured" or "auth/argument-error".

---

## 2. Google Cloud / Firebase

### OAuth 2.0 Client IDs
Create in [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials:

1. **Web client** (required for Firebase credential exchange)
   - Type: Web application
   - Authorized JavaScript origins: `http://localhost:19006`, `https://medanya.app`
   - Use for: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

2. **Android client** (for native Android)
   - Type: Android
   - Package: `com.medanya.app`
   - SHA-1: Add your debug and release SHA-1 fingerprints

3. **iOS client** (for native iOS)
   - Type: iOS
   - Bundle ID: `com.medanya.app`

### Android SHA-1
```bash
# Debug (local dev)
cd android && ./gradlew signingReport

# Or from your keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android
```

Add SHA-1 to Firebase: Project Settings → Your apps → Android app → Add fingerprint.

---

## 3. Meta (Facebook) Developer Console

1. **Facebook Login** product enabled
2. **Settings → Basic**:
   - App ID → `EXPO_PUBLIC_FACEBOOK_APP_ID`
   - App Secret → add to Firebase Auth (Facebook provider)
   - Client Token (optional, for SDK) → add to app.json plugin if needed

3. **Facebook Login → Settings**:
   - Valid OAuth Redirect URIs: add `https://medanya.app` and `http://localhost:19006` for web
   - For native: Facebook SDK handles redirect; ensure app is configured

4. **Add platform**:
   - Android: package `com.medanya.app`, key hash (from debug/release keystore)
   - iOS: bundle ID `com.medanya.app`

5. **App mode**: Development or Live; add test users if in Development.

---

## 4. app.json

### Google Sign-In plugin
```json
[
  "@react-native-google-signin/google-signin",
  {
    "iosUrlScheme": "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID_REVERSED"
  }
]
```

`iosUrlScheme` must match `REVERSED_CLIENT_ID` from `GoogleService-Info.plist` (e.g. `com.googleusercontent.apps.12212015536-497i5237sf5bs7bmu2a94c80m4vvb7aa`).

### Facebook plugin
```json
[
  "react-native-fbsdk-next",
  {
    "appID": "YOUR_FACEBOOK_APP_ID",
    "clientToken": "YOUR_CLIENT_TOKEN",
    "displayName": "Medanya",
    "scheme": "fbYOUR_FACEBOOK_APP_ID"
  }
]
```

### Scheme
```json
"scheme": "medanya"
```

---

## 5. Environment Variables (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase config |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | e.g. `medanya-project.firebaseapp.com` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase config |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Yes (for social) | Web OAuth client ID (for idToken) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Optional | iOS client ID (from GoogleService-Info.plist) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Optional | Android client ID |
| `EXPO_PUBLIC_FACEBOOK_APP_ID` | Yes (for social) | Facebook App ID |
| `EXPO_PUBLIC_WEB_APP_URL` | Web only | `http://localhost:19006` or `https://medanya.app` |

---

## 6. Manual Verification Checklist

### Firebase Auth
- [ ] Google provider enabled
- [ ] Facebook provider enabled (App ID + App Secret)
- [ ] `localhost` in Authorized domains
- [ ] Production web domain in Authorized domains

### Google Cloud / Firebase
- [ ] Web client ID created and in `.env`
- [ ] Android client ID (package + SHA-1)
- [ ] iOS client ID (bundle ID)
- [ ] Android SHA-1 for debug and release added to Firebase

### Meta
- [ ] Facebook Login product enabled
- [ ] Android package `com.medanya.app` configured
- [ ] iOS bundle ID `com.medanya.app` configured
- [ ] Valid OAuth Redirect URIs for web domains
- [ ] App in Live mode or test users added for Development

### App
- [ ] `npx expo prebuild --clean` after plugin/config changes
- [ ] EAS/dev build for native auth (Expo Go does not support native modules)
- [ ] Rebuild native app after changing `app.json` plugins

---

## 7. Common Errors

### "Google sign-in is misconfigured"
- Add `localhost` and your web domain to Firebase Authorized domains
- Ensure Google provider is enabled in Firebase Auth

### "auth/argument-error" (Facebook on web)
- Add domain to Firebase Authorized domains
- Ensure Facebook provider is enabled with correct App ID and App Secret
- Check Meta app has correct redirect URIs

### Native: "not available" / no token
- Use EAS dev build or production build, not Expo Go
- Run `npx expo prebuild --clean` and rebuild
- Verify `@react-native-google-signin` and `react-native-fbsdk-next` plugins in app.json

### Facebook opens app/home instead of returning
- Do **not** use `LoginManager.setLoginBehavior("web_only")` — use default native flow
- Ensure Facebook app has correct package/bundle ID and key hash
