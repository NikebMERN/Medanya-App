import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

// Backend serves at /api/* — use base URL without /api (e.g. http://192.168.0.101:4001)
function normalizeApiUrl(url) {
  const u = (url || "http://localhost:4001").trim().replace(/\/+$/, "");
  return u.endsWith("/api") ? u.slice(0, -4) : u;
}

export const env = {
  apiUrl: normalizeApiUrl(extra.apiUrl || process.env.EXPO_PUBLIC_API_URL || "http://localhost:4001"),
  socketUrl: extra.socketUrl || process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:4001",
  agoraAppId: extra.agoraAppId || process.env.EXPO_PUBLIC_AGORA_APP_ID || "",
  livekitUrl: extra.livekitUrl || process.env.EXPO_PUBLIC_LIVEKIT_URL || "",
  firebaseApiKey: extra.firebaseApiKey || process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  firebaseAuthDomain: extra.firebaseAuthDomain || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  firebaseProjectId: extra.firebaseProjectId || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  firebaseStorageBucket: extra.firebaseStorageBucket || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  firebaseMessagingSenderId: extra.firebaseMessagingSenderId || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  firebaseAppId: extra.firebaseAppId || process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
  googleWebClientId: extra.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
  googleExpoClientId: extra.googleExpoClientId || process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || "",
  googleIosClientId: extra.googleIosClientId || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "",
  googleAndroidClientId: extra.googleAndroidClientId || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "",
  facebookAppId: extra.facebookAppId || process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || "",
  cloudinaryCloudName: extra.cloudinaryCloudName || process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "",
  cloudinaryUploadPreset: extra.cloudinaryUploadPreset || process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "",
  admobRewardedAdUnitId: extra.admobRewardedAdUnitId || process.env.EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID || "",
  oauthRedirectUri: (extra.oauthRedirectUri || process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI || "").trim().replace(/^["']|["']$/g, "") || null,
  stripePublishableKey: (extra.stripePublishableKey || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "").trim() || null,
};

const DEFAULT_MIME = {
  image: "image/jpeg",
  video: "video/mp4",
  raw: "audio/m4a",
};

/**
 * Upload file to Cloudinary (unsigned preset) and return the hosted URL.
 * resourceType: "image" | "video" | "raw" (for voice/audio).
 * Requires in .env: EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME, EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET (unsigned).
 */
export async function uploadToCloudinary(uri, resourceType = "image", mimeType) {
  const cloudName = env.cloudinaryCloudName;
  const preset = env.cloudinaryUploadPreset;
  if (!cloudName || !preset) {
    throw new Error("Cloudinary not configured. Add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env");
  }
  const type = mimeType || DEFAULT_MIME[resourceType] || "application/octet-stream";
  const name = resourceType === "raw" ? "voice.m4a" : resourceType === "video" ? "video.mp4" : "upload.jpg";
  const formData = new FormData();
  formData.append("file", { uri, type, name });
  formData.append("upload_preset", preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: "POST",
    body: formData,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    if (text.trimStart().startsWith("<")) {
      throw new Error("Upload failed: server returned an error page. Check your Cloudinary config (cloud name and upload preset).");
    }
    throw new Error("Upload failed: invalid response from server.");
  }
  if (data.error) {
    const msg = data.error.message || "Cloudinary upload failed";
    if (msg.toLowerCase().includes("unknown") || msg.toLowerCase().includes("invalid")) {
      throw new Error(
        msg + " Check EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env (see .env.example)."
      );
    }
    throw new Error(msg);
  }
  return data.secure_url || null;
}
