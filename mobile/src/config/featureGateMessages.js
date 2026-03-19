/**
 * Default copy for web feature gates.
 * Keep messages product-y (not error-y) and reusable.
 */

export const FEATURE_GATE_MESSAGES = {
  ads: {
    title: "Rewards are available on the mobile app",
    message: "Ad‑supported rewards and the full experience are available in the mobile app.",
  },
  "livestream-watch": {
    title: "Livestreams are better in the app",
    message: "For the smoothest playback and full features, watch livestreams in the mobile app.",
  },
  "livestream-broadcast": {
    title: "Go live from the mobile app",
    message: "Go live from the app for the best quality, camera support, and performance.",
  },
  "video-posting": {
    title: "Video creation is optimized for the app",
    message: "Record and post videos faster in the mobile app for the best quality.",
  },
  "video-editing": {
    title: "Editing is better in the app",
    message: "Edit videos in the mobile app for smoother performance and higher quality exports.",
  },
  "push-notifications": {
    title: "Notifications are more reliable in the app",
    message: "Mobile notifications are more reliable. Use the app for real‑time alerts.",
  },
  "generic-mobile-feature": {
    title: "This feature is optimized for the mobile app",
    message: "For the full experience, download the mobile app.",
  },
};

export function getFeatureGateCopy(featureName) {
  return FEATURE_GATE_MESSAGES[featureName] || FEATURE_GATE_MESSAGES["generic-mobile-feature"];
}

