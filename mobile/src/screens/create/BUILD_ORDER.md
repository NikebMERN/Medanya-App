# Create Flow — Build Order

Production-ready Create system (TikTok/Shorts style): short video + go live.

## Implemented (this pass)

1. **CreateContentModal** — Full-screen dark modal: Shoot Short, From Gallery, Go Live. Close X top-left. Rendered by CreateScreen with gating (16+ video, 18+ live, OTP for live).
2. **VideoRecordScreen** — Preview area, top bar (close, Add Sound, settings), right toolbar (flip, speed, beauty, filters, timer, flash), bottom (record, gallery, duration 15/30/60s, progress). MVP: uses ImagePicker for record + gallery; stores draft and navigates to VideoEdit.
3. **VideoEditScreen** — Minimal MVP: trim (placeholder), cover (placeholder), filter presets (6). Timeline scrubber, Next → Publish.
4. **VideoPublishScreen** — Thumbnail, caption, hashtags (safety, jobs, tips, missing, community), privacy (public/followers/private), allow comments, Post. OTP check; upload video + optional thumbnail then POST /videos.
5. **LiveSetupScreen** — Title, category (Community Talk, Safety, Jobs Advice, Missing Alerts), cover picker (optional), rules modal (must accept). 18+ and OTP required. Start Live → createStream → LiveHostScreen.
6. **LiveHostScreen** — Fullscreen preview placeholder, LIVE badge + viewer count, End button, right toolbar (flip, mute, settings), bottom chat overlay (messages, input, Gift/Share stubbed).

## Navigation

- **Create** (modal) → CreateContentModal.
- **Shoot Short** → VideoRecord → VideoEdit → VideoPublish → (post) → Main.
- **From Gallery** → VideoCreate (existing VideoUploadScreen).
- **Go Live** → Live → LiveSetup → (start) → LiveHost.

## Stores

- **videoCreate.store.js** — draftUri, segments, trim, filter, cover, caption, hashtags, privacy, allowComments, uploadProgress/uploadStatus.
- **livestream.store.js** — existing (createStream, endStream, getToken, setViewerCount).

## Next steps (recommended order)

1. **Record pipeline** — Add expo-camera for in-app camera preview and hold-to-record; segment progress bar; speed applied on export.
2. **Edit** — Real trim (start/end sliders), extract cover frame (expo-av or FFmpeg), apply filter at export or send preset to backend.
3. **Upload** — Resumable/chunk upload; background queue; POST /media/sign then Cloudinary upload; progress + cancel/retry.
4. **Go Live** — Agora/LiveKit SDK in LiveHostScreen (and LivePlayerScreen for viewer); Socket.IO room `stream:<streamId>`, events viewer_count_update, stream_chat_receive; end stream → POST /streams/end.
5. **Safety** — Report targetType VIDEO/LIVESTREAM; ≥3 reports → auto-hide/stop; severe → immediate; notify admin.
6. **Admin** — Moderation queue, ban/restore, audit log.

## Files touched/added

- `components/create/CreateContentModal.js`
- `screens/create/CreateScreen.js` (wires modal + gating)
- `screens/videos/VideoRecordScreen.js`
- `screens/videos/VideoEditScreen.js`
- `screens/videos/VideoPublishScreen.js`
- `screens/livestream/LiveSetupScreen.js`
- `screens/livestream/LiveHostScreen.js`
- `store/videoCreate.store.js`
- `utils/age.js` (canLiveStreamHost 18+)
- `navigation/RootNavigator.js` (VideoRecord, VideoEdit, VideoPublish)
- `navigation/LivestreamStack.js` (LiveSetup, LiveHost)
- `api/livestream.api.js` (createStream optional coverImageUrl)
