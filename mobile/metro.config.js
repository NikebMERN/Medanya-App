const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const defaultResolve = require("metro-resolver").resolve;

const config = getDefaultConfig(__dirname);

// Prevent Firebase resolution errors (missing initial state / package exports)
config.resolver = config.resolver || {};
config.resolver.unstable_enablePackageExports = false;
config.resolver.unstable_conditionNames = ["require", "import"];

// Support .cjs extensions (Firebase and some deps use them)
if (!config.resolver.sourceExts) config.resolver.sourceExts = [];
if (!config.resolver.sourceExts.includes("cjs")) config.resolver.sourceExts.push("cjs");

// Force axios to use browser build (avoids Node "crypto"/"http" in React Native; safe on web too)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "axios") {
    const root = context.projectRoot ?? __dirname;
    const browserPath = path.resolve(root, "node_modules", "axios", "dist", "browser", "axios.cjs");
    return {
      filePath: browserPath,
      type: "sourceFile",
    };
  }
  return defaultResolve(context, moduleName, platform);
};

module.exports = config;
