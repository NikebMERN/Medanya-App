# Firebase Android & iOS app setup (Expo)

The project uses **Firebase JS SDK** for Auth. The Android and iOS apps in your Firebase project are wired via `google-services.json` and `GoogleService-Info.plist`. `app.json` is already configured to use them.

## 1. Fix bundle / package in Firebase Console

Your current config files have placeholders that must match `app.json`:

| Platform | `app.json` value        | Firebase Console field        | Action |
|----------|-------------------------|-------------------------------|--------|
| Android  | `android.package`: `com.medanya.app` | Package name                  | Set to `com.medanya.app`, then re-download **google-services.json** and replace `./google-services.json`. |
| iOS      | `ios.bundleIdentifier`: `com.medanya.app` | Bundle ID                     | Set to `com.medanya.app`, then re-download **GoogleService-Info.plist** and replace `./GoogleService-Info.plist`. |

- **Android:** Firebase Console → Project settings → Your apps → Android app → Edit → set **Package name** to `com.medanya.app` → Save → download new `google-services.json` → replace the file in the project root.
- **iOS:** Same → iOS app → set **Bundle ID** to `com.medanya.app` → download new `GoogleService-Info.plist` → replace in project root.

If you used different package/bundle when creating the apps, either:
- change `app.json` to match what’s in Firebase, or  
- create new Android/iOS apps in Firebase with `com.medanya.app` and replace the config files.

## 2. What’s in `app.json`

- **Android:** `android.package`, `android.googleServicesFile: "./google-services.json"`
- **iOS:** `ios.bundleIdentifier`, `ios.googleServicesFile: "./GoogleService-Info.plist"`

EAS Build (and `expo prebuild`) will pick these up and include the Firebase config in the native projects.

## 3. iOS: Swift Package Manager (Xcode)

The Firebase instructions say: “Use Swift Package Manager to install Firebase in Xcode…”.

- **Expo managed workflow (this project):** You do **not** need to add Firebase via Xcode. You’re using the **Firebase JS SDK** (`firebase` npm package). Auth runs in JS; the native config is only for the build (and for things like Analytics/FCM if you add them later). EAS Build will include `GoogleService-Info.plist` via `app.json`.
- **Bare workflow / custom native code:** If you later run `expo prebuild` and open the `ios` folder in Xcode, or use `@react-native-firebase`, then you would add the Firebase iOS SDK via Xcode (File → Add Packages → `https://github.com/firebase/firebase-ios-sdk`) and link the native modules. For the current Expo + Firebase JS setup, that step is **not** required.

## 4. Optional: native OAuth client IDs for Google Sign-In

After fixing the Android/iOS apps:

- **iOS client ID** is in `GoogleService-Info.plist` → `CLIENT_ID` (e.g. `...apps.googleusercontent.com`).
- **Android client ID** is in `google-services.json` → `client[].oauth_client[].client_id` (client_type 3).

You can add to `.env` for better native Google Sign-In:

```env
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<from plist CLIENT_ID>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<from google-services.json oauth_client>
```

Then use these in your auth config (e.g. `iosClientId` / `androidClientId`) if your code supports them. The **Web client ID** remains required for the OAuth flow.
