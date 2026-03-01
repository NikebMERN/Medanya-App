/**
 * trackEvent — Unified analytics event tracking.
 * Server rate-limits /analytics/event. For video_view: use useVideoViewTimer to send watchTimeSec >= 3.
 * Call from: video view (via timer), like, comment, follow, livestream, marketplace, jobs.
 */
import * as analyticsApi from "../modules/analytics/analytics.api";

/**
 * Track an analytics event.
 * @param {string} type - video_view | video_like | video_comment | follow | market_purchase | job_post | livestream_start | etc.
 * @param {string} entityType - video | market_item | job | stream | profile
 * @param {string} entityId
 * @param {object} meta - watchTimeSec, watchTime, amountCoins, amountUSD, creatorId, engaged, etc.
 */
export function trackEvent(type, entityType, entityId, meta = {}) {
  const payload = { ...meta };
  if (payload.watchTimeSec != null) payload.watchTimeSec = Math.floor(Number(payload.watchTimeSec) || 0);
  analyticsApi.trackEvent(type, entityType, entityId, payload).catch(() => {});
}
