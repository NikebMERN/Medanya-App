import { useEffect, useMemo } from "react";
import { isWeb, getStoreLinks } from "../utils/platformGuards";
import { getFeatureGateCopy } from "../config/featureGateMessages";
import { trackEvent } from "../utils/trackEvent";

export function useFeatureGate({ featureName, title, message, playStoreUrl, appStoreUrl } = {}) {
  const copy = useMemo(() => getFeatureGateCopy(featureName), [featureName]);
  const links = useMemo(() => getStoreLinks({ playStoreUrl, appStoreUrl }), [playStoreUrl, appStoreUrl]);

  useEffect(() => {
    if (!isWeb) return;
    if (!featureName) return;
    trackEvent("feature_gate_view", "feature", String(featureName), { platform: "web" });
  }, [featureName]);

  return {
    isWeb,
    title: title || copy.title,
    message: message || copy.message,
    ...links,
  };
}

