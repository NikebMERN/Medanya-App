# Home Feed + Short Video Recommendation — Testing Checklist

## Cold start
- [ ] New user (no history): feed returns trending + editorial/region/language defaults
- [ ] New user: no repeats (diversity)
- [ ] New user: mix of tags (exploration ~10–20%)

## Safety & constraints
- [ ] Never recommend content from blocked users (block a creator → their videos disappear from recommendations)
- [ ] Never recommend content from banned users
- [ ] Only recommend content with status ACTIVE (not HIDDEN/DELETED)
- [ ] Reports: ≥3 unique in 24h ⇒ auto-hide and stop recommending
- [ ] Severe category (e.g. child_safety, gore) ⇒ hide immediately at 1 report

## Feed behavior
- [ ] GET /feed/home?tab=all|alerts|jobs|missing|market returns mixed cards with correct types (JOB, ALERT, MISSING, MARKET, VIDEO_CARD)
- [ ] Cursor-based pagination: nextCursor stable, no duplicate items across pages
- [ ] Tab switch: content updates per tab; cursor resets on tab change
- [ ] GET /feed/home/live returns live streams for hero + Active Now

## Video recommendations
- [ ] GET /videos/recommendations returns items with videoId, creator, stats; nextCursor works
- [ ] POST /videos/events (auth): events stored; 202 response; no crash on invalid body
- [ ] GET /videos/trending?region=&language= returns list

## Performance
- [ ] Feed first page cached (e.g. 45s) per tab
- [ ] Recommendation candidate cache (e.g. 3 min) per user/region/language
- [ ] No heavy offsets; cursor-based only

## Frontend
- [ ] Home: Live hero card shows first live stream; tap opens Live player
- [ ] Category chips switch tab and refresh feed
- [ ] Active Now row shows live avatars; tap opens stream
- [ ] Mixed feed cards: tap navigates to Job/Market/Missing/Alert/Video detail
- [ ] Pull-to-refresh and infinite scroll; loading/error/empty states
- [ ] FlatList: keyExtractor stable; no UI freezing
