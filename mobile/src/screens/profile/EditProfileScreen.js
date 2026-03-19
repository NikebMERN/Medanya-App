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
  Switch,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import DateOfBirthPicker from "../../components/ui/DateOfBirthPicker";
import SubScreenHeader from "../../components/SubScreenHeader";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import { updateMe, uploadAvatarAndSave } from "../../api/user.api";
import { ageFromDob } from "../../utils/age";

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

  const updateLocation = async (onResult) => {
    setError(null);
    setLoading(true);
    try {
      let latitude, longitude;

      if (Platform.OS === "web") {
        // Fallback for web since expo-location can have issues
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
        const Location = await import("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError(
            "Location permission denied. Allow in device settings to update your location."
          );
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

      onResult({ lastLat: latitude, lastLng: longitude, neighborhood });
    } catch (e) {
      setError(
        e.message?.includes("Cannot find module")
          ? "Install expo-location: npx expo install expo-location"
          : e.message || "Could not get location."
      );
    } finally {
      setLoading(false);
    }
  };

  return { updateLocation, locationLoading: loading, locationError: error };
}

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, setAuth, token } = useAuthStore();
  const initialUser = route.params?.user ?? user;

  const [displayName, setDisplayName] = useState(
    initialUser?.display_name ?? initialUser?.displayName ?? ""
  );
  const [fullName, setFullName] = useState(
    initialUser?.full_name ?? initialUser?.fullName ?? ""
  );
  const [dob, setDob] = useState(
    initialUser?.dob ?? ""
  );
  const [email, setEmail] = useState(initialUser?.email ?? "");
  const [neighborhood, setNeighborhood] = useState(
    initialUser?.neighborhood ?? ""
  );
  const [bio, setBio] = useState(initialUser?.bio ?? "");
  const [accountPrivate, setAccountPrivate] = useState(() =>
    Boolean(
      initialUser?.account_private ??
      initialUser?.accountPrivate ??
      user?.account_private ??
      user?.accountPrivate
    )
  );
  const [avatarUri, setAvatarUri] = useState(
    initialUser?.avatar_url ?? initialUser?.avatarUrl ?? null
  );
  const [localAvatarUri, setLocalAvatarUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [locationUpdating, setLocationUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");

  const { updateLocation, locationLoading, locationError } =
    useLocationPermission();

  // Legal data (full name, DOB) is locked once user has provided a full legal name
  const isLegalLocked = !!String(
    initialUser?.full_name ?? initialUser?.fullName ?? ""
  ).trim();

  useEffect(() => {
    const isPrivate = Boolean(
      user?.account_private ??
      user?.accountPrivate ??
      initialUser?.account_private ??
      initialUser?.accountPrivate
    );
    setAccountPrivate(isPrivate);
  }, []);

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
          const serverUrl = (
            res?.user?.avatar_url ||
            res?.user?.avatarUrl ||
            ""
          ).trim();
          if (serverUrl) setAvatarUri(serverUrl);
          // Do NOT update auth store — header stays old until user taps Save
        } catch (_) { }
        setUploadingAvatar(false);
      } catch (_) { }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyAvatarFromUri = async (uri) => {
    setLocalAvatarUri(uri);
    setAvatarUri(uri);
    setUploadingAvatar(true);
    setError("");
    try {
      const res = await uploadAvatarAndSave(uri);
      const serverUrl = (res?.user?.avatar_url || res?.user?.avatarUrl || res?.avatarUrl || "").trim();
      if (serverUrl) setAvatarUri(serverUrl);
    } catch (uploadErr) {
      setError(uploadErr.response?.data?.error?.message || uploadErr.message || "Upload failed. Preview kept.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to photos to change your profile picture.");
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

  const handleUpdateLocation = () => {
    setError("");
    updateLocation(async (payload) => {
      setLocationUpdating(true);
      try {
        const body = {
          lastLat: payload.lastLat,
          lastLng: payload.lastLng,
        };
        if (payload.neighborhood != null && payload.neighborhood !== "") {
          body.neighborhood = payload.neighborhood;
        }
        const res = await updateMe(body);
        if (res?.user) {
          setAuth(token, { ...user, ...res.user });
          if (payload.neighborhood != null)
            setNeighborhood(payload.neighborhood);
          Alert.alert("Done", "Your location has been updated.");
        } else {
          setError("Location updated but could not refresh profile.");
        }
      } catch (err) {
        const msg =
          err.response?.data?.error?.message ||
          err.message ||
          "Failed to update location.";
        setError(msg);
      } finally {
        setLocationUpdating(false);
      }
    });
  };

  const handleSave = async () => {
    const name = displayName.trim();
    if (!name || name.length < 2) {
      setError("Display name must be at least 2 characters.");
      return;
    }
    if (!email?.trim()) {
      setError("Email is required.");
      return;
    }
    if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const avatarUrlToSend =
        avatarUri &&
          (avatarUri.startsWith("http://") || avatarUri.startsWith("https://"))
          ? avatarUri
          : undefined;
      const bioTrimmed = bio.trim();
      if (countWords(bioTrimmed) > BIO_MAX_WORDS) {
        setError(`Bio must be at most ${BIO_MAX_WORDS} words.`);
        setSaving(false);
        return;
      }
      const payload = {
        displayName: name,
        ...(!isLegalLocked && {
          fullName: fullName.trim() || undefined,
          dob: dob.trim() || undefined,
        }),
        email: email.trim(),
        neighborhood: neighborhood.trim() || undefined,
        bio: bioTrimmed || undefined,
        accountPrivate: Boolean(accountPrivate),
        ...(avatarUrlToSend && { avatarUrl: avatarUrlToSend }),
      };
      const res = await updateMe(payload);
      const updatedUser = res?.user;
      if (updatedUser) {
        const avatarUrlFromServer =
          updatedUser?.avatar_url ?? updatedUser?.avatarUrl ?? avatarUrlToSend ?? user?.avatar_url ?? user?.avatarUrl;
        setAuth(token, {
          ...user,
          ...updatedUser,
          avatar_url: avatarUrlFromServer,
          avatarUrl: avatarUrlFromServer,
        });
        // Alert.alert("Saved", "Your profile has been updated.", [
        //   { text: "OK", onPress: () => navigation.goBack() },
        // ]);
        navigation.goBack()
      } else {
        setError("Save succeeded but could not refresh profile.");
      }
    } catch (err) {
      setError(
        err.response?.data?.error?.message || err.message || "Failed to save."
      );
    } finally {
      setSaving(false);
    }
  };

  const insets = useSafeAreaInsets();
  const tabNav = navigation.getParent?.() ?? navigation;
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SubScreenHeader
        title="Edit profile"
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
          {(avatarUri || localAvatarUri) ? (
            <Image
              source={{ uri: avatarUri || localAvatarUri }}
              style={styles.avatar}
              key={avatarUri || localAvatarUri}
              onError={() => {
                if (localAvatarUri) setAvatarUri(localAvatarUri);
              }}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons
                name="person"
                size={40}
                color={colors.textSecondary}
              />
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
          label="Display name"
          value={displayName}
          onChangeText={(t) => {
            setDisplayName(t);
            setError("");
          }}
          placeholder="Your name"
        />
        <Input
          label={`Full legal name (for identity verification)${isLegalLocked ? " — locked" : ""}`}
          value={fullName}
          onChangeText={(t) => {
            setFullName(t);
            setError("");
          }}
          placeholder="As on ID document"
          editable={!isLegalLocked}
        />
        <DateOfBirthPicker
          label="Date of birth"
          value={dob}
          onChange={(v) => {
            setDob(v);
            setError("");
          }}
          placeholder="Select your date of birth"
          editable={!isLegalLocked}
        />
        {dob.trim() && ageFromDob(dob) != null && (
          <Text style={styles.ageHint}>Age: {ageFromDob(dob)} years old</Text>
        )}
        <Input
          label="Email"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError("");
          }}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Neighborhood"
          value={neighborhood}
          onChangeText={(t) => {
            setNeighborhood(t);
            setError("");
          }}
          placeholder="e.g. Satwa, Dubai"
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Private account</Text>
          <Text style={styles.switchHint}>
            When on, new followers need your approval
          </Text>
          <Switch
            value={accountPrivate}
            onValueChange={setAccountPrivate}
            trackColor={{ false: colors.border, true: colors.primary + "80" }}
            thumbColor={accountPrivate ? colors.primary : colors.textSecondary}
          />
        </View>

        <View style={styles.bioRow}>
          <Input
            label={`Bio (max ${BIO_MAX_WORDS} words)`}
            value={bio}
            onChangeText={(t) => {
              if (countWords(t) > BIO_MAX_WORDS)
                setBio(trimToMaxWords(t, BIO_MAX_WORDS));
              else setBio(t);
              setError("");
            }}
            placeholder="About you (max 120 words)"
            multiline
            numberOfLines={3}
          />
          <Text style={styles.wordCount}>
            {countWords(bio)} / {BIO_MAX_WORDS} words
          </Text>
        </View>

        <View style={styles.locationSection}>
          <Text style={styles.sectionLabel}>Location</Text>
          <Text style={styles.sectionHint}>
            Update your last known location so the app can use it when needed.
          </Text>
          <Button
            title={
              locationLoading
                ? "Getting location…"
                : locationUpdating
                  ? "Saving…"
                  : "Update my location"
            }
            onPress={handleUpdateLocation}
            loading={locationLoading || locationUpdating}
            disabled={locationLoading || locationUpdating}
            style={styles.locationBtn}
          />
          {locationError ? (
            <Text style={styles.locationError}>{locationError}</Text>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title="Save changes"
          onPress={handleSave}
          loading={saving}
          style={styles.saveBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
    backRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
      gap: spacing.xs,
    },
    backLabel: { fontSize: 17, fontWeight: "600", color: colors.text },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.lg,
    },
    avatarWrap: { alignSelf: "center", marginBottom: spacing.lg },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarBadge: {
      position: "absolute",
      right: 0,
      bottom: 0,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    ageHint: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: -spacing.sm,
      marginBottom: spacing.lg,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.lg,
      flexWrap: "wrap",
    },
    switchLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
    switchHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
      marginBottom: 8,
      width: "100%",
    },
    bioRow: { marginBottom: spacing.lg },
    wordCount: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: -spacing.sm,
      marginBottom: spacing.sm,
    },
    locationSection: { marginBottom: spacing.lg },
    sectionLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    sectionHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    locationBtn: { marginBottom: spacing.sm },
    locationError: {
      color: colors.error,
      fontSize: 12,
      marginBottom: spacing.sm,
    },
    error: { color: colors.error, fontSize: 13, marginBottom: spacing.sm },
    saveBtn: { marginTop: spacing.md },
  });
}
