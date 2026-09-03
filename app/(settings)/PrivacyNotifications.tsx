import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

import { AppAlert, AlertIcon } from "@/components/ui/AppAlert";
import AppToggle from "@/components/ui/AppToggle";
import Text from "@/components/ui/AppText";
import BackButton from "@/components/ui/Back";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getBiometricLockEnabled,
  setBiometricLockEnabled as persistBiometricLockEnabled,
  subscribeBiometricLock,
} from "@/utils/biometricLock";
import { hapticsImpact } from "@/utils/haptics";
import { getChargeReminderEnabled, setChargeReminderEnabled } from "@/utils/chargeReminder";
import {
  clearGuidanceReminders,
  ensureNotificationPermissions,
  loadNotificationSettings,
  saveNotificationSetting,
  scheduleGuidanceReminders,
  syncBackgroundTasks,
} from "@/utils/notifications";

const Divider = ({ isDark }: { isDark: boolean }) => (
  <View
    className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
  />
);

const PrivacyNotificationsScreen = () => {
  const router = useRouter();
  const { activeTone, isDark } = useTheme();

  const [hideUnavailableMarks, setHideUnavailableMarks] = useState(false);
  const [tapToRevealMarks, setTapToRevealMarks] = useState(false);
  const [biometricLockEnabled, setBiometricLockEnabledState] = useState(false);

  const [guidanceNotificationsEnabled, setGuidanceNotificationsEnabled] =
    useState(false);
  const [markNotificationsEnabled, setMarkNotificationsEnabled] =
    useState(false);
  const [hideMarksInNotifications, setHideMarksInNotifications] =
    useState(false);
  const [notifyWhenMarksHidden, setNotifyWhenMarksHidden] = useState(false);
  const [chargeReminderEnabled, setChargeReminderEnabledState] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const [
        storedHideUnavailable,
        storedTapToReveal,
        storedBiometricLock,
        notificationSettings,
        storedChargeReminder,
      ] = await Promise.all([
        AsyncStorage.getItem("hide_unavailable_marks"),
        AsyncStorage.getItem("tap_to_reveal_marks"),
        getBiometricLockEnabled(),
        loadNotificationSettings(),
        getChargeReminderEnabled(),
      ]);

      setHideUnavailableMarks(storedHideUnavailable === "true");
      setTapToRevealMarks(storedTapToReveal === "true");
      setBiometricLockEnabledState(storedBiometricLock);

      setGuidanceNotificationsEnabled(
        notificationSettings.guidanceRemindersEnabled,
      );
      setMarkNotificationsEnabled(notificationSettings.markChangeEnabled);
      setHideMarksInNotifications(
        notificationSettings.hideMarksInNotifications,
      );
      setNotifyWhenMarksHidden(notificationSettings.notifyWhenMarksHidden);
      setChargeReminderEnabledState(storedChargeReminder);
    };

    loadSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeBiometricLock((enabled) => {
      setBiometricLockEnabledState(enabled);
    });

    return unsubscribe;
  }, []);

  const toggleBiometricLock = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);

    if (value) {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);

      if (!hasHardware || !isEnrolled) {
        AppAlert.alert(
          "Biometrics Unavailable",
          "Set up Face ID, Touch ID, or a fingerprint in your device settings to enable app lock.",
          { icon: AlertIcon.lock },
        );
        return;
      }
    }

    setBiometricLockEnabledState(value);
    await persistBiometricLockEnabled(value);
  };

  const toggleTapToRevealMarks = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    setTapToRevealMarks(value);
    await AsyncStorage.setItem("tap_to_reveal_marks", String(value));
  };

  const toggleHideUnavailableMarks = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    setHideUnavailableMarks(value);
    await AsyncStorage.setItem("hide_unavailable_marks", String(value));
  };

  const requestNotificationPermission = async (message: string) => {
    const granted = await ensureNotificationPermissions();

    if (!granted) {
      AppAlert.alert(
        "Notifications Disabled",
        message,
        { icon: AlertIcon.notification },
      );
      return false;
    }

    return true;
  };

  const toggleGuidanceNotifications = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);

    if (
      value &&
      !(await requestNotificationPermission(
        "Enable notifications in system settings to receive guidance reminders.",
      ))
    ) {
      return;
    }

    await saveNotificationSetting("guidanceRemindersEnabled", value);
    setGuidanceNotificationsEnabled(value);

    if (value) {
      await scheduleGuidanceReminders();
    } else {
      await clearGuidanceReminders();
    }
  };

  const toggleMarkNotifications = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);

    if (
      value &&
      !(await requestNotificationPermission(
        "Enable notifications in system settings to receive mark alerts.",
      ))
    ) {
      return;
    }

    await saveNotificationSetting("markChangeEnabled", value);
    setMarkNotificationsEnabled(value);
    await syncBackgroundTasks();
  };

  const toggleHideMarks = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    await saveNotificationSetting("hideMarksInNotifications", value);
    setHideMarksInNotifications(value);
  };

  const toggleHiddenMarkAlerts = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    await saveNotificationSetting("notifyWhenMarksHidden", value);
    setNotifyWhenMarksHidden(value);
  };

  const toggleChargeReminder = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);

    if (
      value &&
      !(await requestNotificationPermission(
        "Enable notifications so TeachAssist+ can alert you when your iPhone reaches 10% battery.",
      ))
    ) {
      return;
    }

    await setChargeReminderEnabled(value);
    setChargeReminderEnabledState(value);
  };

  const textClass = isDark ? "text-appwhite" : "text-appblack";
  const mutedClass = isDark ? "text-appgraylight" : "text-appgraydark";

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <BackButton path="/ProfileSettings" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-5"
        contentContainerStyle={{ paddingTop: 118, paddingBottom: 40 }}
      >
        <Text className={`text-4xl font-semibold ${textClass}`}>
          Privacy & Notifications
        </Text>

        <Text className={`mt-1 text-base leading-6 ${mutedClass}`}>
          Keep your grades private and control how TeachAssist+ alerts you.
        </Text>

        <Text className="text-baccent text-xl font-bold mt-7 mb-3">
          Privacy
        </Text>

        <LiquidGlassView
          className="rounded-2xl overflow-hidden"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <TouchableOpacity
            className="px-4 py-4"
            onPress={() => {
              hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
              router.push("/GradeExport");
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className={`${textClass} text-base font-semibold`}>
                  Export Grades
                </Text>
                <Text className={`${textClass}/60 text-sm mt-1`}>
                  Prepare a simple or detailed export of your grades.
                </Text>
              </View>

              <Image
                source={require("../../assets/images/arrow-icon.png")}
                className="w-6 h-6 mr-2"
                style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
              />
            </View>
          </TouchableOpacity>

          <Divider isDark={isDark} />

          <View className="px-4 py-4 flex-row justify-between items-center">
            <View className="flex-1 pr-3">
              <Text className={`${textClass} text-base font-semibold`}>
                Lock App with Biometrics
              </Text>
              <Text className={`${textClass}/60 text-sm mt-1`}>
                Require Face ID, Touch ID, or device biometrics to unlock.
              </Text>
            </View>

            <AppToggle
              value={biometricLockEnabled}
              onValueChange={toggleBiometricLock}
            />
          </View>

          <Divider isDark={isDark} />

          <View className="px-4 py-4 flex-row justify-between items-center">
            <View className="flex-1 pr-3">
              <Text className={`${textClass} text-base font-semibold`}>
                Tap to Reveal Marks
              </Text>
              <Text className={`${textClass}/60 text-sm mt-1`}>
                Hide averages and changes until you tap them.
              </Text>
            </View>

            <AppToggle
              value={tapToRevealMarks}
              onValueChange={toggleTapToRevealMarks}
            />
          </View>

          <Divider isDark={isDark} />

          <View className="px-4 py-4 flex-row justify-between items-center">
            <View className="flex-1 pr-3">
              <Text className={`${textClass} text-base font-semibold`}>
                Hide Unavailable Marks
              </Text>
              <Text className={`${textClass}/60 text-sm mt-1`}>
                Hide courses that do not currently have a visible grade.
              </Text>
            </View>

            <AppToggle
              value={hideUnavailableMarks}
              onValueChange={toggleHideUnavailableMarks}
            />
          </View>
        </LiquidGlassView>

        <Text className="text-baccent text-xl font-bold mt-7 mb-3">
          Notifications
        </Text>

        <LiquidGlassView
          className="rounded-2xl overflow-hidden"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <View className="px-4 py-4 flex-row justify-between items-center">
            <View className="flex-1 pr-3">
              <Text className={`${textClass} text-base font-semibold`}>
                Guidance Appointment Reminders
              </Text>
              <Text className={`${textClass}/60 text-sm mt-1`}>
                Get a heads-up before a booked guidance appointment.
              </Text>
            </View>

            <AppToggle
              value={guidanceNotificationsEnabled}
              onValueChange={toggleGuidanceNotifications}
            />
          </View>

          <Divider isDark={isDark} />

          <View className="px-4 py-4 flex-row justify-between items-center">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center">
                <Text className={`${textClass} text-base font-semibold`}>
                  Mark Change Alerts
                </Text>
                <Text className="text-baccent text-xs font-bold ml-2">
                  BETA
                </Text>
              </View>

              <Text className={`${textClass}/60 text-sm mt-1`}>
                Get notified when new marks are detected.
              </Text>
            </View>

            <AppToggle
              value={markNotificationsEnabled}
              onValueChange={toggleMarkNotifications}
            />
          </View>

          <Divider isDark={isDark} />

          <View
            className={`px-4 py-4 flex-row justify-between items-center ${
              markNotificationsEnabled ? "" : "opacity-50"
            }`}
          >
            <View className="flex-1 pr-3">
              <Text className={`${textClass} text-base font-semibold`}>
                Hide Marks in Notifications
              </Text>
              <Text className={`${textClass}/60 text-sm mt-1`}>
                Keep grade values private on your lock screen.
              </Text>
            </View>

            <AppToggle
              value={hideMarksInNotifications}
              disabled={!markNotificationsEnabled}
              onValueChange={toggleHideMarks}
            />
          </View>

          <Divider isDark={isDark} />

          <View
            className={`px-4 py-4 flex-row justify-between items-center ${
              markNotificationsEnabled ? "" : "opacity-50"
            }`}
          >
            <View className="flex-1 pr-3">
              <Text className={`${textClass} text-base font-semibold`}>
                Alert When Marks Are Hidden
              </Text>
              <Text className={`${textClass}/60 text-sm mt-1`}>
                Notify you when a teacher hides previously visible marks.
              </Text>
            </View>

            <AppToggle
              value={notifyWhenMarksHidden}
              disabled={!markNotificationsEnabled}
              onValueChange={toggleHiddenMarkAlerts}
            />
          </View>

          <Divider isDark={isDark} />

          <View className="px-4 py-4 flex-row justify-between items-center">
            <View className="flex-1 pr-3">
              <Text className={`${textClass} text-base font-semibold`}>
                Phone Charge Reminder
              </Text>
              <Text className={`${textClass}/60 text-sm mt-1`}>
                Pop up “Charge your phone” and send a notification when your iPhone reaches 10%.
              </Text>
            </View>

            <AppToggle
              value={chargeReminderEnabled}
              onValueChange={toggleChargeReminder}
            />
          </View>
        </LiquidGlassView>

        <LiquidGlassView
          className="rounded-2xl overflow-hidden mt-5"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <TouchableOpacity
            className="px-4 py-4"
            onPress={() => {
              hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
              router.push("/AdvancedView");
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className={`${textClass} text-base font-semibold`}>
                  Advanced Notification Settings
                </Text>
                <Text className={`${textClass}/60 text-sm mt-1`}>
                  Open power-user notification controls.
                </Text>
              </View>

              <Image
                source={require("../../assets/images/arrow-icon.png")}
                className="w-6 h-6 mr-2"
                style={{ tintColor: activeTone.accent }}
              />
            </View>
          </TouchableOpacity>
        </LiquidGlassView>

        {Platform.OS === "ios" ? (
          <Text className={`${mutedClass} text-xs text-center mt-5`}>
            System notification permission can also be changed in iOS Settings.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
};

export default PrivacyNotificationsScreen;
