/**
 * AgoraVideoView - Renders host (local) or viewer (remote) video using react-native-agora.
 * Requires: react-native-agora, EXPO_PUBLIC_AGORA_APP_ID in .env
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { isAgoraAvailable, AGORA_APP_ID } from "./agora.provider";

export function useAgoraHost({ streamId, channelName, token, uid, onError }) {
  const engineRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!streamId || !channelName || !token || uid == null || !AGORA_APP_ID) {
      onError?.(new Error("Missing Agora config or stream params"));
      return;
    }

    let engine = null;
    let cancelled = false;
    (async () => {
      try {
        const {
          createAgoraRtcEngine,
          ChannelProfileType,
          ClientRoleType,
        } = require("react-native-agora");

        engine = createAgoraRtcEngine();
        engine.initialize({
          appId: AGORA_APP_ID,
          channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
        });

        engine.enableVideo();
        engine.startPreview();

        engine.joinChannel(token, channelName, uid, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        });

        if (!cancelled) {
          engineRef.current = engine;
          setReady(true);
        } else if (engine) {
          engine.leaveChannel();
          engine.release();
        }
      } catch (e) {
        if (!cancelled) onError?.(e);
      }
    })();

    return () => {
      cancelled = true;
      if (engineRef.current) {
        try {
          engineRef.current.leaveChannel();
          engineRef.current.release();
        } catch (_) {}
        engineRef.current = null;
      }
      setReady(false);
    };
  }, [streamId, channelName, token, uid]);

  const switchCamera = useCallback(() => {
    engineRef.current?.switchCamera();
  }, []);

  const setMute = useCallback((muted) => {
    engineRef.current?.muteLocalAudioStream?.(muted);
  }, []);

  return { ready, engineRef, switchCamera, setMute };
}

export function useAgoraViewer({ streamId, channelName, token, uid, onError }) {
  const engineRef = useRef(null);
  const [remoteUid, setRemoteUid] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!streamId || !channelName || !token || uid == null || !AGORA_APP_ID) {
      onError?.(new Error("Missing Agora config or stream params"));
      return;
    }

    let engine = null;
    let handler = null;
    let cancelled = false;
    (async () => {
      try {
        const {
          createAgoraRtcEngine,
          ChannelProfileType,
          ClientRoleType,
        } = require("react-native-agora");

        engine = createAgoraRtcEngine();
        engine.initialize({
          appId: AGORA_APP_ID,
          channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
        });

        engine.enableVideo();

        handler = {
          onUserJoined: (conn, ruid) => !cancelled && setRemoteUid(ruid),
          onUserOffline: (conn, ruid) => setRemoteUid((u) => (u === ruid ? null : u)),
        };
        engine.registerEventHandler(handler);

        engine.joinChannel(token, channelName, uid, {
          clientRoleType: ClientRoleType.ClientRoleAudience,
        });

        if (!cancelled) {
          engineRef.current = engine;
          setReady(true);
        } else if (engine) {
          engine.leaveChannel();
          engine.release();
        }
      } catch (e) {
        if (!cancelled) onError?.(e);
      }
    })();

    return () => {
      cancelled = true;
      if (engineRef.current) {
        try {
          if (handler) engineRef.current.unregisterEventHandler(handler);
          engineRef.current.leaveChannel();
          engineRef.current.release();
        } catch (_) {}
        engineRef.current = null;
      }
      setRemoteUid(null);
      setReady(false);
    };
  }, [streamId, channelName, token, uid]);

  return { ready, engineRef, remoteUid };
}

export function AgoraLocalView({ channelId, style }) {
  try {
    const { RtcSurfaceView } = require("react-native-agora");
    return (
      <RtcSurfaceView
        style={[StyleSheet.absoluteFill, style]}
        canvas={{ uid: 0 }}
        channelId={channelId}
      />
    );
  } catch {
    return <View style={style} />;
  }
}

export function AgoraRemoteView({ channelId, remoteUid, style }) {
  if (remoteUid == null) return <View style={style} />;

  try {
    const { RtcSurfaceView } = require("react-native-agora");
    return (
      <RtcSurfaceView
        style={[StyleSheet.absoluteFill, style]}
        canvas={{ uid: remoteUid }}
        channelId={channelId}
      />
    );
  } catch {
    return <View style={style} />;
  }
}

export { isAgoraAvailable };
