/**
 * CREATE entry — renders CreateContentModal and wires navigation.
 * Shoot Short → VideoRecordScreen | From Gallery → VideoUploadScreen | Go Live → LiveSetupScreen
 */
import React, { useCallback } from "react";
import { View, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import CreateContentModal from "../../components/create/CreateContentModal";
import { useAuthStore } from "../../store/auth.store";
import { canPostVideo, canLiveStreamHost, getDobFromUser } from "../../utils/age";

export default function CreateScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const dob = getDobFromUser(user);
  const otpVerified = !!(user?.otp_verified ?? user?.otpVerified);
  const canVideo = canPostVideo(dob);
  const canLive = canLiveStreamHost(dob) && otpVerified;

  const close = useCallback(() => navigation.goBack(), [navigation]);

  const onShootShort = useCallback(() => {
    if (!canVideo) {
      Alert.alert(
        "Age requirement",
        "You must be 16+ to post videos. Add your date of birth in Edit Profile."
      );
      return;
    }
    close();
    navigation.navigate("VideoRecord");
  }, [canVideo, close, navigation]);

  const onFromGallery = useCallback(() => {
    if (!canVideo) {
      Alert.alert(
        "Age requirement",
        "You must be 16+ to upload videos. Add your date of birth in Edit Profile."
      );
      return;
    }
    close();
    navigation.navigate("VideoCreate");
  }, [canVideo, close, navigation]);

  const onGoLive = useCallback(() => {
    if (!canLive) {
      if (!otpVerified) {
        Alert.alert("Verification required", "You must verify your phone (OTP) to go live.");
        return;
      }
      Alert.alert(
        "Age requirement",
        "You must be 16+ to host a live stream. Add your date of birth in Edit Profile."
      );
      return;
    }
    close();
    navigation.navigate("Live", { screen: "LiveSetup" });
  }, [canLive, otpVerified, close, navigation]);

  return (
    <View style={{ flex: 1 }}>
      <CreateContentModal
        visible={true}
        onClose={close}
        onShootShort={onShootShort}
        onFromGallery={onFromGallery}
        onGoLive={onGoLive}
      />
    </View>
  );
}
