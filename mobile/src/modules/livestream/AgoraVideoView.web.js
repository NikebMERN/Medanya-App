/**
 * Web: Uses Agora Web SDK (agora-rtc-sdk-ng) for livestream viewing.
 * Host streaming on web is not supported (native only); viewers can watch host streams.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { env } from "../../utils/env";

const AGORA_APP_ID = env.agoraAppId || "";

function isWebAgoraReady() {
  if (!AGORA_APP_ID) return false;
  try {
    require("agora-rtc-sdk-ng");
    return true;
  } catch {
    return false;
  }
}

export function isAgoraAvailable() {
  return isWebAgoraReady();
}

export function useAgoraHost() {
  return { ready: false, switchCamera: () => {}, setMute: () => {} };
}

export function useAgoraViewer({ streamId, channelName, token, uid, onError, onUnavailable }) {
  const clientRef = useRef(null);
  const remoteUidRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [remoteUid, setRemoteUid] = useState(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState(null);

  useEffect(() => {
    if (!streamId || !channelName || !token || uid == null || !AGORA_APP_ID) {
      if (streamId && channelName && token != null) {
        onError?.(new Error("Missing Agora config or stream params"));
      }
      return;
    }

    let cancelled = false;
    let client = null;

    (async () => {
      try {
        const mod = require("agora-rtc-sdk-ng");
        const AgoraRTC = mod.default || mod;
        client = AgoraRTC.createClient({ mode: "live", codec: "h264" });

        client.on("user-published", async (user, mediaType) => {
          if (cancelled) return;
          try {
            await client.subscribe(user, mediaType);
            if (mediaType === "video" && user.videoTrack) {
              if (!cancelled) {
                const uidVal = Number(user.uid);
                remoteUidRef.current = uidVal;
                setRemoteUid(uidVal);
                setRemoteVideoTrack(user.videoTrack);
              }
            }
            if (mediaType === "audio" && user.audioTrack) {
              user.audioTrack.play().catch(() => {});
            }
          } catch (err) {
            if (!cancelled) onError?.(err);
          }
        });

        client.on("user-unpublished", (user) => {
          if (!cancelled && remoteUidRef.current === Number(user.uid)) {
            remoteUidRef.current = null;
            setRemoteUid(null);
            setRemoteVideoTrack(null);
          }
        });

        client.on("user-left", (user) => {
          if (!cancelled && remoteUidRef.current === Number(user.uid)) {
            remoteUidRef.current = null;
            setRemoteUid(null);
            setRemoteVideoTrack(null);
          }
        });

        const numericUid = typeof uid === "number" ? uid : Number(uid) || 0;
        await client.join(AGORA_APP_ID, channelName, token || null, isNaN(numericUid) ? undefined : numericUid);

        if (!cancelled) {
          clientRef.current = client;
          setReady(true);
        } else if (client) {
          await client.leave();
        }
      } catch (e) {
        if (!cancelled) {
          onUnavailable?.();
          onError?.(e);
        }
      }
    })();

    return () => {
      cancelled = true;
      setRemoteUid(null);
      setRemoteVideoTrack(null);
      setReady(false);
      if (clientRef.current) {
        clientRef.current.leave().catch(() => {}).finally(() => {
          clientRef.current = null;
        });
      }
    };
  }, [streamId, channelName, token, uid]);

  return { ready, engineRef: clientRef, remoteUid, remoteVideoTrack };
}

export function AgoraLocalView({ style }) {
  return <View style={style} />;
}

export function AgoraRemoteView({ remoteUid, remoteVideoTrack, style }) {
  const containerRef = useRef(null);
  const playedRef = useRef(false);

  useEffect(() => {
    if (!remoteVideoTrack || remoteUid == null) return;
    const el = containerRef.current;
    if (!el) return;
    if (playedRef.current) return;
    playedRef.current = true;
    const doPlay = () => {
      remoteVideoTrack.play(el).catch(() => {});
    };
    if (el.offsetParent != null) doPlay();
    else setTimeout(doPlay, 50);
    return () => {
      try {
        remoteVideoTrack.stop();
      } catch (_) {}
      playedRef.current = false;
    };
  }, [remoteVideoTrack, remoteUid]);

  if (remoteUid == null) return <View style={[styles.container, style]} />;

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "#000",
          objectFit: "contain",
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
