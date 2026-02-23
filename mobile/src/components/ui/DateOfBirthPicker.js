/**
 * Date of birth picker — select-style (no typing).
 * Pure JS implementation, no native datetime picker dependency.
 */
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MIN_YEAR = 1920;
const MAX_YEAR = new Date().getFullYear();

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * @param {Object} props
 * @param {string} [props.value] - YYYY-MM-DD string or empty
 * @param {function(string)} props.onChange - Called with YYYY-MM-DD
 * @param {string} [props.label]
 * @param {string} [props.placeholder]
 */
export default function DateOfBirthPicker({ value, onChange, label, placeholder = "Select date" }) {
  const colors = useThemeColors();
  const [show, setShow] = useState(false);

  const parsed = useMemo(() => {
    if (!value) return { year: 2000, month: 0, day: 1 };
    const [y, m, d] = value.split("-").map(Number);
    return {
      year: y && y >= MIN_YEAR && y <= MAX_YEAR ? y : 2000,
      month: m && m >= 1 && m <= 12 ? m - 1 : 0,
      day: d && d >= 1 ? Math.min(d, 31) : 1,
    };
  }, [value]);

  const [year, setYear] = useState(parsed.year);
  const [month, setMonth] = useState(parsed.month);
  const [day, setDay] = useState(parsed.day);

  const years = useMemo(
    () => Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MAX_YEAR - i),
    []
  );
  const maxDay = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const days = useMemo(() => Array.from({ length: maxDay }, (_, i) => i + 1), [maxDay]);

  const openPicker = () => {
    const maxD = getDaysInMonth(parsed.year, parsed.month);
    setYear(parsed.year);
    setMonth(parsed.month);
    setDay(Math.min(parsed.day, maxD));
    setShow(true);
  };

  const confirm = () => {
    const d = Math.min(day, getDaysInMonth(year, month));
    const m = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    onChange(`${year}-${m}-${dd}`);
    setShow(false);
  };

  const displayText = value ? formatDisplay(value) : placeholder;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text> : null}
      <TouchableOpacity
        style={[
          styles.touchable,
          { backgroundColor: colors.surfaceLight, borderColor: colors.border },
        ]}
        onPress={openPicker}
        activeOpacity={0.7}
      >
        <MaterialIcons name="event" size={20} color={colors.text} />
        <Text style={[styles.text, { color: value ? colors.text : colors.textMuted }]}>
          {displayText}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShow(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select date</Text>
            <View style={styles.pickerRow}>
              <View style={styles.pickerCol}>
                <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>Day</Text>
                <ScrollView style={[styles.pickerScroll, { backgroundColor: colors.surfaceLight }]} showsVerticalScrollIndicator>
                  {days.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.pickerItem, day === d && { backgroundColor: colors.primary + "30" }]}
                      onPress={() => setDay(d)}
                    >
                      <Text style={[styles.pickerItemText, { color: colors.text }]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.pickerCol}>
                <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>Month</Text>
                <ScrollView style={[styles.pickerScroll, { backgroundColor: colors.surfaceLight }]} showsVerticalScrollIndicator>
                  {MONTHS.map((m, i) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.pickerItem, month === i && { backgroundColor: colors.primary + "30" }]}
                      onPress={() => setMonth(i)}
                    >
                      <Text style={[styles.pickerItemText, { color: colors.text }]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.pickerCol}>
                <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>Year</Text>
                <ScrollView style={[styles.pickerScroll, { backgroundColor: colors.surfaceLight }]} showsVerticalScrollIndicator>
                  {years.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.pickerItem, year === y && { backgroundColor: colors.primary + "30" }]}
                      onPress={() => setYear(y)}
                    >
                      <Text style={[styles.pickerItemText, { color: colors.text }]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShow(false)}>
                <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={confirm}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function formatDisplay(iso) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const mi = parseInt(m, 10) - 1;
  return `${MONTHS[mi] || m} ${parseInt(d, 10)}, ${y}`;
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  touchable: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
  },
  text: { flex: 1, fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: spacing.lg },
  pickerRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  pickerCol: { flex: 1 },
  pickerLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  pickerScroll: { height: 160, borderRadius: 12 },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  pickerItemText: { fontSize: 16 },
  modalActions: { flexDirection: "row", gap: spacing.md },
  cancelBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelText: { fontSize: 16, fontWeight: "600" },
  doneBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },
  doneText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});
