import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useHeaderBack } from "../../context/HeaderBackContext";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { getFollowRequests, acceptFollowRequest, rejectFollowRequest } from "../../api/user.api";

export default function FollowRequestsScreen() {
  const navigation = useNavigation();
  const { setBackHandler } = useHeaderBack() || {};
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  useEffect(() => {
    if (!setBackHandler) return;
    setBackHandler(() => navigation.goBack());
    return () => setBackHandler(null);
  }, [navigation, setBackHandler]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getFollowRequests();
      setRequests(res?.requests ?? []);
    } catch (_) {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAccept = async (req) => {
    setActingId(req.id);
    try {
      await acceptFollowRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (_) {}
    setActingId(null);
  };

  const handleReject = async (req) => {
    setActingId(req.id);
    try {
      await rejectFollowRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (_) {}
    setActingId(null);
  };

  const renderItem = ({ item }) => {
    const acting = actingId === item.id;
    const displayName = item.display_name ?? "Someone";
    const avatarUrl = item.avatar_url ?? item.avatarUrl;

    return (
      <View style={styles.row}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.acceptBtn]}
            onPress={() => handleAccept(item)}
            disabled={acting}
          >
            {acting ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.acceptBtnText}>Accept</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.rejectBtn]}
            onPress={() => handleReject(item)}
            disabled={acting}
          >
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Follow requests</Text>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : requests.length === 0 ? (
        <Text style={styles.empty}>No pending requests</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    title: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    loader: { flex: 1, justifyContent: "center" },
    empty: {
      color: colors.textSecondary,
      fontSize: 16,
      paddingHorizontal: spacing.lg,
    },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarLetter: { fontSize: 20, fontWeight: "700", color: colors.white },
    name: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text, marginLeft: spacing.sm },
    actions: { flexDirection: "row", gap: spacing.sm },
    btn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    acceptBtn: { backgroundColor: colors.primary },
    acceptBtnText: { color: colors.white, fontWeight: "600" },
    rejectBtn: { borderWidth: 1, borderColor: colors.border },
    rejectBtnText: { color: colors.text, fontWeight: "600" },
  });
}
