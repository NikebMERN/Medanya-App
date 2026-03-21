# OAuth (Google & Facebook sign-in)

## Platform summary

| Platform | Flow | Redirect URI |
|----------|------|--------------|
| **Web** | Firebase `signInWithPopup` | App homepage: `https://medanya.app` or `http://localhost:19006` |
| **Native (iOS/Android)** | Native SDKs or expo-auth-session | Expo proxy or `medanya://redirect` |

**Firebase Authorized domains** must include every domain where the app runs (fixes "misconfigured" on web).

---

## 0. Firebase Authorized domains (required for web)

**Fixes:** "Google sign-in is misconfigured", "auth/argument-error"

1. [Firebase Console](https://console.firebase.google.com) → your project → **Authentication** → **Settings** (gear) → **Authorized domains**
2. Add:
   - `localhost` (for local dev)
   - `medanya.app` (production)
   - Any other domain where you host the web app
3. Save. Without these, web sign-in will fail with "misconfigured".

---

## Web: Redirect URI

Set `EXPO_PUBLIC_WEB_APP_URL` in `.env`:
- **Dev:** `http://localhost:19006`
- **Prod:** `https://medanya.app`

Add this exact URL to:
- **Google Cloud Console** → OAuth client → Authorized redirect URIs
- **Facebook** → Facebook Login → Valid OAuth Redirect URIs

---

## 1. App scheme

In `app.json`:

```json
{
  "expo": {
    "scheme": "medanya"
  }
}
```

If you change the scheme, restart with:

```bash
npx expo start -c
```

---

## 2. Google OAuth 2.0 (Cloud Console)

### Create OAuth credentials

1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Select your project (or create one).
3. Go to **APIs & Services** → **Credentials**.
4. Click **Create Credentials** → **OAuth client ID**.
5. If prompted, configure the **OAuth consent screen**:
   - User type: **External** (or Internal for workspace-only).
   - App name, support email, developer contact.
   - Scopes: add `email`, `profile`, `openid` (or leave defaults).
6. Application type: **Web application** (use Web client ID for Expo).
7. Name: e.g. "Medanya Web Client".
8. Under **Authorized redirect URIs**, add:
   - **Native:** `medanya://redirect`, `https://auth.expo.io/@nikeb/medanya` (Expo proxy)
   - **Web:** `http://localhost:19006`, `https://medanya.app`, `https://medanya-project.firebaseapp.com/__/auth/handler` (Firebase popup)
9. Click **Create**. Copy the **Client ID** for `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
10. Save. Wait a minute for changes to propagate.

### Optional: iOS/Android client IDs

- For iOS: Create an **iOS** OAuth client, use the bundle ID from `app.json`. Add the Client ID to `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
- For Android: Create an **Android** OAuth client, use the package name and SHA-1. Add the Client ID to `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.
- If omitted, the Web client ID is used as fallback.

### Common errors

- **redirect_uri_mismatch**: The URI in the request must match **exactly** what you added (no trailing slash, correct scheme and path).
- Do **not** add only `https://...firebaseapp.com/__/auth/handler` — that causes "missing initial state".

---

## 3. Facebook

### App Domains

1. [Facebook Developers](https://developers.facebook.com) → your app → **Settings** → **Basic**.
2. **App Domains:** add `auth.expo.io` if you use the Expo proxy for something else; for native-only flow you may not need it. Keep it if you use web or proxy anywhere.

### Valid OAuth Redirect URIs

1. **Facebook Login** → **Settings**.
2. Under **Valid OAuth Redirect URIs**:
   - **Remove** `https://...firebaseapp.com/__/auth/handler` if present (it causes "missing initial state").
   - **Add** the exact redirect URI shown in the app console on the landing screen (e.g. `medanya://redirect` or `exp://.../--/redirect` in Expo Go). Use the same value you added in Google.
3. Save.

---

## 4. Facebook: Redirects to Facebook app (FYP) instead of returning to Medanya

On Android, the app uses `web_only` login so the in-app browser is used instead of opening the Facebook app. If you still land on the Facebook feed:
- Ensure you have the latest build (the `web_only` fix is in `nativeFacebookSignIn.js`).
- In Facebook App → Facebook Login → Settings → Valid OAuth Redirect URIs: add your app’s redirect URI (Expo proxy or scheme) exactly as shown in the console.
- Clear the Facebook app’s data/cache or try on a device where the Facebook app is not installed.

---

## 5. Facebook: "Invalid Scopes: email"

The app requests only **public_profile** (no `email`) so Login works without App Review. If you need email, add the **email** permission in the Facebook app and then you can add `email` to the requested scopes in code.

---

## 6. "Unable to process request due to missing initial state"

### Root cause

The OAuth provider (Google/Facebook) redirects the user back to the **redirect URI** you configured. If that URI is the Firebase auth handler (`https://...firebaseapp.com/__/auth/handler`), the user lands on a **web page** that:

1. **Stores OAuth state in `sessionStorage`** before sending the user to the IdP.
2. On redirect back, **reads that state from `sessionStorage`** to validate the response.

On mobile (and in many web environments), that state is missing because:

- **Different storage context:** The in-app browser or system browser that completes the redirect often does not share `sessionStorage` with the tab/context that started the flow, or the handler runs in a new/different session.
- **Storage cleared or blocked:** Private mode, storage partitioning, or third-party cookie/storage restrictions can clear or block `sessionStorage` across the redirect.
- **No shared session:** With scheme-based redirects, the app receives the callback directly; with a web handler URL, a web page receives it and relies on browser storage that may be inaccessible.

So the handler page cannot find the initial state it stored → "Unable to process request due to missing initial state".

### Why the fix works

The app now **never** uses the Firebase auth handler as the redirect URI for this flow. It always uses the **scheme-based** URI (e.g. `medanya://redirect`). That way:

1. The user is sent to Google/Facebook with `redirect_uri=medanya://redirect` (or your scheme).
2. After login, the IdP redirects to `medanya://redirect?...`, which **opens the app** (or Expo Go).
3. **expo-auth-session** completes the flow inside the app using its own state (no `sessionStorage`). No web page is involved in the callback, so no missing state.

If `EXPO_PUBLIC_OAUTH_REDIRECT_URI` or `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` would produce the Firebase handler URL, the code automatically falls back to the scheme-based URI and logs a dev warning.

### What to do

1. **Do not use** `https://...firebaseapp.com/__/auth/handler` as the redirect URI. Remove it from Google and Facebook if present.
2. Use only the **scheme-based** redirect URI printed in the app console (e.g. `medanya://redirect` or `exp://.../--/redirect`). Add that exact URI in both Google and Facebook.
3. Ensure `app.json` has `"scheme": "medanya"` and you restarted with `npx expo start -c` after any scheme change.
4. `WebBrowser.maybeCompleteAuthSession()` is already called in `firebaseAuth.js`.

---

## 7. Env

In `.env` (or app config):

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` – Google OAuth client ID (Web client is fine for Expo when using one ID for all).
- `EXPO_PUBLIC_FACEBOOK_APP_ID` – Facebook App ID.
- `EXPO_PUBLIC_WEB_APP_URL` – Web app homepage, used as OAuth redirect on web (e.g. `https://medanya.app` or `http://localhost:19006`). Add this in Google, Facebook, and Firebase Authorized domains.

Optional: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` for native builds.

**useProxy:** The app calls `promptAsync({ useProxy: false })` (custom dev client / EAS build). If you use **Expo Go** and redirect fails, try `useProxy: true` in the Google/Facebook prompt calls in `LandingScreen.js`.
