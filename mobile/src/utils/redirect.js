/**
 * OAuth redirect URI helper. Use for Google/Facebook sign-in.
 * Add the returned URI in Google Cloud Console and Facebook → Valid OAuth Redirect URIs.
 */
import Constants from "expo-constants";
import * as AuthSession from "expo-auth-session";

export function getRedirectUri(options = {}) {
  const scheme = options.scheme ?? Constants.expoConfig?.scheme ?? "medanya";
  const path = options.path ?? "redirect";
  return AuthSession.makeRedirectUri({
    scheme,
    path,
    ...options,
  });
}
