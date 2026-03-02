/**
 * OAuth web flow — user signs in via browser, redirects back to app with token.
 * Flow: App opens backend URL → Browser → Google/Facebook → Callback → Redirect to app with token.
 */
const { URL } = require("url");

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const FACEBOOK_AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth";
const FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token";

function getBaseUrl(req) {
    // Use API_BASE_URL when set (e.g. by mobile update-api-url script) — same auto-detected IP as Expo app
    const fromEnv = process.env.API_BASE_URL?.trim().replace(/\/+$/, "");
    if (fromEnv) return fromEnv;
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:4001";
    return `${proto}://${host}`;
}

/**
 * GET /auth/oauth/google?redirect=medanya://auth
 * Redirects user to Google OAuth. Callback will send token to redirect URL.
 */
async function googleRedirect(req, res) {
    const redirect = req.query.redirect || "medanya://auth";
    const baseUrl = getBaseUrl(req);
    const callbackUrl = `${baseUrl}/api/auth/oauth/google/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_WEB_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({ error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID." });
    }
    const state = Buffer.from(JSON.stringify({ redirect })).toString("base64url");
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        response_type: "code",
        scope: "openid profile email",
        state,
        access_type: "offline",
        prompt: "consent",
    });
    res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}

/**
 * GET /auth/oauth/google/callback?code=...&state=...
 * Exchanges code for id_token, redirects to app with token.
 */
async function googleCallback(req, res) {
    const { code, state, error } = req.query;
    let redirect = "medanya://auth";
    try {
        const stateObj = state ? JSON.parse(Buffer.from(state, "base64url").toString()) : {};
        redirect = stateObj.redirect || redirect;
    } catch (_) {}

    if (error) {
        const errMsg = encodeURIComponent(error === "access_denied" ? "Sign-in cancelled" : error);
        return res.redirect(`${redirect}?error=${errMsg}`);
    }
    if (!code) {
        return res.redirect(`${redirect}?error=${encodeURIComponent("Missing authorization code")}`);
    }

    const baseUrl = getBaseUrl(req);
    const callbackUrl = `${baseUrl}/api/auth/oauth/google/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_WEB_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.redirect(`${redirect}?error=${encodeURIComponent("Google OAuth not configured")}`);
    }

    try {
        const body = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: callbackUrl,
        });

        const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
        });

        const data = await tokenRes.json();
        const idToken = data.id_token;
        if (!idToken) {
            const err = data.error_description || data.error || "No id_token in response";
            return res.redirect(`${redirect}?error=${encodeURIComponent(err)}`);
        }

        const sep = redirect.includes("?") ? "&" : "?";
        return res.redirect(`${redirect}${sep}token=${encodeURIComponent(idToken)}&provider=google`);
    } catch (err) {
        return res.redirect(`${redirect}?error=${encodeURIComponent(err.message || "Token exchange failed")}`);
    }
}

/**
 * GET /auth/oauth/facebook?redirect=medanya://auth
 */
async function facebookRedirect(req, res) {
    const redirect = req.query.redirect || "medanya://auth";
    const baseUrl = getBaseUrl(req);
    const callbackUrl = `${baseUrl}/api/auth/oauth/facebook/callback`;
    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) {
        return res.status(500).json({ error: "Facebook OAuth not configured. Set FACEBOOK_APP_ID." });
    }
    const state = Buffer.from(JSON.stringify({ redirect })).toString("base64url");
    const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: callbackUrl,
        response_type: "code",
        scope: "public_profile,email",
        state,
    });
    res.redirect(`${FACEBOOK_AUTH_URL}?${params.toString()}`);
}

/**
 * GET /auth/oauth/facebook/callback?code=...&state=...
 * Exchanges code for access_token. App will use signInWithFacebookCredential(accessToken).
 */
async function facebookCallback(req, res) {
    const { code, state, error } = req.query;
    let redirect = "medanya://auth";
    try {
        const stateObj = state ? JSON.parse(Buffer.from(state, "base64url").toString()) : {};
        redirect = stateObj.redirect || redirect;
    } catch (_) {}

    if (error) {
        const errMsg = encodeURIComponent(error === "access_denied" ? "Sign-in cancelled" : error);
        return res.redirect(`${redirect}?error=${errMsg}`);
    }
    if (!code) {
        return res.redirect(`${redirect}?error=${encodeURIComponent("Missing authorization code")}`);
    }

    const baseUrl = getBaseUrl(req);
    const callbackUrl = `${baseUrl}/api/auth/oauth/facebook/callback`;
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
        return res.redirect(`${redirect}?error=${encodeURIComponent("Facebook OAuth not configured")}`);
    }

    try {
        const tokenUrl = `${FACEBOOK_TOKEN_URL}?client_id=${appId}&client_secret=${appSecret}&code=${code}&redirect_uri=${encodeURIComponent(callbackUrl)}`;
        const tokenRes = await fetch(tokenUrl);
        const data = await tokenRes.json();
        const accessToken = data.access_token;
        if (!accessToken) {
            const err = data.error?.message || data.error || "No access_token in response";
            return res.redirect(`${redirect}?error=${encodeURIComponent(err)}`);
        }

        const sep = redirect.includes("?") ? "&" : "?";
        return res.redirect(`${redirect}${sep}token=${encodeURIComponent(accessToken)}&provider=facebook`);
    } catch (err) {
        return res.redirect(`${redirect}?error=${encodeURIComponent(err.message || "Token exchange failed")}`);
    }
}

module.exports = { googleRedirect, googleCallback, facebookRedirect, facebookCallback };
