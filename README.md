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

- In `mobile/.env` set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_FACEBOOK_APP_ID`.
- In Google Cloud and Facebook App settings, add the redirect URI (e.g. `exp://YOUR_IP:8081`) to the allowed list.

### 5. Profile avatar (Cloudinary)

- **Optional.** If you add to `backend/.env`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (from [Cloudinary Console](https://console.cloudinary.com)), avatar uploads are stored in Cloudinary. If these are not set, the backend still accepts uploads and saves a placeholder avatar URL so the app works.

### 6. “Use my location” (Profile Creation)

- In `mobile`, run: `npx expo install expo-location`. If you see “Cannot find module” for location, install this package and restart the app.
