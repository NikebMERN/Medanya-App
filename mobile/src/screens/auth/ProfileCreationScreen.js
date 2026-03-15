import React, { useState, useMemo, useEffect } from "react";
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
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import Logo from "../../components/ui/Logo";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import { updateMe, uploadAvatarAndSave } from "../../api/user.api";
import { webScreenContainer } from "../../theme/webLayout";

const BIO_MAX_WORDS = 120;
function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
function trimToMaxWords(text, max) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, max).join(" ");
}

function useLocationPermission() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCurrentNeighborhood = async (onResult) => {
    setError(null);
    setLoading(true);
    try {
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
        let Location;
        try {
          Location = await import("expo-location");
        } catch (modErr) {
          setError("Location not available. Run: npx expo install expo-location. Or enter your neighborhood manually.");
          setLoading(false);
          return;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission denied. Enter your neighborhood manually.");
          setLoading(false);
          return;
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }

      let neighborhood = null;
      try {
        if (Platform.OS === "web") {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          );
          const data = await res.json();
          if (data && data.address) {
            const parts = [
              data.address.city || data.address.town || data.address.village,
              data.address.state || data.address.region,
            ].filter(Boolean);
            if (parts.length > 0) neighborhood = parts.join(", ");
          }
        } else {
          const Location = await import("expo-location");
          const [address] = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          if (address) {
            const parts = [
              address.city,
              address.district,
              address.subregion,
              address.region,
            ].filter(Boolean);
            if (parts.length > 0) neighborhood = parts.join(", ");
          }
        }
      } catch (geoErr) {
        console.warn("Geocoding failed:", geoErr);
      }

      if (!neighborhood) {
        neighborhood = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
      onResult(neighborhood);
    } catch (e) {
      setError(
        e.message && e.message.includes("Cannot find module")
          ? "Location not available. Run: npx expo install expo-location. Or enter manually."
          : (e.message || "Could not get location. Enter manually.")
      );
    } finally {
      setLoading(false);
    }
  };

  return { getCurrentNeighborhood, locationLoading: loading, locationError: error };
}

