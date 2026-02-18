import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { MaterialIcons } from "@expo/vector-icons";
import * as videosApi from "../../api/videos.api";
import ReportModal from "./ReportModal";

export default function VideoDetailScreen({ route, navigation }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const videoId = route?.params?.videoId;
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const v = await videosApi.getVideo(videoId);
      setVideo(v);
      const c = await videosApi.listComments(videoId, { page: 1, limit: 30 });
      setComments(c.comments || []);
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Failed to load video");
      navigation?.goBack?.();
    } finally {
      setLoading(false);
    }
  }, [videoId, navigation]);

  useEffect(() => {
    if (videoId) load();
  }, [videoId, load]);

  const submitComment = useCallback(async () => {
    const text = String(commentText || "").trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const res = await videosApi.addComment(videoId, text);
      const newComment = res?.comment || res?.data?.comment;
      if (newComment) setComments((prev) => [newComment, ...prev]);
      setCommentText("");
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Failed to comment");
    } finally {
      setSubmitting(false);
    }
  }, [commentText, videoId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>Video</Text>
        <TouchableOpacity onPress={() => setReportOpen(true)} style={styles.iconBtn}>
          <MaterialIcons name="flag" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.caption}>{video?.caption || "Untitled video"}</Text>
        <Text style={styles.status}>Status: {String(video?.status || "").toUpperCase()}</Text>
      </View>

      <View style={styles.commentBox}>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Write a comment..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TouchableOpacity onPress={submitComment} disabled={submitting} style={styles.sendBtn}>
          {submitting ? <ActivityIndicator size="small" color={colors.white} /> : <MaterialIcons name="send" size={18} color={colors.white} />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={comments}
        keyExtractor={(item) => String(item._id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.commentItem}>
            <Text style={styles.commentText}>{item.text}</Text>
            <Text style={styles.commentMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No comments yet.</Text>}
      />

      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={async (reason) => {
          try {
            await videosApi.reportVideo(videoId, reason);
            Alert.alert("Reported", "Report received. Thank you.");
          } catch (e) {
            Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Failed to report");
          }
        }}
      />
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconBtn: { padding: spacing.sm },
    title: { color: colors.text, fontSize: 16, fontWeight: "800" },
    body: { padding: spacing.lg },
    caption: { color: colors.text, fontSize: 18, fontWeight: "800" },
    status: { color: colors.textSecondary, marginTop: spacing.xs },
    commentBox: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
    input: { flex: 1, backgroundColor: colors.surfaceLight, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: spacing.md, color: colors.text },
    sendBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 14, justifyContent: "center", alignItems: "center" },
    listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
    commentItem: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    commentText: { color: colors.text, fontSize: 14, fontWeight: "600" },
    commentMeta: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
    empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
  });
}

