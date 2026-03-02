/**
 * KYC Step 1: Document upload.
 * Document type dropdown (like country codes), full doc number, upload images based on doc type.
 */
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
  FlatList,
  Pressable,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import { uploadToCloudinary } from "../../utils/env";
import { KYC_DOC_TYPES, DEFAULT_DOC_TYPE, isValidFaydaFin, normalizeFaydaFin } from "../../data/kycDocTypes";
import * as kycApi from "../../api/kyc.api";
import DateOfBirthPicker from "../../components/ui/DateOfBirthPicker";
import { normalizePlaceholder } from "../../components/ui/Input";
import { inputStyleAndroid } from "../../theme/inputStyles";

const PRIVACY_NOTICE =
  "We store your document number securely (encrypted). Images are stored privately and may be deleted after verification.";

export default function KycDocUploadScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [docType, setDocType] = useState(route.params?.docType ?? DEFAULT_DOC_TYPE);
  const [docNumber, setDocNumber] = useState(route.params?.docNumber ?? "");
  const [docFullName, setDocFullName] = useState(route.params?.docFullName ?? "");
  const [docBirthdate, setDocBirthdate] = useState(route.params?.docBirthdate ?? "");
  const [frontUri, setFrontUri] = useState(route.params?.frontUri ?? null);
  const [backUri, setBackUri] = useState(route.params?.backUri ?? null);
  const [consent, setConsent] = useState(false);
  const [docPickerVisible, setDocPickerVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  const docTypeConfig = useMemo(
    () => KYC_DOC_TYPES.find((t) => t.value === docType.value) || DEFAULT_DOC_TYPE,
    [docType]
  );
  const needsBack = docTypeConfig.uploadType === "dual";

  const pickFront = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: needsBack ? [4, 3] : [3, 2],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setFrontUri(result.assets[0].uri);
  }, [needsBack]);

  const takeFrontPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Allow camera access to capture document.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: needsBack ? [4, 3] : [3, 2],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setFrontUri(result.assets[0].uri);
  }, [needsBack]);

  const pickBack = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setBackUri(result.assets[0].uri);
  }, []);

  const takeBackPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Allow camera access to capture document.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setBackUri(result.assets[0].uri);
  }, []);

  const showFrontOptions = useCallback(() => {
    Alert.alert(docTypeConfig.uploadLabel, "", [
      { text: "Cancel", style: "cancel" },
      { text: "Take Photo", onPress: takeFrontPhoto },
      { text: "Choose from Library", onPress: pickFront },
    ]);
  }, [docTypeConfig.uploadLabel, takeFrontPhoto, pickFront]);

  const showBackOptions = useCallback(() => {
    Alert.alert(docTypeConfig.uploadLabelBack || "Document back", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Take Photo", onPress: takeBackPhoto },
      { text: "Choose from Library", onPress: pickBack },
    ]);
  }, [docTypeConfig.uploadLabelBack, takeBackPhoto, pickBack]);

  const openDocPicker = () => setDocPickerVisible(true);
  const closeDocPicker = () => setDocPickerVisible(false);
  const selectDocType = (item) => {
    setDocType(item);
    setDocNumber("");
    setFrontUri(null);
    setBackUri(null);
    closeDocPicker();
  };

  const handleContinue = useCallback(async () => {
    if (!frontUri) {
      Alert.alert("Required", `Upload ${docTypeConfig.uploadLabel}.`);
      return;
    }
    if (needsBack && !backUri) {
      Alert.alert("Required", docTypeConfig.uploadLabelBack || "Upload back of document.");
      return;
    }
    let docNum = String(docNumber || "").trim();
    if (!docNum) {
      Alert.alert("Required", "Document number is required.");
      return;
    }
    if (docType.value === "fayda") {
      if (!isValidFaydaFin(docNum)) {
        Alert.alert("Invalid FIN", "Fayda FIN must be exactly 12 digits. Enter the number from the back of your card.");
        return;
      }
      docNum = normalizeFaydaFin(docNum);
    }
    if (!consent) {
      Alert.alert("Consent required", "Please accept the privacy notice to continue.");
      return;
    }
    const nameOnDoc = String(docFullName || "").trim();
    if (!nameOnDoc) {
      Alert.alert("Required", "Enter your full name as shown on the document.");
      return;
    }
    const dobOnDoc = String(docBirthdate || "").trim();
    if (!dobOnDoc) {
      Alert.alert("Required", "Enter your date of birth as shown on the document (YYYY-MM-DD).");
      return;
    }

    setUploading(true);
    try {
      const [frontUrl, backUrlResult] = await Promise.all([
        uploadToCloudinary(frontUri, "image"),
        needsBack && backUri ? uploadToCloudinary(backUri, "image") : Promise.resolve(null),
      ]);
      const backUrl = needsBack ? backUrlResult : null;
      const backendDocType = docType.backendValue ?? docType.value;

      const result = await kycApi.submitKyc({
        docType: backendDocType,
        docNumber: docNum,
        frontImageUrl: frontUrl,
        backImageUrl: backUrl,
        fullName: nameOnDoc,
        birthdate: dobOnDoc,
        consent: true,
      });

      if (result?.dataMismatch && result?.requireDataChange) {
        navigation.navigate("KycMismatch", {
          submissionId: result.submissionId,
          extractedName: result.extractedName,
          extractedDob: result.extractedDob,
          docFullName: nameOnDoc,
          docBirthdate: dobOnDoc,
        });
      } else {
        Alert.alert("Submitted", "Your document has been submitted for verification.", [
          { text: "OK", onPress: () => navigation.navigate("Kyc") },
        ]);
      }
    } catch (e) {
      const msg = e?.response?.data?.error?.message ?? e?.message ?? "Could not submit.";
      Alert.alert("Error", msg);
    } finally {
      setUploading(false);
    }
  }, [docType, docNumber, docFullName, docBirthdate, frontUri, backUri, consent, needsBack, docTypeConfig, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SubScreenHeader
        title="Document upload"
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={navigation.getParent?.() ?? navigation}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.stepHint}>Step 1 of 2 — Upload your identity document</Text>

        <Text style={styles.sectionTitle}>Document type</Text>
        <TouchableOpacity
          style={styles.docTypeTouchable}
          onPress={openDocPicker}
          activeOpacity={0.7}
        >
          <Text style={styles.docTypeLabel}>DOCUMENT TYPE</Text>
          <View style={styles.docTypeValue}>
            <MaterialIcons name={docTypeConfig.icon || "description"} size={20} color={colors.text} />
            <Text style={styles.docTypeText}>{docTypeConfig.label}</Text>
            <Text style={styles.docTypeChevron}>▼</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Document images</Text>
        <Text style={styles.hint}>{docTypeConfig.uploadLabel}</Text>
        <TouchableOpacity style={styles.imageSlot} onPress={showFrontOptions}>
          {frontUri ? (
            <Image source={{ uri: frontUri }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialIcons name="add-a-photo" size={32} color={colors.textMuted} />
              <Text style={styles.imageLabel}>{docTypeConfig.uploadLabel}</Text>
            </View>
          )}
        </TouchableOpacity>

        {needsBack && (
          <>
            <Text style={styles.hint}>{docTypeConfig.uploadLabelBack}</Text>
            <TouchableOpacity style={styles.imageSlot} onPress={showBackOptions}>
              {backUri ? (
                <Image source={{ uri: backUri }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialIcons name="add-a-photo" size={32} color={colors.textMuted} />
                  <Text style={styles.imageLabel}>{docTypeConfig.uploadLabelBack}</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.sectionTitle}>Name as on document *</Text>
        <Text style={styles.hint}>Must match your profile full name for verification.</Text>
        <TextInput
          style={[styles.input, inputStyleAndroid]}
          placeholder={normalizePlaceholder("Full name as shown on ID")}
          placeholderTextColor={colors.textMuted}
          value={docFullName}
          onChangeText={setDocFullName}
          autoCapitalize="words"
        />

        <Text style={styles.sectionTitle}>Date of birth as on document *</Text>
        <Text style={styles.hint}>Must match your profile. Select the date from your document.</Text>
        <DateOfBirthPicker
          label=""
          value={docBirthdate}
          onChange={setDocBirthdate}
          placeholder="Select date from document"
        />

        <Text style={styles.sectionTitle}>Document number *</Text>
        <Text style={styles.hint}>{docTypeConfig.hint}</Text>
        <TextInput
          style={[styles.input, inputStyleAndroid]}
          placeholder={normalizePlaceholder(docTypeConfig.placeholder)}
          placeholderTextColor={colors.textMuted}
          value={docNumber}
          onChangeText={(t) => {
            const isFayda = (docTypeConfig?.value ?? docType?.value) === "fayda";
            if (isFayda) {
              const digits = t.replace(/\D/g, "").slice(0, 12);
              setDocNumber(digits);
            } else {
              setDocNumber(t);
            }
          }}
          keyboardType={(docTypeConfig?.value ?? docType?.value) === "fayda" ? "number-pad" : "default"}
          maxLength={(docTypeConfig?.value ?? docType?.value) === "fayda" ? 12 : undefined}
          autoCapitalize="none"
          editable
        />

        <View style={styles.consentRow}>
          <Switch value={consent} onValueChange={setConsent} />
          <Text style={styles.consentText}>I consent to submit my ID for verification. {PRIVACY_NOTICE}</Text>
        </View>

        <TouchableOpacity
          style={[styles.continueBtn, uploading && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.continueBtnText}>Continue to selfie →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={docPickerVisible} transparent animationType="slide" onRequestClose={closeDocPicker}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDocPicker} />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select document type</Text>
            <FlatList
              data={KYC_DOC_TYPES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.docRow,
                    { backgroundColor: colors.surfaceLight },
                    item.value === docType.value && { backgroundColor: colors.primary + "30" },
                  ]}
                  onPress={() => selectDocType(item)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name={item.icon || "description"} size={24} color={colors.text} />
                  <Text style={[styles.docRowLabel, { color: colors.text }]}>{item.label}</Text>
                  {item.value === docType.value && (
                    <MaterialIcons name="check" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.docList}
            />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={closeDocPicker}>
              <Text style={[styles.modalCloseText, { color: colors.primary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 3 },
    stepHint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg },
    sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
    docTypeTouchable: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    docTypeLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5, marginBottom: 4 },
    docTypeValue: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    docTypeText: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1 },
    docTypeChevron: { fontSize: 12, color: colors.textMuted },
    hint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs },
    imageSlot: { aspectRatio: 4 / 3, borderRadius: 12, overflow: "hidden", marginBottom: spacing.md },
    thumb: { width: "100%", height: "100%" },
    imagePlaceholder: {
      flex: 1,
      aspectRatio: 4 / 3,
      borderRadius: 12,
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    imageLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    input: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: spacing.md,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.sm,
    },
    consentRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.lg },
    consentText: { flex: 1, fontSize: 13, color: colors.textSecondary },
    continueBtn: {
      marginTop: spacing.xl,
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: spacing.md,
      alignItems: "center",
    },
    continueBtnDisabled: { opacity: 0.7 },
    continueBtnText: { fontSize: 16, fontWeight: "600", color: colors.white },
    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: spacing.xl,
      maxHeight: "70%",
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    modalTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: spacing.md },
    docList: { maxHeight: 320 },
    docRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.md,
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.xs,
      borderRadius: 12,
    },
    docRowLabel: { flex: 1, fontSize: 16, fontWeight: "600" },
    modalCloseBtn: { alignSelf: "center", padding: spacing.md, marginTop: spacing.sm },
    modalCloseText: { fontSize: 16, fontWeight: "700" },
  });
}
