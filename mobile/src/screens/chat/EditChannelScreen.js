import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import SubScreenHeader from "../../components/SubScreenHeader";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import * as chatApi from "../../services/chat.api";
import { uploadToCloudinary } from "../../utils/env";
import { useChatStore } from "../../store/chat.store";

export default function EditChannelScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const chatId = route.params?.chatId;
  const initialChannelName = route.params?.groupName ?? "";
  const initialGroupAvatarUrl = route.params?.groupAvatarUrl ?? "";
  const updateChatInList = useChatStore((s) => s.updateChatInList);

  const [channelName, setChannelName] = useState(initialChannelName);
  const [avatarUrl, setAvatarUrl] = useState(initialGroupAvatarUrl);
  const [localAvatarUri, setLocalAvatarUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");

  const addAvatarFromUri = useCallback(async (uri) => {
    setLocalAvatarUri(uri);
    setUploadingAvatar(true);
    setError("");
    try {
      const url = await uploadToCloudinary(uri, "image");
      if (url) setAvatarUrl(url);
    } catch (e) {
      setError(e?.message ?? "Upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  }, []);

  const pickImage = useCallback(async () => {
    if (!chatId) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to photos to set channel photo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      await addAvatarFromUri(result.assets[0].uri);
    } catch (e) {
      setError(e?.message ?? "Could not open gallery.");
      setUploadingAvatar(false);
    }
  }, [chatId, addAvatarFromUri]);

  const takePhoto = useCallback(async () => {
    if (!chatId) return;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow camera access to set channel photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      await addAvatarFromUri(result.assets[0].uri);
    } catch (e) {
      setError(e?.message ?? "Could not open camera.");
      setUploadingAvatar(false);
    }
  }, [chatId, addAvatarFromUri]);

  const showPhotoOptions = useCallback(() => {
    if (uploadingAvatar) return;
    Alert.alert("Channel photo", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickImage },
    ]);
  }, [uploadingAvatar, takePhoto, pickImage]);

  const handleSave = useCallback(async () => {
    const name = (channelName || "").trim();
    if (!name || name.length < 2) {
      setError("Channel name must be at least 2 characters.");
      return;
    }
    if (!chatId) return;
    setSaving(true);
    setError("");
    try {
      await chatApi.setGroupName(chatId, name);
      if (avatarUrl !== initialGroupAvatarUrl) {
        await chatApi.setGroupAvatar(chatId, avatarUrl);
      }
      updateChatInList(chatId, { groupName: name, groupAvatarUrl: avatarUrl || "" });
      navigation.goBack();
    } catch (e) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  }, [chatId, channelName, avatarUrl, initialGroupAvatarUrl, navigation, updateChatInList]);

  const tabNav = navigation.getParent?.() ?? navigation;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + spacing.sm }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SubScreenHeader
        title="Edit channel"
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={tabNav}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={showPhotoOptions}
          disabled={uploadingAvatar}
        >
          {(avatarUrl || localAvatarUri) ? (
            <Image
              source={{ uri: avatarUrl || localAvatarUri }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons name="campaign" size={48} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.avatarBadge}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <MaterialIcons name="camera-alt" size={20} color={colors.white} />
            )}
          </View>
        </TouchableOpacity>

        <Input
          label="Channel name"
          value={channelName}
          onChangeText={(t) => {
            setChannelName(t);
            setError("");
          }}
          placeholder="Channel name"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Save" onPress={handleSave} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
    avatarWrap: {
      alignSelf: "center",
      marginBottom: spacing.xl,
      position: "relative",
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    error: {
      color: colors.error ?? "#dc2626",
      fontSize: 14,
      marginBottom: spacing.md,
    },
  });
}
