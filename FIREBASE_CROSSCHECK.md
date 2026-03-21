# Firebase Configuration Cross-Check: Backend vs Frontend

**Date:** 2025-03-21

## Summary

| Field | Backend | Mobile (env / appConfig) | google-services.json | GoogleService-Info.plist |
|-------|---------|--------------------------|----------------------|--------------------------|
| **Project ID** | `medanya-project` ✓ | `medanya-project` ✓ | `medanya-project` ✓ | `medanya-project` ✓ |
| **Storage Bucket** | — | `medanya-project.firebasestorage.app` ✓ | `medanya-project.firebasestorage.app` ✓ | `medanya-project.firebasestorage.app` ✓ |
| **Auth Domain** | — | `medanya-project.firebaseapp.com` ✓ | — | — |
| **Messaging Sender ID** | — | `12212015536` ✓ | `12212015536` (project_number) ✓ | `12212015536` ✓ |
| **Web API Key** | `FIREBASE_WEB_API_KEY` ✓ | `EXPO_PUBLIC_FIREBASE_API_KEY` ✓ | — | — |
| **API Key (platform)** | — | Web: `AIzaSyBlGukmB7x...` | Android: `AIzaSyAxsudgNOJ...` | iOS: `AIzaSyBjfLC4YBC...` |

All core project-level identifiers match across backend and frontend.

---

## Detailed Comparison

### 1. Project ID
- **Backend** `.env`: `FIREBASE_PROJECT_ID=medanya-project`
- **Backend** service account JSON: `project_id: "medanya-project"`
- **Mobile** `.env`: `EXPO_PUBLIC_FIREBASE_PROJECT_ID=medanya-project`
- **google-services.json**: `project_id: "medanya-project"`
- **GoogleService-Info.plist**: `PROJECT_ID: medanya-project`
- ✅ **Match**

### 2. Web API Key (used for Firebase Auth JS SDK and backend phone auth)
- **Backend** `.env`: `FIREBASE_WEB_API_KEY=AIzaSyBlGukmB7x_rzqXLola3LRz4tjtKQovwOs`
- **Mobile** `.env**: `EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyBlGukmB7x_rzqXLola3LRz4tjtKQovwOs`
- ✅ **Match**

### 3. Platform API Keys (Firebase creates different keys per platform)
- **Web/JS SDK** (mobile auth): `AIzaSyBlGukmB7x_rzqXLola3LRz4tjtKQovwOs`
- **Android** (google-services.json): `AIzaSyAxsudgNOJwa8ef4SpBrTTAh0x13YlzIso`
- **iOS** (GoogleService-Info.plist): `AIzaSyBjfLC4YBCPo-YP32G3chQRW8O7IKNRbPU`
- ✅ **Expected** — each platform has its own key in the same project.

### 4. App IDs (platform-specific)
- **Mobile** `.env` (web app for JS SDK): `1:12212015536:web:4303982297372e59888675`
- **google-services.json** (Android): `1:12212015536:android:3a71e22c48cd04c3888675`
- **GoogleService-Info.plist** (iOS): `1:12212015536:ios:5e2700bf1ec410f5888675`
- ✅ **Expected** — JS SDK uses web app ID; native SDKs use their own.

### 5. Service Account (backend only)
- **Backend** `.env**: `FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@medanya-project.iam.gserviceaccount.com`
- **Service account JSON**: `client_email: "firebase-adminsdk-fbsvc@medanya-project.iam.gserviceaccount.com"`
- **Backend** `auth.service.js` uses `config/firebase.js` (JSON file)
- **Backend** `notifications/providers/firebase.js` uses env vars
- ✅ **Match**

### 6. Storage Bucket
- **Mobile** `.env`: `medanya-project.firebasestorage.app`
- **google-services.json**: `medanya-project.firebasestorage.app`
- **GoogleService-Info.plist**: `medanya-project.firebasestorage.app`
- ✅ **Match**

### 7. Google OAuth Client IDs (for sign-in)
- **Web client**: `12212015536-jkd02r826k6f59eqm68j0ql2d0445jcq.apps.googleusercontent.com` — matches mobile .env and google-services.json oauth_client type 3
- **Android client**: `12212015536-20jj5i9t7g0h66g2nfn1tfbuknenga5o.apps.googleusercontent.com` — matches mobile .env and google-services.json
- **iOS client**: `12212015536-497i5237sf5bs7bmu2a94c80m4vvb7aa.apps.googleusercontent.com` — matches mobile .env and GoogleService-Info.plist
- ✅ **Match**

---

## Notes

1. **FIREBASE_AUTH_EMULATOR_HOST** is set in backend `.env` (`127.0.0.1:9099`). When the emulator is running, the backend will verify tokens against it. Ensure the mobile app does not target the emulator unless you intend to test locally.
2. **Firebase Admin init**: Auth uses `config/firebase.js` (JSON file); notifications use env vars but reuse the existing app if `config/firebase` already initialized.
3. All identifiers relevant to token verification and FCM are aligned; idTokens from web/Android/iOS will verify correctly against the backend.
