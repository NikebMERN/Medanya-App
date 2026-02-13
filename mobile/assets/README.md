# App icon and splash assets

Use your **Medanya project logo** here so it appears as the app icon on the user’s phone and on the native splash screen.

## Required files

Place these in this folder (`mobile/assets/`):

| File | Purpose | Recommended size |
|------|--------|-------------------|
| **icon.png** | App icon (home screen) | 1024×1024 px |
| **splash-icon.png** | Native splash (white background) | 1284×2778 px or similar; logo centered |
| **adaptive-icon.png** | Android adaptive icon (foreground) | 1024×1024 px |
| **favicon.png** | Web favicon | 48×48 px |

## Logo design

The in-app logo is: **rounded square with checkmark (✓)** + **“MEDANYA APP”** + tagline. Use the same mark (check in rounded square) for the icon. For `splash-icon.png`, use a **white background** with the logo centered so it matches the 3–4 second in-app loading screen.

**When does the custom icon show?**
- **Expo Go:** The app runs inside Expo Go, so the icon in "recent apps" is always Expo Go’s icon. To see the Medanya logo as the app icon, use a **development build** or **production build**.
- **Your logo as the app icon:** Run a native build so the app is installed with your icon:
  - `npx expo run:ios` or `npx expo run:android` (development build), or
  - `eas build` (production).
- **Splash screen:** The logo and #f2f6ff background are used for the native splash (on first open) and the in-app loading screen. Clear cache if needed: `npx expo start --clear`.
