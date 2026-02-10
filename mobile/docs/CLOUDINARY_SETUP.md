# Where to get Cloudinary env vars (profile picture upload)

If you see **"Unknown API"** (or similar) when changing your profile picture, your Cloudinary env vars are missing or wrong. Get them like this:

## 1. Create a free account

- Go to **[cloudinary.com](https://cloudinary.com)** and sign up (free tier is enough).

## 2. Get your **Cloud name**

- Log in to the [Cloudinary Console](https://console.cloudinary.com).
- On the **Dashboard** you’ll see **Cloud name** (e.g. `dxxxxxx` or a custom name).
- Or: **Settings** (gear) → **Product environment credentials** → **Cloud name**.

Put it in `.env`:

```env
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
```

## 3. Create an **unsigned upload preset**

- In the console: **Settings** → **Upload**.
- Open the **Upload presets** section.
- Click **Add upload preset**.
- Set:
  - **Preset name**: e.g. `medanya_unsigned` (this is the value you’ll use in `.env`).
  - **Signing Mode**: **Unsigned** (required so the app can upload without your API secret).
- Save.

Put it in `.env`:

```env
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=medanya_unsigned
```

(Use the exact preset name you created.)

## 4. Restart the app

- Restart Expo (`npx expo start` or press `r` in the terminal) so `.env` is reloaded.
- Try changing your profile picture again.

---

**Summary:**  
`EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` = your cloud name from the dashboard.  
`EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` = the **preset name** of an **unsigned** upload preset you created in Settings → Upload.
