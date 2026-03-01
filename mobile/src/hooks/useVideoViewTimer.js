/**
 * useVideoViewTimer — Tracks watch time while video is active.
 * - Every 250ms updates watched ms only while playing & visible
 * - At stop: if watched >= 3000ms, send event once with watchTimeSec and engaged (if >= 10s)
 * - Cleans up interval on unmount (no memory leaks)
 */
import { useRef, useEffect, useCallback } from "react";
import { trackEvent } from "../utils/trackEvent";

const TICK_MS = 250;
const MIN_VIEW_SEC = 3;
const ENGAGED_SEC = 10;

export function useVideoViewTimer(isActive, { entityId, entityType = "video", creatorId }) {
  const watchedMs = useRef(0);
  const intervalRef = useRef(null);
  const sentRef = useRef(false);

  const flush = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const totalSec = Math.floor(watchedMs.current / 1000);
    if (totalSec >= MIN_VIEW_SEC && !sentRef.current && entityId) {
      sentRef.current = true;
      trackEvent("video_view", entityType, entityId, {
        watchTimeSec: totalSec,
        watchTime: totalSec,
        creatorId: creatorId || undefined,
        engaged: totalSec >= ENGAGED_SEC,
      });
    }
  }, [entityId, entityType, creatorId]);

  useEffect(() => {
    if (!isActive) {
      flush();
      watchedMs.current = 0;
      sentRef.current = false;
      return;
    }
    watchedMs.current = 0;
    sentRef.current = false;
    intervalRef.current = setInterval(() => {
      watchedMs.current += TICK_MS;
    }, TICK_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, entityId, flush]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { flush };
}
