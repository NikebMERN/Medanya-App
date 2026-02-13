import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";
import { uploadToCloudinary } from "../utils/env";

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
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const recordingRef = React.useRef(null);

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
    if (disabled || uploading) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to photos to send images and videos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.All ?? "all",
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const isVideo = (asset.type ?? asset.mimeType ?? "").toLowerCase().includes("video");
      const resourceType = isVideo ? "video" : "image";
      const type = isVideo ? "video" : "image";

      setUploading(true);
      const url = await uploadToCloudinary(uri, resourceType);
      setUploading(false);
      if (url) onSend({ type, mediaUrl: url });
    } catch (e) {
      setUploading(false);
      Alert.alert("Upload failed", e?.message ?? "Could not upload. Check Cloudinary config.");
    }
  }, [disabled, uploading, onSend]);

  const takePhoto = useCallback(async () => {
    if (disabled || uploading) return;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow camera access to take photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? "images",
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      setUploading(true);
      const url = await uploadToCloudinary(uri, "image");
      setUploading(false);
      if (url) onSend({ type: "image", mediaUrl: url });
    } catch (e) {
      setUploading(false);
      Alert.alert("Camera error", e?.message ?? "Could not take or upload photo.");
    }
  }, [disabled, uploading, onSend]);

  const showPlusMenu = useCallback(() => {
    if (disabled || uploading) return;
    const options = [
      "Image & Video",
      "File",
      "Location",
      "Poll",
      "Contact",
      "Cancel",
    ];
    const cancelIndex = 5;
    if (Platform.OS === "ios" && ActionSheetIOS?.showActionSheetWithOptions) {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        (i) => {
          if (i === 0) pickMedia();
          else if (i === 1) Alert.alert("Coming soon", "File sharing will be available soon.");
          else if (i === 2) Alert.alert("Coming soon", "Location sharing will be available soon.");
          else if (i === 3) Alert.alert("Coming soon", "Polls will be available soon.");
          else if (i === 4) Alert.alert("Coming soon", "Contact sharing will be available soon.");
        }
      );
    } else {
      Alert.alert("Send", "Choose an option", [
        { text: "Cancel", style: "cancel" },
        { text: "Image & Video", onPress: pickMedia },
        { text: "File", onPress: () => Alert.alert("Coming soon", "File sharing will be available soon.") },
        { text: "Location", onPress: () => Alert.alert("Coming soon", "Location sharing will be available soon.") },
        { text: "Poll", onPress: () => Alert.alert("Coming soon", "Polls will be available soon.") },
        { text: "Contact", onPress: () => Alert.alert("Coming soon", "Contact sharing will be available soon.") },
      ]);
    }
  }, [disabled, uploading, pickMedia]);

  const toggleVoice = useCallback(async () => {
    if (disabled || uploading) return;

    if (recording) {
      try {
        const r = recordingRef.current;
        if (r) {
          await r.stopAndUnloadAsync();
          const uri = r.getURI();
          if (uri) {
            setUploading(true);
            const url = await uploadToCloudinary(uri, "raw", "audio/m4a");
            setUploading(false);
            if (url) onSend({ type: "voice", mediaUrl: url });
          }
        }
      } catch (e) {
        setUploading(false);
        Alert.alert("Voice error", e?.message ?? "Could not send voice.");
      }
      setRecording(false);
      recordingRef.current = null;
      return;
    }

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow microphone access to send voice messages.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const { recording: r } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = r;
      setRecording(true);
    } catch (e) {
      Alert.alert("Recording failed", e?.message ?? "Could not start recording.");
    }
  }, [disabled, uploading, recording, onSend]);

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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
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
        {!isEditMode && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={showPlusMenu}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="add" size={26} color={colors.primary} />
            )}
          </TouchableOpacity>
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
              style={[styles.iconBtn, recording && styles.iconBtnRecording]}
              onPress={toggleVoice}
              disabled={disabled || uploading}
            >
              <MaterialIcons
                name={recording ? "stop" : "mic"}
                size={24}
                color={recording ? colors.error : colors.textMuted}
              />
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
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
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
