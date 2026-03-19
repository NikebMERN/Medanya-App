/**
 * Config plugin to pin Android Gradle Plugin (AGP) to 8.5.0.
 * Fixes EAS Build "No variants exist" error caused by AGP 8.11.0 incompatibility
 * with many React Native native modules (Firebase, Stripe, Veriff, etc).
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const RN_LIBS_VERSIONS = "node_modules/react-native/gradle/libs.versions.toml";
const TARGET_AGP = "8.5.0";

function withAgpDowngrade(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const filePath = path.join(projectRoot, RN_LIBS_VERSIONS);

      if (!fs.existsSync(filePath)) {
        console.warn("[withAgpDowngrade] libs.versions.toml not found, skipping");
        return config;
      }

      let content = fs.readFileSync(filePath, "utf8");
      if (content.includes(`agp = "${TARGET_AGP}"`)) {
        return config;
      }

      content = content.replace(/agp = "8\.\d+\.\d+"/, `agp = "${TARGET_AGP}"`);
      if (!content.includes(`agp = "${TARGET_AGP}"`)) {
        console.warn("[withAgpDowngrade] Could not find agp version to replace");
        return config;
      }

      fs.writeFileSync(filePath, content);
      console.log(`[withAgpDowngrade] Pinned AGP to ${TARGET_AGP}`);
      return config;
    },
  ]);
}

module.exports = withAgpDowngrade;
