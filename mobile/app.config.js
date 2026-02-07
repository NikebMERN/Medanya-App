// Load .env via Expo (EXPO_PUBLIC_* are injected at build)
module.exports = ({ config }) => {
  return {
    ...config,
    name: "Medanya",
    slug: "medanya-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0f172a",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.medanya.app",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0f172a",
      },
      package: "com.medanya.app",
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:4001",
      socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:4001",
      agoraAppId: process.env.EXPO_PUBLIC_AGORA_APP_ID || "",
      livekitUrl: process.env.EXPO_PUBLIC_LIVEKIT_URL || "",
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
      cloudinaryCloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "",
      cloudinaryUploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "",
    },
  };
};