export default function ProfileCreationScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [fullName, setFullName] = useState(user?.display_name ?? "");
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUri, setAvatarUri] = useState(user?.avatar_url ?? null);
  const [localAvatarUri, setLocalAvatarUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");

  const { getCurrentNeighborhood, locationLoading, locationError } = useLocationPermission();

  const handleUseMyLocation = () => {
    getCurrentNeighborhood(setNeighborhood);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ImagePicker.getPendingResultAsync) return;
      try {
        const pending = await ImagePicker.getPendingResultAsync();
        if (cancelled || !pending || pending.canceled) return;
        const uri = pending.assets?.[0]?.uri;
        if (!uri) return;
        setAvatarUri(uri);
        setLocalAvatarUri(uri);
        setUploadingAvatar(true);
        setError("");
        try {
          const res = await uploadAvatarAndSave(uri);
          const serverUrl = (res?.user?.avatar_url || res?.user?.avatarUrl || "").trim();
          if (serverUrl) {
            setAvatarUri(serverUrl);
            if (res.user) setAuth(token, { ...user, ...res.user });
          }
        } catch (_) {}
        setUploadingAvatar(false);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  const applyAvatarFromUri = async (uri) => {
    setLocalAvatarUri(uri);
    setAvatarUri(uri);
    setUploadingAvatar(true);
    setError("");
    try {
      const res = await uploadAvatarAndSave(uri);
      const serverUrl = (res?.user?.avatar_url || res?.user?.avatarUrl || res?.avatarUrl || "").trim();
      if (serverUrl) {
        setAvatarUri(serverUrl);
        if (res.user) setAuth(token, { ...user, ...res.user, avatar_url: serverUrl, avatarUrl: serverUrl });
      }
    } catch (uploadErr) {
      setError(uploadErr.response?.data?.error?.message || uploadErr.message || "Upload failed. You can skip and add later.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to photos to add a profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) await applyAvatarFromUri(result.assets[0].uri);
    } catch (err) {
      setError("Could not open gallery. Please try again.");
      setUploadingAvatar(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow camera access to take a profile photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) await applyAvatarFromUri(result.assets[0].uri);
    } catch (err) {
      setError("Could not open camera. Please try again.");
      setUploadingAvatar(false);
    }
  };

  const showPhotoOptions = () => {
    if (uploadingAvatar) return;
    Alert.alert("Profile photo", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickImage },
    ]);
  };

  const handleJoinCommunity = async () => {
    const name = fullName.trim();
    const neigh = neighborhood.trim();
    const mail = email.trim();

    if (!name || name.length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (!mail) {
      setError("Please enter your email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError("Please enter a valid email address.");
      return;
    }

    const bioTrimmed = bio.trim();
    if (countWords(bioTrimmed) > BIO_MAX_WORDS) {
      setError(`Bio must be at most ${BIO_MAX_WORDS} words.`);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const avatarUrlToSend = avatarUri && (avatarUri.startsWith("http://") || avatarUri.startsWith("https://")) ? avatarUri : undefined;
      const res = await updateMe({
        displayName: name,
        email: mail,
        neighborhood: neigh || undefined,
        bio: bioTrimmed || undefined,
        ...(avatarUrlToSend && { avatarUrl: avatarUrlToSend }),
      });
      if (res.user) {
        setAuth(token, { ...user, ...res.user });
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, webScreenContainer]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            useAuthStore.getState().logout();
          }
        }}
      >
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Logo small />

        <Text style={styles.screenTitle}>Profile Creation</Text>
        <Text style={styles.hint}>Help the community identify you</Text>

        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={showPhotoOptions}
          disabled={uploadingAvatar}
          activeOpacity={0.8}
        >
          {(avatarUri || localAvatarUri) ? (
            <Image
              source={{ uri: avatarUri || localAvatarUri }}
              style={styles.avatarImage}
              key={avatarUri || localAvatarUri}
              onError={() => {
                if (localAvatarUri) setAvatarUri(localAvatarUri);
              }}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>📷</Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.avatarBadgeIcon}>📱</Text>
            )}
          </View>
        </TouchableOpacity>

        <Input
          label="FULL NAME *"
          value={fullName}
          onChangeText={(t) => { setFullName(t); setError(""); }}
          placeholder="e.g. Joy Santos"
          autoCapitalize="words"
        />

        <View style={styles.neighborhoodRow}>
          <Input
            label="CURRENT NEIGHBORHOOD"
            value={neighborhood}
            onChangeText={(t) => { setNeighborhood(t); setError(""); }}
            placeholder="e.g. Satwa, Dubai"
            style={styles.neighborhoodInput}
          />
          <TouchableOpacity
            style={[styles.locationBtn, locationLoading && styles.locationBtnDisabled]}
            onPress={handleUseMyLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.locationBtnText}>Use my location</Text>
            )}
          </TouchableOpacity>
        </View>
        {locationError ? <Text style={styles.locationError}>{locationError}</Text> : null}

        <Input
          label={`BIO (max ${BIO_MAX_WORDS} words)`}
          value={bio}
          onChangeText={(t) => {
            if (countWords(t) > BIO_MAX_WORDS) setBio(trimToMaxWords(t, BIO_MAX_WORDS));
            else setBio(t);
            setError("");
          }}
          placeholder="About you (optional, max 120 words)"
          multiline
          numberOfLines={3}
        />
        <Input
          label="EMAIL *"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(""); }}
          placeholder="e.g. joy@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          onSubmit={handleJoinCommunity}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title="JOIN COMMUNITY"
          onPress={handleJoinCommunity}
          loading={loading}
          style={styles.submitBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    backBtn: {
      position: "absolute",
      left: spacing.md,
      top: 56,
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1,
    },
    backArrow: { color: colors.text, fontSize: 22, fontWeight: "600" },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xl,
    },
    screenTitle: {
      color: colors.text,
      fontSize: 26,
      fontWeight: "800",
      marginBottom: spacing.xs,
    },
    hint: {
      color: colors.textSecondary,
      fontSize: 14,
      marginBottom: spacing.lg,
    },
    avatarWrap: {
      alignSelf: "center",
      marginBottom: spacing.lg,
    },
    avatarImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarPlaceholderText: { fontSize: 40 },
    avatarBadge: {
      position: "absolute",
      right: 0,
      bottom: 0,
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarBadgeIcon: { fontSize: 18 },
    neighborhoodRow: { marginBottom: spacing.md },
    neighborhoodInput: { marginBottom: spacing.sm },
    locationBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignSelf: "flex-start",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    locationBtnDisabled: { opacity: 0.7 },
    locationBtnText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
    locationError: { color: colors.error, fontSize: 12, marginBottom: spacing.sm },
    error: { color: colors.error, fontSize: 13, marginBottom: spacing.sm },
    submitBtn: { marginTop: spacing.md },
  });
}
