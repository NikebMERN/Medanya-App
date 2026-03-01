/**
 * useLivestreamJoinTimer — Sends livestream_join only when user stays >= 5 seconds.
 */
import { useEffect, useRef } from "react";
import { trackEvent } from "../utils/trackEvent";

const MIN_STAY_MS = 5000;

export function useLivestreamJoinTimer(isActive, { streamId, creatorId }) {
  const sentRef = useRef(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!isActive || !streamId) return;

    sentRef.current = false;
    timeoutRef.current = setTimeout(() => {
      sentRef.current = true;
      trackEvent("livestream_join", "stream", streamId, {
        watchTime: 5,
        watchTimeSec: 5,
        creatorId: creatorId || undefined,
      });
    }, MIN_STAY_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isActive, streamId, creatorId]);
}
