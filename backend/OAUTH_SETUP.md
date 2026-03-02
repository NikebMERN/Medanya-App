# Browser-Based OAuth (Google & Facebook)

The app uses a **browser-based OAuth flow**: the user opens a browser, signs in with Google/Facebook, and is redirected back to the app with a token.

## Backend base URL (auto or manual)

The OAuth callback URL is built from `API_BASE_URL`. In development:

- **Auto:** Running `npm start` from the mobile folder runs `update-api-url.js`, which detects your machine's local IP and writes it to both `mobile/.env` and `backend/.env` (as `API_BASE_URL`). This matches the Expo app behavior.
- **Manual:** Add `API_BASE_URL=http://192.168.x.x:4001` (or your production URL) to `backend/.env` if needed.

## Backend .env

Add these to `backend/.env`:

```env
# Google OAuth (server-side)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Facebook OAuth
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx
```

- **Google**: Use the **Web application** client ID and secret from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (same project as Firebase).
- **Facebook**: From [Facebook Developers](https://developers.facebook.com/) → Your App → Settings → Basic.

## Authorized redirect URIs

Add your backend callback URLs to the provider consoles:

- **Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Client IDs → Web client → Authorized redirect URIs:
  - `http://localhost:4001/api/auth/oauth/google/callback` (development)
  - `https://your-domain.com/api/auth/oauth/google/callback` (production)

- **Facebook** → Your App → Facebook Login → Settings → Valid OAuth Redirect URIs:
  - `http://localhost:4001/api/auth/oauth/facebook/callback` (development)
  - `https://your-domain.com/api/auth/oauth/facebook/callback` (production)

> For production, use HTTPS. For local testing, `http://localhost:4001` is typically allowed.
