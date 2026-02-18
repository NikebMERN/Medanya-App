import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";

const REASONS = [
  { id: "nudity", label: "Nudity" },
  { id: "sexual", label: "Sexual content" },
  { id: "gore", label: "Gore / violence" },
  { id: "hate", label: "Hate" },
  { id: "harassment", label: "Harassment" },
  { id: "scam", label: "Scam / fraud" },
  { id: "child_safety", label: "Child safety" },
  { id: "other", label: "Other" },
];

export default function ReportModal({ visible, onClose, onSubmit }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState("other");

  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Report</Text>
          <Text style={styles.subtitle}>Select a reason</Text>
          <View style={styles.list}>
            {REASONS.map((r) => (
              <TouchableOpacity key={r.id} style={[styles.item, selected === r.id && styles.itemActive]} onPress={() => setSelected(r.id)}>
                <Text style={[styles.itemText, selected === r.id && styles.itemTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                await onSubmit?.(selected);
                onClose?.();
              }}
              style={styles.submitBtn}
            >
              <Text style={styles.submitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: { backgroundColor: colors.background, padding: spacing.lg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: colors.border },
    title: { color: colors.text, fontSize: 18, fontWeight: "800" },
    subtitle: { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md },
    list: { gap: spacing.xs },
    item: { padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    itemActive: { borderColor: colors.primary, backgroundColor: colors.primary + "12" },
    itemText: { color: colors.text, fontWeight: "700" },
    itemTextActive: { color: colors.primary },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.lg },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
    cancelText: { color: colors.textSecondary, fontWeight: "800" },
    submitBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.primary },
    submitText: { color: colors.white, fontWeight: "800" },
  });
}

