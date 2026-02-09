# Cloudinary setup (profile avatars)

The **mobile app** uploads the image directly to Cloudinary (unsigned upload), gets a hosted URL, then sends that URL to the backend. The backend only stores the URL in the database; it does not receive the image file for avatars.

## Mobile app (required)

1. In [Cloudinary Console](https://console.cloudinary.com): **Settings** → **Upload** → add an **Upload preset**.
2. Set the preset to **Unsigned** (so the app can upload without your API secret).
3. In `mobile/.env` add:
   ```env
   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset_name
   ```
4. Restart the Expo app. Profile image flow: pick image → app uploads to Cloudinary → app sends URL to backend → backend saves URL.

## Backend (optional)

The backend does **not** need Cloudinary for the main avatar flow. It only needs to accept `avatarUrl` in `PATCH /users/me` and store it (already implemented).

If you still use the legacy `POST /users/me/avatar` (file upload to backend), then set in `backend/.env`:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
(Backend would then upload the file to Cloudinary and save the URL.)
