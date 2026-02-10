# OAuth (Google & Facebook sign-in) – Native flow

The app uses **expo-auth-session** and a **scheme-based redirect** so the browser returns to the app. **Do not use the Firebase auth handler URL** (`https://...firebaseapp.com/__/auth/handler`) as the redirect — that page uses sessionStorage and causes **"Unable to process request due to missing initial state"** in mobile.

- **Google:** `useIdTokenAuthRequest` → we get `id_token` → `signInWithCredential(auth, GoogleAuthProvider.credential(id_token))`.
- **Facebook:** `useAuthRequest` → we get `access_token` → `signInWithCredential(auth, OAuthProvider.credential({ accessToken }))`.

**Redirect URI:** The app uses a single redirect URI from `getAppRedirectUri()` (scheme from `app.json`, e.g. `medanya://redirect` or in Expo Go something like `exp://.../--/redirect`). This is printed in the console on the landing screen. Add **that exact URI** in both Google and Facebook; remove the Firebase handler URL if you had added it.

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

## 2. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**.
2. Open your **OAuth 2.0 Client ID** (Web or iOS/Android as you use).
3. Under **Authorized redirect URIs** add the redirect URI the app actually uses:
   - **Development build / standalone:** `<applicationId>:/oauthredirect`  
     Example: `com.medanya.mobile:/oauthredirect` (use your app’s `Application.applicationId` from `expo-application`).
   - **Expo Go:** The redirect is an `exp://...` URL (e.g. `exp://192.168.1.1:8081/--/redirect`). It can change (IP/port). Use the exact URI printed in the app console and add it in the console.
4. Save. Wait a minute and try again.

If you see **redirect_uri_mismatch**, the URI in the request must match **exactly** what you added (no trailing slash, correct scheme and path).

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

## 4. Facebook: "Invalid Scopes: email"

The app requests only **public_profile** (no `email`) so Login works without App Review. If you need email, add the **email** permission in the Facebook app and then you can add `email` to the requested scopes in code.

---

## 5. "Unable to process request due to missing initial state"

This happens when the redirect goes to a **web page** that uses sessionStorage (e.g. the Firebase auth handler). Fix it by:

1. **Do not use** `https://...firebaseapp.com/__/auth/handler` as the redirect URI. Remove it from Google and Facebook if present.
2. Use only the **scheme-based** redirect URI printed in the app console (e.g. `medanya://redirect` or `exp://.../--/redirect`). Add that exact URI in both Google and Facebook.
3. Ensure `app.json` has `"scheme": "medanya"` and you restarted with `npx expo start -c` after any scheme change.
4. `WebBrowser.maybeCompleteAuthSession()` is already called in `firebaseAuth.js`.

---

## 6. Env

In `.env` (or app config):

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` – Google OAuth client ID (Web client is fine for Expo when using one ID for all).
- `EXPO_PUBLIC_FACEBOOK_APP_ID` – Facebook App ID.

Optional: separate `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (and Facebook equivalents) if you create platform-specific OAuth clients; otherwise the app uses the web client ID for all platforms.
