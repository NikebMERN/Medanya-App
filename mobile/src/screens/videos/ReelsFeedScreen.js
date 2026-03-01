import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useVideoViewTimer } from "../../hooks/useVideoViewTimer";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../theme/useThemeColors";
import { MaterialIcons } from "@expo/vector-icons";
import { useVideosStore } from "../../store/videos.store";
import { useAuthStore } from "../../store/auth.store";
import PinItemSheet from "../../components/PinItemSheet";
import BoostBottomSheet from "../../modules/support/components/BoostBottomSheet";

export default function ReelsFeedScreen({ navigation }) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const isGuest = useAuthStore((s) => s.user)?.isGuest ?? false;
  const itemHeight = windowHeight;
  const styles = useMemo(() => createStyles(colors, itemHeight), [colors, itemHeight]);
  const { videos, loading, loadMore, refresh, error, optimisticToggleLike } = useVideosStore();
  const [pinSheetVisible, setPinSheetVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [boostVisible, setBoostVisible] = useState(false);
  const [boostVideo, setBoostVideo] = useState(null);
  const [viewableIndex, setViewableIndex] = useState(null);
  const userId = useAuthStore((s) => s.user)?.id ?? useAuthStore((s) => s.user)?.userId;

  const currentVideo = viewableIndex != null && videos?.[viewableIndex] ? videos[viewableIndex] : null;

  useVideoViewTimer(!!(currentVideo && userId), {
    entityId: currentVideo?._id,
    entityType: "video",
    creatorId: currentVideo?.uploaderId ?? currentVideo?.createdBy,
  });

  const viewabilityConfig = useMemo(() => ({ viewAreaCoveragePercentThreshold: 50 }), []);
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    const v = viewableItems?.[0];
    setViewableIndex(v != null ? v.index : null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onEndReached = useCallback(() => {
    loadMore();
  }, [loadMore]);

  const renderItem = ({ item, index }) => (
    <View style={styles.page}>
      <View style={styles.videoPlaceholder}>
        <MaterialIcons name="videocam" size={64} color={colors.textMuted} />
        <Text style={styles.caption} numberOfLines={2}>{item.caption || "Untitled"}</Text>
      </View>
      <View style={[styles.overlay, { paddingBottom: insets.bottom + 80 }]}>
        <View style={styles.rightColumn}>
          <TouchableOpacity
            style={styles.iconStack}
            onPress={() => optimisticToggleLike(item._id, !(item._optimisticLiked ?? false), { creatorId: item.uploaderId ?? item.createdBy })}
          >
            <MaterialIcons name="favorite" size={32} color={(item._optimisticLiked ?? false) ? colors.error : colors.white} />
            <Text style={styles.countText}>{item.likeCount ?? 0}</Text>
          </TouchableOpacity>
          <View style={styles.iconStack}>
            <MaterialIcons name="chat-bubble-outline" size={32} color={colors.white} />
            <Text style={styles.countText}>{item.commentCount ?? 0}</Text>
          </View>
          <TouchableOpacity
            style={styles.iconStack}
            onPress={() => {
              setBoostVideo(item);
              setBoostVisible(true);
            }}
          >
            <MaterialIcons name="bolt" size={28} color={colors.white} />
            <Text style={styles.countText}>Boost</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconStack}
            onPress={() => {
              setSelectedVideo(item);
              setPinSheetVisible(true);
            }}
          >
            <MaterialIcons name="storefront" size={28} color={colors.white} />
            <Text style={styles.countText}>Shop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconStack}
            onPress={() => navigation?.navigate?.("VideoDetail", { videoId: item._id })}
          >
            <MaterialIcons name="open-in-new" size={28} color={colors.white} />
            <Text style={styles.countText}>Open</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading && (!videos || videos.length === 0)) {
    return (
      <View style={[styles.center, { height: itemHeight }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        keyExtractor={(item) => String(item._id)}
        renderItem={renderItem}
        pagingEnabled
        snapToInterval={itemHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({ length: itemHeight, offset: itemHeight * index, index })}
        ListEmptyComponent={
          <View style={[styles.center, { height: itemHeight }]}>
            <Text style={styles.emptyTitle}>No videos yet</Text>
            {!isGuest && (
              <TouchableOpacity style={styles.uploadBtn} onPress={() => navigation?.getParent?.()?.navigate?.("Create")}>
                <Text style={styles.uploadBtnText}>Create</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
      <PinItemSheet
        visible={pinSheetVisible}
        onClose={() => { setPinSheetVisible(false); setSelectedVideo(null); }}
        videoId={selectedVideo?._id}
        creatorId={selectedVideo?.uploaderId ?? selectedVideo?.createdBy}
        onItemPress={(listItem) => {
          const nav = navigation?.getParent?.()?.getParent?.() ?? navigation;
          nav?.navigate?.("Main", { screen: "Marketplace", params: { screen: "MarketplaceDetail", params: { itemId: listItem.id } } });
        }}
      />
      <BoostBottomSheet
        visible={boostVisible}
        onClose={() => { setBoostVisible(false); setBoostVideo(null); }}
        creatorId={boostVideo?.uploaderId ?? boostVideo?.createdBy}
        creatorName={boostVideo?.uploaderName ?? boostVideo?.createdByName}
        context="VIDEO"
        contextId={boostVideo?._id}
        isOwnContent={!!(userId && (boostVideo?.uploaderId ?? boostVideo?.createdBy) === userId)}
        onSuccess={() => refresh?.()}
        onRecharge={() => navigation?.getParent?.()?.getParent?.()?.navigate?.("Main", { screen: "Profile", params: { screen: "Recharge" } })}
      />
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <TouchableOpacity style={styles.topBarBtn} onPress={() => navigation?.goBack?.()}>
          <MaterialIcons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
        {!isGuest && (
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={() => navigation?.getParent?.()?.navigate?.("Create")}
          >
            <MaterialIcons name="add" size={28} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function createStyles(colors, itemHeight) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    page: { height: itemHeight, width: "100%", backgroundColor: colors.background },
    videoPlaceholder: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    caption: { color: colors.text, fontSize: 16, fontWeight: "600", marginTop: 16, textAlign: "center" },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "flex-end",
      alignItems: "flex-end",
      paddingRight: 12,
    },
    rightColumn: { alignItems: "center", gap: 20 },
    iconStack: { alignItems: "center" },
    countText: { color: colors.white, fontSize: 12, fontWeight: "600", marginTop: 2 },
    center: { justifyContent: "center", alignItems: "center", padding: 24 },
    emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
    uploadBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: colors.primary },
    uploadBtnText: { color: colors.white, fontWeight: "700" },
    topBar: { position: "absolute", left: 12, right: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", zIndex: 10 },
    topBarBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  });
}
