/**
 * Web-only layout styles to center content and constrain modals/dropdowns within the app boundary (480px).
 * Use these only when Platform.OS === 'web'.
 */
import { Platform } from "react-native";

const IS_WEB = Platform.OS === "web";

/** Extra styles for the app root container on web - centers the 480px box */
export const webRootContainer = IS_WEB ? { width: "100%", minHeight: "100vh" } : {};

/** Extra styles for the app content wrapper on web - constrained width, centered, prevent overflow */
export const webAppContent = IS_WEB
  ? { maxWidth: 480, width: "100%", marginHorizontal: "auto", alignSelf: "stretch", overflow: "hidden" }
  : {};

/** Extra styles for modal overlay on web - centers modal content horizontally (do not set justifyContent; each modal has its own) */
export const webModalOverlay = IS_WEB ? { alignItems: "center" } : {};

/** Extra styles for modal/dropdown content on web - constrains to app boundary, centered */
export const webModalContent = IS_WEB
  ? { maxWidth: 480, width: "100%", alignSelf: "center" }
  : {};

/** Extra styles for screens/containers on web - prevent input overflow */
export const webScreenContainer = IS_WEB
  ? { overflow: "hidden", maxWidth: "100%" }
  : {};
