import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
  Animated,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location";
import * as Contacts from "expo-contacts";
import { useAudioRecorder, AudioModule, RecordingPresets, useAudioRecorderState } from "expo-audio";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";
import { uploadToCloudinary } from "../utils/env";

const BAR_COUNT = 9;
const recordingAnimStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginRight: spacing.xs,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    minHeight: 6,
  },
});

function RecordingAnimation({ colors }) {
  const anims = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.9 - (i / BAR_COUNT) * 0.4,
            duration: 120 + i * 30,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0.2 + (i / BAR_COUNT) * 0.5,
            duration: 120 + i * 30,
            useNativeDriver: false,
          }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims]);

  return (
    <View style={recordingAnimStyles.wrap}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            recordingAnimStyles.bar,
            {
              backgroundColor: colors.textMuted + "80",
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [6, 28],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Chat input: plus, text field, mic, camera, send. Optional reply/edit bars.
 * onSend(payload): string | { type, text?, mediaUrl? } | { editMessageId, text }.
 */
export default function ChatInput({
  onSend,
  disabled,
  replyTo = null,
  onCancelReply,
  editingMessage = null,
  onCancelEdit,
  onMediaPicked = null,
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const recording = recorderState.isRecording;
  const [pendingMedia, setPendingMedia] = useState(null);
  const [plusMenuVisible, setPlusMenuVisible] = useState(false);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || "");
    } else {
      setText("");
    }
  }, [editingMessage?._id ?? editingMessage?.id, !!editingMessage]);

  const handleSendText = useCallback(() => {
    const trimmed = (text || "").trim();
    if (!trimmed || disabled) return;
    if (editingMessage) {
      const msgId = editingMessage._id || editingMessage.id;
      if (msgId) {
        onSend({ editMessageId: msgId, text: trimmed });
        setText("");
        onCancelEdit?.();
      }
      return;
    }
    onSend(trimmed);
    setText("");
  }, [text, disabled, onSend, editingMessage, onCancelEdit]);

  const isEditMode = !!editingMessage;
  const canSendText = (text || "").trim().length > 0;

  const pickMedia = useCallback(async () => {
    if (disabled || uploading || pendingMedia) return;
    setPlusMenuVisible(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to photos to send images and videos.");
        return;
      }
      const mediaTypes = ["images", "videos"];
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const isVideo = (asset.type ?? asset.mimeType ?? "").toLowerCase().includes("video");
      const type = isVideo ? "video" : "image";
      const resourceType = isVideo ? "video" : "image";
      const tempId = onMediaPicked ? onMediaPicked(uri, type) : null;
      setUploading(true);
      try {
        const url = await uploadToCloudinary(uri, resourceType);
        if (url) {
          onSend(tempId ? { type, mediaUrl: url, tempId } : { type, mediaUrl: url });
        }
      } finally {
        setUploading(false);
      }
    } catch (e) {
      setUploading(false);
      Alert.alert("Upload failed", e?.message ?? "Could not upload. Check Cloudinary config.");
    }
  }, [disabled, uploading, pendingMedia, onSend, onMediaPicked]);

  const takePhoto = useCallback(async () => {
    if (disabled || uploading || pendingMedia) return;
    setPlusMenuVisible(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow camera access to take photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      const tempId = onMediaPicked ? onMediaPicked(uri, "image") : null;
      setUploading(true);
      try {
        const url = await uploadToCloudinary(uri, "image");
        if (url) onSend(tempId ? { type: "image", mediaUrl: url, tempId } : { type: "image", mediaUrl: url });
      } finally {
        setUploading(false);
      }
    } catch (e) {
      setPendingMedia(null);
      setUploading(false);
      Alert.alert("Camera error", e?.message ?? "Could not take or upload photo.");
    }
  }, [disabled, uploading, pendingMedia, onSend, onMediaPicked]);

  const pickFile = useCallback(async () => {
    if (disabled || uploading) return;
    setPlusMenuVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        base64: false,
        multiple: false,
      });
      const canceled = result?.canceled === true || result?.type === "cancel";
      if (canceled || !result?.assets?.[0]?.uri) return;
      const asset = result.assets[0];
      const uri = asset.uri;
      const mime = asset.mimeType || asset.mime || "application/octet-stream";
      setUploading(true);
      try {
        const url = await uploadToCloudinary(uri, "raw", mime);
        if (url) onSend({ type: "file", mediaUrl: url });
      } finally {
        setUploading(false);
      }
    } catch (e) {
      setUploading(false);
      const msg = e?.message || String(e);
      const isUserCancel = /cancel/i.test(msg) || msg === "User canceled the document picker.";
      if (!isUserCancel) {
        Alert.alert("Could not open files", msg || "Make sure the app has storage permission and try again.");
      }
    }
  }, [disabled, uploading, onSend]);

  const pickLocation = useCallback(async () => {
    if (disabled || uploading) return;
    setPlusMenuVisible(false);
    try {
      setUploading(true);
      let latitude, longitude;
      if (Platform.OS === "web") {
        await new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              latitude = pos.coords.latitude;
              longitude = pos.coords.longitude;
              resolve();
            },
            (err) => {
              reject(new Error(err.message || "Could not get location."));
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
        });
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Allow location access to share your position.");
          setUploading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
      setUploading(false);
      const text = JSON.stringify({
        lat: latitude,
        lng: longitude,
      });
      onSend({ type: "location", text });
    } catch (e) {
      setUploading(false);
      Alert.alert("Location error", e?.message ?? "Could not get location.");
    }
  }, [disabled, uploading, onSend]);

  const pickContact = useCallback(async () => {
    if (disabled || uploading) return;
    setPlusMenuVisible(false);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow contacts access to share a contact.");
        return;
      }
      if (typeof Contacts.presentContactPickerAsync === "function") {
        const contact = await Contacts.presentContactPickerAsync();
        if (contact) {
          const phones = (contact.phoneNumbers || []).map((p) => p?.number || p).filter(Boolean);
          const text = JSON.stringify({ name: contact.name || "", phones });
          onSend({ type: "contact", text });
        }
        return;
      }
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers] });
      if (!data?.length) {
        Alert.alert("No contacts", "No contacts found.");
        return;
      }
      const names = data.slice(0, 5).map((c) => c.name || "No name");
      Alert.alert("Share contact", "Pick a contact", [
        { text: "Cancel", style: "cancel" },
        ...names.map((name, i) => ({
          text: name,
          onPress: () => {
            const c = data[i];
            const phones = (c.phoneNumbers || []).map((p) => p?.number || p).filter(Boolean);
            onSend({ type: "contact", text: JSON.stringify({ name: c.name || "", phones }) });
          },
        })),
      ]);
    } catch (e) {
      Alert.alert("Contacts error", e?.message ?? "Could not access contacts.");
    }
  }, [disabled, uploading, onSend]);

  const openPollModal = useCallback(() => {
    setPlusMenuVisible(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollModalVisible(true);
  }, []);

  const sendPoll = useCallback(() => {
    const q = (pollQuestion || "").trim();
    const opts = pollOptions.map((o) => (o || "").trim()).filter(Boolean);
    if (!q || opts.length < 2) {
      Alert.alert("Poll", "Enter a question and at least 2 options.");
      return;
    }
    const text = JSON.stringify({ question: q, options: opts });
    onSend({ type: "poll", text });
    setPollModalVisible(false);
  }, [pollQuestion, pollOptions, onSend]);

  const openPlusMenu = useCallback(() => {
    if (disabled || uploading || pendingMedia) return;
    setPlusMenuVisible(true);
  }, [disabled, uploading, pendingMedia]);

  const plusMenuOptions = [
    { key: "media", label: "Image & Video", icon: "photo-library", onPress: pickMedia },
    { key: "file", label: "File", icon: "folder-open", onPress: pickFile },
    { key: "location", label: "Location", icon: "location-on", onPress: pickLocation },
    { key: "poll", label: "Poll", icon: "poll", onPress: openPollModal },
    { key: "contact", label: "Contact", icon: "contacts", onPress: pickContact },
  ];

  const discardVoice = useCallback(async () => {
    if (!audioRecorder.isRecording) return;
    try {
      await audioRecorder.stop();
    } catch (_) {}
  }, [audioRecorder]);

  const toggleVoice = useCallback(async () => {
    if (disabled || uploading) return;

    if (audioRecorder.isRecording) {
      try {
        await audioRecorder.stop();
        const uri = audioRecorder.uri;
        if (uri) {
          setUploading(true);
          const url = await uploadToCloudinary(uri, "raw", "audio/m4a");
          setUploading(false);
          if (url) onSend({ type: "voice", mediaUrl: url });
        }
      } catch (e) {
        setUploading(false);
        Alert.alert("Voice error", e?.message ?? "Could not send voice.");
      }
      return;
    }

    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert("Permission needed", "Allow microphone access to send voice messages.");
        return;
      }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (e) {
      Alert.alert("Recording failed", e?.message ?? "Could not start recording.");
    }
  }, [disabled, uploading, audioRecorder, onSend]);

  const replyPreview =
    replyTo?.type === "text"
      ? (replyTo.text || "").slice(0, 60) + ((replyTo.text || "").length > 60 ? "…" : "")
      : replyTo?.type === "image"
        ? "📷 Photo"
        : replyTo?.type === "video"
          ? "🎥 Video"
          : replyTo?.type === "voice"
            ? "🎙️ Voice"
            : "Message";

  return (
    <View style={styles.wrapper}>
      {replyTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarLine} />
          <Text style={styles.replyBarText} numberOfLines={1}>{replyPreview}</Text>
          <TouchableOpacity onPress={onCancelReply} style={styles.replyBarClose} hitSlop={12}>
            <MaterialIcons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
      {editingMessage && (
        <View style={styles.editBar}>
          <Text style={styles.editBarLabel}>Editing message</Text>
          <TouchableOpacity onPress={onCancelEdit} style={styles.replyBarClose} hitSlop={12}>
            <MaterialIcons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.container}>
        {recording ? (
          <>
            <TouchableOpacity style={styles.iconBtn} onPress={discardVoice}>
              <MaterialIcons name="delete-outline" size={24} color={colors.error} />
            </TouchableOpacity>
            <RecordingAnimation colors={colors} />
            <TouchableOpacity
              style={[styles.iconBtn, styles.iconBtnRecording]}
              onPress={toggleVoice}
              disabled={uploading}
            >
              <MaterialIcons name="stop" size={24} color={colors.error} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            {!isEditMode && (
              pendingMedia ? (
                <View style={styles.mediaPreviewWrap}>
                  <Image source={{ uri: pendingMedia.uri }} style={styles.mediaPreviewImg} resizeMode="cover" />
                  <View style={styles.mediaProgressOverlay}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={openPlusMenu}
                  disabled={disabled || uploading}
                >
                  <MaterialIcons name="add" size={26} color={colors.primary} />
                </TouchableOpacity>
              )
            )}
            <TextInput
              style={styles.input}
              placeholder={isEditMode ? "Edit message..." : "Message..."}
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={4096}
              editable={!disabled}
              onSubmitEditing={handleSendText}
            />
            {!isEditMode && (
              <>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={toggleVoice}
                  disabled={disabled || uploading}
                >
                  <MaterialIcons name="mic" size={24} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={takePhoto}
                  disabled={disabled || uploading}
                >
                  <MaterialIcons name="camera-alt" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={[styles.sendBtn, (!canSendText || disabled) && styles.sendBtnDisabled]}
              onPress={handleSendText}
              disabled={!canSendText || disabled}
            >
              <Text style={styles.sendLabel}>{isEditMode ? "Save" : "Send"}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal visible={pollModalVisible} transparent animationType="fade" onRequestClose={() => setPollModalVisible(false)}>
        <Pressable style={styles.plusMenuOverlay} onPress={() => setPollModalVisible(false)}>
          <Pressable style={[styles.pollModalBox, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pollModalHeader}>
              <MaterialIcons name="poll" size={24} color={colors.primary} />
              <Text style={[styles.pollModalTitle, { color: colors.text }]}>New poll</Text>
            </View>
            <Text style={[styles.pollModalLabel, { color: colors.textMuted }]}>Question</Text>
            <TextInput
              style={[styles.pollInput, { backgroundColor: colors.surfaceLight, color: colors.text, borderColor: colors.border }]}
              placeholder="Ask a question..."
              placeholderTextColor={colors.textMuted}
              value={pollQuestion}
              onChangeText={setPollQuestion}
            />
            <Text style={[styles.pollModalLabel, { color: colors.textMuted, marginTop: spacing.md }]}>Options (at least 2)</Text>
            {pollOptions.map((opt, i) => (
              <TextInput
                key={i}
                style={[styles.pollInput, { backgroundColor: colors.surfaceLight, color: colors.text, borderColor: colors.border }]}
                placeholder={`Option ${i + 1}`}
                placeholderTextColor={colors.textMuted}
                value={pollOptions[i]}
                onChangeText={(t) => setPollOptions((prev) => prev.map((o, j) => (j === i ? t : o)))}
              />
            ))}
            <TouchableOpacity style={styles.pollAddOpt} onPress={() => setPollOptions((p) => [...p, ""])}>
              <MaterialIcons name="add-circle-outline" size={22} color={colors.primary} />
              <Text style={[styles.plusMenuLabel, { color: colors.primary, fontWeight: "600" }]}>Add option</Text>
            </TouchableOpacity>
            <View style={styles.pollActions}>
              <TouchableOpacity style={styles.pollCancelBtn} onPress={() => setPollModalVisible(false)}>
                <Text style={[styles.plusMenuLabel, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={sendPoll} style={[styles.sendBtn, styles.pollSendBtn]}>
                <Text style={styles.sendLabel}>Send poll</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={plusMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPlusMenuVisible(false)}
      >
        <Pressable style={styles.plusMenuOverlay} onPress={() => setPlusMenuVisible(false)}>
          <Pressable style={[styles.plusMenuSheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.plusMenuHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.plusMenuTitle, { color: colors.textMuted }]}>Send</Text>
            {plusMenuOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.plusMenuItem, { borderBottomColor: colors.border }]}
                onPress={() => { opt.onPress(); }}
                activeOpacity={0.7}
              >
                <MaterialIcons name={opt.icon} size={24} color={colors.primary} />
                <Text style={[styles.plusMenuLabel, { color: colors.text }]}>{opt.label}</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.surface,
    },
    container: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.xs,
    },
    mediaPreviewWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: spacing.xs,
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
    },
    mediaPreviewImg: {
      width: 40,
      height: 40,
      borderRadius: 20,
      position: "absolute",
    },
    mediaProgressOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.35)",
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    plusMenuOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    plusMenuSheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    plusMenuHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: spacing.md,
    },
    plusMenuTitle: {
      fontSize: 13,
      fontWeight: "600",
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    plusMenuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      gap: spacing.md,
      borderBottomWidth: 1,
    },
    plusMenuLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: "500",
    },
    pollModalBox: {
      marginHorizontal: spacing.lg,
      padding: spacing.lg,
      borderRadius: 20,
      maxWidth: 400,
      alignSelf: "center",
      width: "100%",
    },
    pollModalHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    pollModalTitle: { fontSize: 18, fontWeight: "700" },
    pollModalLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
    pollInput: {
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 16,
      marginBottom: spacing.sm,
    },
    pollAddOpt: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.md,
      paddingVertical: spacing.sm,
    },
    pollActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    pollCancelBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
    pollSendBtn: { paddingHorizontal: spacing.lg },
    iconBtnRecording: {
      backgroundColor: colors.error + "20",
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 100,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginRight: spacing.xs,
      borderRadius: 20,
      backgroundColor: colors.surfaceLight,
      color: colors.text,
      fontSize: 15,
      ...Platform.select({ web: { outlineStyle: "none" }, default: {} }),
    },
    sendBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      justifyContent: "center",
      borderRadius: 20,
      backgroundColor: colors.primary,
    },
    sendBtnDisabled: {
      opacity: 0.5,
    },
    sendLabel: {
      color: colors.white,
      fontWeight: "600",
      fontSize: 14,
    },
    replyBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: colors.surfaceLight,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: spacing.sm,
    },
    replyBarLine: {
      width: 3,
      height: 32,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    replyBarText: {
      flex: 1,
      fontSize: 14,
      color: colors.textMuted,
    },
    replyBarClose: { padding: spacing.xs },
    editBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: colors.surfaceLight,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    editBarLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: colors.primary,
    },
  });
}
