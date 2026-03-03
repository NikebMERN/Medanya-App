/**
 * Local AdMob config plugin — applies Android/iOS AdMob app IDs.
 * Use this instead of react-native-google-mobile-ads plugin to avoid EAS "Unexpected token 'typeof'" error.
 */
const { withAndroidManifest, withInfoPlist } = require("@expo/config-plugins");
const { getMainApplicationOrThrow, addMetaDataItemToMainApplication } = require("@expo/config-plugins/build/android/Manifest");

function withAndroidAppId(config, androidAppId) {
  if (!androidAppId) return config;
  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults;
    const mainApplication = getMainApplicationOrThrow(manifest);
    addMetaDataItemToMainApplication(mainApplication, "com.google.android.gms.ads.APPLICATION_ID", androidAppId);
    return c;
  });
}

function withIosAppId(config, iosAppId) {
  if (!iosAppId) return config;
  return withInfoPlist(config, (c) => {
    c.modResults.GADApplicationIdentifier = iosAppId;
    return c;
  });
}

function withGoogleMobileAds(config, { androidAppId, iosAppId } = {}) {
  config = withAndroidAppId(config, androidAppId);
  config = withIosAppId(config, iosAppId);
  return config;
}

module.exports = withGoogleMobileAds;
