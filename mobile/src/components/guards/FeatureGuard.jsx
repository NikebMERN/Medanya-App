import React from "react";
import { Platform } from "react-native";
import MobileAppPrompt from "./MobileAppPrompt";
import { getFeatureGateCopy } from "../../config/featureGateMessages";

/**
 * FeatureGuard — safe platform gate for native-first features.
 *
 * Props:
 * - featureName: string (for copy + analytics)
 * - mode: "block" | "fallback"
 * - title/message: override copy
 * - allowWeb: boolean (force allow)
 * - webFallback: ReactNode (render on web when mode="fallback")
 * - iconName: MaterialIcons icon name (optional)
 * - compact: tighter MobileAppPrompt styling
 * - variant: "card" | "full"
 */
export default function FeatureGuard({
  featureName,
  mode = "block",
  title,
  message,
  allowWeb = false,
  webFallback = null,
  children,
  iconName,
  compact,
  variant = "card",
  showStoreButtons = true,
  playStoreUrl,
  appStoreUrl,
  hidePlayStoreButton,
  hideAppStoreButton,
  continueLabel,
  onContinue,
}) {
  const isWeb = Platform.OS === "web";
  if (!isWeb) return children;
  if (allowWeb) return children;

  if (mode === "fallback" && webFallback) return webFallback;

  const copy = getFeatureGateCopy(featureName);
  return (
    <MobileAppPrompt
      featureName={featureName}
      title={title || copy.title}
      message={message || copy.message}
      iconName={iconName}
      compact={compact}
      variant={variant}
      showStoreButtons={showStoreButtons}
      playStoreUrl={playStoreUrl}
      appStoreUrl={appStoreUrl}
      hidePlayStoreButton={hidePlayStoreButton}
      hideAppStoreButton={hideAppStoreButton}
      continueLabel={continueLabel}
      onContinue={onContinue}
    />
  );
}

