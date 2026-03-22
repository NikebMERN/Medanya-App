# Development Build Setup

A development build includes native code (Firebase, Google Sign-In, Facebook SDK, etc.) and lets you use Expo Dev Client instead of Expo Go.

## Prerequisites

- **EAS CLI**: `npm install -g eas-cli`
- **Expo account**: [expo.dev](https://expo.dev) (you're logged in as `nikeb`)
- **Apple Developer account** (for iOS device build) or **Xcode** (for iOS simulator)
- **Android**: Android Studio + device/emulator

## Step 1: Install EAS CLI (if needed)

```bash
npm install -g eas-cli
```

## Step 2: Log in to Expo

```bash
eas login
```

## Step 3: Build the Development App

### Android (physical device or emulator)

```bash
cd mobile
yarn build:dev:android
# or: npx eas build --profile development --platform android
```

### iOS (physical device)

```bash
cd mobile
yarn build:dev:ios
# or: npx eas build --profile development --platform ios
```

### iOS Simulator only

```bash
cd mobile
npx eas build --profile development-simulator --platform ios
```

## Step 4: Install the Build

- **EAS Build (cloud)**: After the build finishes, scan the QR code or open the link to download the `.apk` (Android) or install via TestFlight/simulator.
- **Android emulator**: Drag the downloaded `.apk` onto the emulator.
- **iOS simulator**: Download the `.app` and run `xcrun simctl install booted path/to/your-app.app`.

## Step 5: Start the Dev Server

With the dev build installed on your device/emulator:

```bash
cd mobile
yarn start:dev-client
```

Then open the app on your device. It will connect to the dev server (same Wi‑Fi for LAN, or use tunnel if not on same network).

### If device can't reach your machine

```bash
yarn start:dev-client:tunnel
```

## Quick Reference

| Command | Purpose |
|--------|---------|
| `yarn build:dev:android` | Build dev client for Android |
| `yarn build:dev:ios` | Build dev client for iOS (device) |
| `npx eas build --profile development-simulator --platform ios` | Build for iOS Simulator |
| `yarn start:dev-client` | Start dev server (connects to dev build) |
| `yarn start:dev-client:tunnel` | Start with tunnel (for remote testing) |

## Troubleshooting

1. **"Unable to resolve module"**: Run `yarn install` and `yarn start:dev-client:clean`
2. **App won't connect**: Ensure device and computer are on same Wi‑Fi, or use `--tunnel`
3. **Native module not found**: Rebuild the dev client after adding new native packages
4. **Facebook Client Token**: Replace `YOUR_FACEBOOK_CLIENT_TOKEN` in `app.json` before building
