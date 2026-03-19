/**
 * Config plugin to add Veriff Maven repository to Android build.gradle.
 * Required for @veriff/react-native-sdk to resolve com.veriff:veriff-library.
 */
const { withProjectBuildGradle } = require("@expo/config-plugins");

const VERIFF_MAVEN = 'maven { url "https://cdn.veriff.me/android/" }';

function withVeriffMaven(config) {
  return withProjectBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;
    if (!buildGradle || buildGradle.includes("cdn.veriff.me")) {
      return config;
    }
    // Add Veriff Maven inside allprojects { repositories { ... } }
    config.modResults.contents = buildGradle.replace(
      /(allprojects\s*\{\s*repositories\s*\{)/,
      `$1\n    ${VERIFF_MAVEN}`
    );
    return config;
  });
}

module.exports = withVeriffMaven;
