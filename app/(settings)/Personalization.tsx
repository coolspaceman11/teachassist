import { AlertIcon, AppAlert } from "@/components/ui/AppAlert";
import Text from "@/components/ui/AppText";
import AppToggle from "@/components/ui/AppToggle";
import BackButton from "@/components/ui/Back";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getHapticsEnabled,
  hapticsImpact,
  hapticsNotification,
  setHapticsEnabled as saveHapticsEnabled,
} from "@/utils/haptics";
import { useLiquidGlassEnabled } from "@/utils/liquidGlass";
import { setMidnightModeForced, setPetEnabled, useFunSettings } from "@/utils/funSettings";
import {
  BUILT_IN_THEME_PRESETS,
  CUSTOM_THEME_IMAGE_STORAGE_KEY,
  FONT_PRESETS,
} from "@/utils/themeSystem";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Text as RNText,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SecureStorage } from "../(auth)/taauth";

const ACCENT_CHOICES = [
  "#27b1fa",
  "#7c4dcc",
  "#d44f7a",
  "#3f9a62",
  "#e77949",
  "#c98a00",
  "#4a6fa5",
  "#00a99d",
];

const PROFILE_GREETING_NAME_STORAGE_KEY = "profile_greeting_name";
const PROFILE_GREETING_ENABLED_STORAGE_KEY = "profile_greeting_enabled";

const BACKGROUND_STRENGTHS = [
  { label: "Subtle", value: 0.15 },
  { label: "Soft", value: 0.22 },
  { label: "Balanced", value: 0.3 },
  { label: "Strong", value: 0.42 },
  { label: "Bold", value: 0.55 },
];

const normalizeHex = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
};

const isValidHex = (value: string) =>
  /^#[0-9a-fA-F]{6}$/.test(normalizeHex(value));

const PersonalizationScreen = () => {
  const {
    theme,
    isDark,
    activeTone,
    setThemeMode,
    themePreset,
    themePresetId,
    setThemePreset,
    fontPreset,
    fontPresetId,
    setFontPreset,
    hasCustomTheme,
    buildCustomThemeFromImage,
    buildCustomThemeFromColor,
    clearCustomTheme,
    pageBackgroundEnabled,
    pageBackgroundImageUri,
    pageBackgroundOpacity,
    setPageBackgroundEnabled,
    setPageBackgroundOpacity,
    refreshPageBackgroundImage,
  } = useTheme();

  const router = useRouter();
  const { midnightModeForced, automaticMidnight, petEnabled } = useFunSettings();

  const [isBuildingCustomTheme, setIsBuildingCustomTheme] = useState(false);
  const [customAccent, setCustomAccent] = useState(activeTone.accent);
  const [messageMode, setMessageMode] = useState<
    "default" | "inspirational" | "off"
  >("default");
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [profileGreetingName, setProfileGreetingName] = useState("");
  const [profileGreetingEnabled, setProfileGreetingEnabled] = useState(true);

  const systemColorScheme = useColorScheme();
  const liquidGlassEnabled = useLiquidGlassEnabled();
  const showLiquidGlassAppearanceWarning =
    systemColorScheme === "light" && liquidGlassEnabled && isDark;

  useEffect(() => {
    const loadPersonalizationState = async () => {
      const [
        storedMessageMode,
        storedHaptics,
        storedRefreshButton,
        storedProfileGreetingName,
        storedProfileGreetingEnabled,
      ] = await Promise.all([
        AsyncStorage.getItem("messages_mode"),
        getHapticsEnabled(),
        AsyncStorage.getItem("show_refresh_button"),
        AsyncStorage.getItem(PROFILE_GREETING_NAME_STORAGE_KEY),
        AsyncStorage.getItem(PROFILE_GREETING_ENABLED_STORAGE_KEY),
      ]);

      setHapticsEnabled(storedHaptics);
      setShowRefreshButton(storedRefreshButton === "true");
      setProfileGreetingName(storedProfileGreetingName ?? "");
      setProfileGreetingEnabled(storedProfileGreetingEnabled !== "false");

      if (
        storedMessageMode === "default" ||
        storedMessageMode === "inspirational" ||
        storedMessageMode === "off"
      ) {
        setMessageMode(storedMessageMode);
      }
    };

    loadPersonalizationState();
  }, []);

  useEffect(() => {
    setCustomAccent(activeTone.accent);
  }, [activeTone.accent]);

  const syncBackgroundImage = async (imageUri?: string | null) => {
    const nextImage =
      imageUri === undefined
        ? await SecureStorage.load(CUSTOM_THEME_IMAGE_STORAGE_KEY)
        : imageUri;

    await refreshPageBackgroundImage(nextImage);
  };

  const chooseImageAndBuildTheme = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    const imageUri = result.assets[0].uri;

    setIsBuildingCustomTheme(true);

    try {
      await SecureStorage.save(CUSTOM_THEME_IMAGE_STORAGE_KEY, imageUri);
      await syncBackgroundImage(imageUri);
      await setPageBackgroundEnabled(true);
      await buildCustomThemeFromImage(imageUri);

      hapticsNotification(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn("theme generation failed", error);

      AppAlert.alert(
        "Theme Generation Failed",
        "Try a different image with stronger contrast and color.",
        { icon: AlertIcon.error },
      );
    } finally {
      setIsBuildingCustomTheme(false);
    }
  };

  const applyAccent = async (hex: string) => {
    const normalized = normalizeHex(hex);

    if (!isValidHex(normalized)) {
      AppAlert.alert(
        "Invalid Color",
        "Enter a 6-digit hex color such as #7C4DCC.",
        { icon: AlertIcon.error },
      );
      return;
    }

    setIsBuildingCustomTheme(true);

    try {
      await buildCustomThemeFromColor(normalized);
      setCustomAccent(normalized);
      hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
    } finally {
      setIsBuildingCustomTheme(false);
    }
  };

  const removeBackgroundImage = async () => {
    await SecureStorage.delete(CUSTOM_THEME_IMAGE_STORAGE_KEY);
    await syncBackgroundImage(null);
    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
  };

  const resetCustomTheme = async () => {
    await clearCustomTheme();
    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
  };

  const previewPalette = [
    themePreset.light.accent,
    themePreset.light.bg4,
    themePreset.dark.accent,
  ];

  const updateMessageMode = async (
    mode: "default" | "inspirational" | "off",
  ) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    setMessageMode(mode);
    await AsyncStorage.setItem("messages_mode", mode);
  };

  const toggleHaptics = async (value: boolean) => {
    await saveHapticsEnabled(value);
    setHapticsEnabled(value);

    if (value) {
      await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const toggleRefreshButton = async (value: boolean) => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    setShowRefreshButton(value);

    await AsyncStorage.setItem(
      "show_refresh_button",
      value ? "true" : "false",
    );
  };

  const saveProfileGreetingName = async () => {
    const nextName = profileGreetingName.trim();

    if (nextName) {
      await AsyncStorage.setItem(PROFILE_GREETING_NAME_STORAGE_KEY, nextName);
      setProfileGreetingName(nextName);
    } else {
      await AsyncStorage.removeItem(PROFILE_GREETING_NAME_STORAGE_KEY);
      setProfileGreetingName("");
    }

    hapticsNotification(Haptics.NotificationFeedbackType.Success);
  };

  const useStudentNumberForGreeting = async () => {
    await AsyncStorage.removeItem(PROFILE_GREETING_NAME_STORAGE_KEY);
    setProfileGreetingName("");
    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleProfileGreeting = async (value: boolean) => {
    setProfileGreetingEnabled(value);
    await AsyncStorage.setItem(
      PROFILE_GREETING_ENABLED_STORAGE_KEY,
      value ? "true" : "false",
    );
    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <BackButton path="/profile" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-5"
        contentContainerStyle={{ paddingTop: 118, paddingBottom: 40 }}
      >
        <Text
          className={`text-4xl font-semibold ${
            isDark ? "text-appwhite" : "text-appblack"
          }`}
        >
          Personalization
        </Text>

        <Text
          className={`mt-1 text-base leading-6 ${
            isDark ? "text-appgraylight" : "text-appgraydark"
          }`}
        >
          Build a theme, choose a background, and tune the app in one place.
        </Text>

        <View className="mt-6">
          <Text className="text-2xl font-bold text-baccent mb-4">
            Preset Themes
          </Text>

          <LiquidGlassView
            className="rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View className="px-4 py-4">
              <Text
                className={`${
                  isDark ? "text-appwhite" : "text-appblack"
                } text-base font-semibold`}
              >
                Appearance
              </Text>

              <Text
                className={`${
                  isDark ? "text-appwhite" : "text-appblack"
                }/60 text-sm mt-1`}
              >
                Choose light or dark mode.
              </Text>

              <View className="flex-row mt-3">
                {[
                  {
                    key: "dark",
                    label: "Dark",
                    icon: require("../../assets/images/moon.png"),
                  },
                  {
                    key: "light",
                    label: "Light",
                    icon: require("../../assets/images/sun-fill.webp"),
                  },
                ].map((option) => {
                  const isSelected = theme === option.key;

                  return (
                    <TouchableOpacity
                      key={option.key}
                      className={`flex-1 py-2 mx-1 rounded-full border ${
                        isSelected
                          ? "bg-baccent border-baccent"
                          : isDark
                            ? "border-dark4"
                            : "border-light4"
                      }`}
                      onPress={() => {
                        hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
                        setThemeMode(option.key as "light" | "dark");
                      }}
                    >
                      <View className="flex-row items-center justify-center">
                        <Image
                          source={option.icon}
                          className="mr-2"
                          style={{
                            width: 16,
                            height: 17,
                            tintColor: isSelected
                              ? isDark
                                ? "#2f3035"
                                : "#fafafa"
                              : isDark
                                ? "#edebea"
                                : "#2f3035",
                          }}
                        />

                        <Text
                          className={`text-center text-sm font-semibold ${
                            isSelected
                              ? isDark
                                ? "text-appblack"
                                : "text-appwhite"
                              : isDark
                                ? "text-appwhite"
                                : "text-appblack"
                          }`}
                        >
                          {option.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
            />

            <View className="px-4 py-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text
                    className={`${
                      isDark ? "text-appwhite" : "text-appblack"
                    } text-base font-semibold`}
                  >
                    Presets
                  </Text>

                  <Text
                    className={`${
                      isDark ? "text-appwhite" : "text-appblack"
                    }/60 text-sm mt-1`}
                  >
                    {themePreset.name}: {themePreset.description}
                  </Text>
                </View>

                {isBuildingCustomTheme ? (
                  <ActivityIndicator color={activeTone.accent} />
                ) : (
                  <View className="flex-row items-center">
                    {previewPalette.map((color, index) => (
                      <View
                        key={`${color}-${index}`}
                        className="w-3 h-3 rounded-full ml-1"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </View>
                )}
              </View>

              <View className="flex-row flex-wrap mt-3 -mx-1">
                {BUILT_IN_THEME_PRESETS.map((preset) => {
                  const isSelected = themePresetId === preset.id;

                  return (
                    <TouchableOpacity
                      key={preset.id}
                      className={`px-3 py-2 mx-1 mb-2 rounded-full border ${
                        isSelected
                          ? "bg-baccent border-baccent"
                          : isDark
                            ? "border-dark4"
                            : "border-light4"
                      }`}
                      onPress={() => {
                        hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                        setThemePreset(preset.id);
                      }}
                    >
                      <View className="flex-row items-center">
                        {[preset.light.accent, preset.dark.accent].map(
                          (color, idx) =>
                            isSelected &&
                            (isDark ? idx === 1 : idx === 0) ? null : (
                              <View
                                key={`${preset.id}-${color}-${idx}`}
                                className={`mr-1.5 h-2.5 rounded-full ${
                                  isSelected ? "w-6" : "w-2.5"
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ),
                        )}

                        <Text
                          className={`text-sm font-semibold ${
                            isSelected
                              ? isDark
                                ? "text-appblack"
                                : "text-appwhite"
                              : isDark
                                ? "text-appwhite"
                                : "text-appblack"
                          }`}
                        >
                          {preset.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {hasCustomTheme && (
                  <TouchableOpacity
                    className={`px-3 py-2 mx-1 mb-2 rounded-full border ${
                      themePresetId === "custom"
                        ? "bg-baccent border-baccent"
                        : isDark
                          ? "border-dark4"
                          : "border-light4"
                    }`}
                    onPress={() => {
                      hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                      setThemePreset("custom");
                    }}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        themePresetId === "custom"
                          ? isDark
                            ? "text-appblack"
                            : "text-appwhite"
                          : isDark
                            ? "text-appwhite"
                            : "text-appblack"
                      }`}
                    >
                      Custom
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </LiquidGlassView>
        </View>

        <View className="mt-6">
          <Text className="text-2xl font-bold text-baccent mb-4">
            Custom Theme
          </Text>

          <LiquidGlassView
            className="rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View className="p-4">
              <ImageBackground
                source={
                  pageBackgroundImageUri
                    ? { uri: pageBackgroundImageUri }
                    : undefined
                }
                imageStyle={{
                  opacity: pageBackgroundImageUri ? 0.35 : 0,
                  borderRadius: 16,
                }}
                style={{
                  minHeight: 150,
                  borderRadius: 16,
                  overflow: "hidden",
                  backgroundColor: activeTone.bg1,
                  borderWidth: 1,
                  borderColor: activeTone.border,
                  padding: 18,
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Text
                    style={{
                      color: activeTone.fg,
                      fontSize: 12,
                      fontWeight: "800",
                      letterSpacing: 1,
                    }}
                  >
                    LIVE PREVIEW
                  </Text>

                  <Text
                    style={{
                      color: activeTone.fg,
                      fontSize: 24,
                      fontWeight: "700",
                      marginTop: 10,
                    }}
                  >
                    TeachAssist+
                  </Text>

                  <Text
                    style={{
                      color: activeTone.muted,
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    Your custom colors and background update immediately.
                  </Text>
                </View>

                <View
                  style={{
                    alignSelf: "flex-start",
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    backgroundColor: activeTone.accent,
                  }}
                >
                  <Text
                    style={{
                      color: isDark ? "#111113" : "#ffffff",
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    Accent
                  </Text>
                </View>
              </ImageBackground>

              <Text
                className={`${
                  isDark ? "text-appwhite" : "text-appblack"
                } text-base font-semibold mt-5`}
              >
                Create your own custom theme via a custom image
              </Text>


              <TouchableOpacity
                className={`rounded-xl bg-baccent px-4 py-3 mt-4 ${
                  isBuildingCustomTheme ? "opacity-70" : ""
                }`}
                disabled={isBuildingCustomTheme}
                onPress={chooseImageAndBuildTheme}
              >
                <Text
                  className={`text-center font-semibold ${
                    isDark ? "text-appblack" : "text-appwhite"
                  }`}
                >
                  {isBuildingCustomTheme
                    ? "Creating Theme..."
                    : pageBackgroundImageUri
                      ? "Change Image"
                      : "Choose Image"}
                </Text>
              </TouchableOpacity>

              <View
                className={`${isDark ? "bg-dark4" : "bg-light4"} h-px my-5`}
              />

              <Text
                className={`${
                  isDark ? "text-appwhite" : "text-appblack"
                } text-base font-semibold`}
              >
                Accent Color
              </Text>

              <Text
                className={`${
                  isDark ? "text-appwhite" : "text-appblack"
                }/60 text-sm mt-1`}
              >
                Override the image-generated color or build a custom theme
                without an image.
              </Text>

              <View className="flex-row flex-wrap mt-3">
                {ACCENT_CHOICES.map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => applyAccent(color)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: color,
                      marginRight: 10,
                      marginBottom: 10,
                      borderWidth: 2,
                      borderColor:
                        themePresetId === "custom" &&
                        activeTone.accent.toLowerCase() === color.toLowerCase()
                          ? activeTone.fg
                          : "transparent",
                    }}
                  />
                ))}
              </View>

              <View className="flex-row items-center mt-2">
                <TextInput
                  value={customAccent}
                  onChangeText={setCustomAccent}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="#7C4DCC"
                  placeholderTextColor={activeTone.muted}
                  style={{
                    flex: 1,
                    minHeight: 46,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: activeTone.border,
                    backgroundColor: activeTone.bg2,
                    color: activeTone.fg,
                    paddingHorizontal: 13,
                    fontSize: 15,
                  }}
                />

                <TouchableOpacity
                  className="rounded-xl bg-baccent px-4 py-3 ml-2"
                  onPress={() => applyAccent(customAccent)}
                >
                  <Text
                    className={`font-semibold ${
                      isDark ? "text-appblack" : "text-appwhite"
                    }`}
                  >
                    Apply
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                className={`${isDark ? "bg-dark4" : "bg-light4"} h-px my-5`}
              />

              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text
                    className={`${
                      isDark ? "text-appwhite" : "text-appblack"
                    } text-base font-semibold`}
                  >
                    Image Background
                  </Text>

                  <Text
                    className={`${
                      isDark ? "text-appwhite" : "text-appblack"
                    }/60 text-sm mt-1`}
                  >
                    Show the selected image behind app pages.
                  </Text>
                </View>

                <AppToggle
                  value={pageBackgroundEnabled && !!pageBackgroundImageUri}
                  onValueChange={(value) => {
                    if (!pageBackgroundImageUri) {
                      return;
                    }

                    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                    setPageBackgroundEnabled(value);
                  }}
                />
              </View>

              <Text
                className={`${
                  isDark ? "text-appwhite" : "text-appblack"
                } text-base font-semibold mt-5`}
              >
                Background Visibility
              </Text>

              <Text
                className={`${
                  isDark ? "text-appwhite" : "text-appblack"
                }/60 text-sm mt-1`}
              >
                Higher visibility makes more of the image show through.
              </Text>

              <View className="flex-row flex-wrap mt-3 -mx-1">
                {BACKGROUND_STRENGTHS.map((option) => {
                  const isSelected =
                    Math.abs(pageBackgroundOpacity - option.value) < 0.01;

                  return (
                    <TouchableOpacity
                      key={option.label}
                      disabled={!pageBackgroundImageUri}
                      className={`px-3 py-2 mx-1 mb-2 rounded-full border ${
                        isSelected
                          ? "bg-baccent border-baccent"
                          : isDark
                            ? "border-dark4"
                            : "border-light4"
                      } ${pageBackgroundImageUri ? "" : "opacity-40"}`}
                      onPress={() => {
                        hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                        setPageBackgroundOpacity(option.value);
                      }}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          isSelected
                            ? isDark
                              ? "text-appblack"
                              : "text-appwhite"
                            : isDark
                              ? "text-appwhite"
                              : "text-appblack"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {(pageBackgroundImageUri || hasCustomTheme) && (
                <View className="flex-row mt-4">
                  {pageBackgroundImageUri && (
                    <TouchableOpacity
                      className="flex-1 rounded-xl bg-danger/70 px-4 py-3 mr-2"
                      onPress={removeBackgroundImage}
                    >
                      <Text className="text-center font-semibold text-appwhite">
                        Remove Image
                      </Text>
                    </TouchableOpacity>
                  )}

                  {hasCustomTheme && (
                    <TouchableOpacity
                      className="flex-1 rounded-xl px-4 py-3 ml-2"
                      style={{ backgroundColor: activeTone.bg4 }}
                      onPress={resetCustomTheme}
                    >
                      <Text
                        className={`text-center font-semibold ${
                          isDark ? "text-appwhite" : "text-appblack"
                        }`}
                      >
                        Reset Theme
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <Text className="text-appwhite/70 text-xs mt-4 text-center">
                Custom theme changes save automatically.
              </Text>
            </View>
          </LiquidGlassView>
        </View>

        <View className="mt-6">
          <Text className="text-2xl font-bold text-baccent mb-4">
            Fonts
          </Text>

          <LiquidGlassView
            className="rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View className="px-4 py-4">
              <Text
                className={`${
                  isDark ? "text-appwhite" : "text-appblack"
                } text-base font-semibold`}
              >
                Font Presets
              </Text>

              <Text
                className={`${
                  isDark ? "text-appwhite" : "text-appblack"
                }/60 text-sm mt-1`}
              >
                {fontPreset.name}: {fontPreset.description}
              </Text>

              <View className="flex-row flex-wrap mt-3 -mx-1">
                {FONT_PRESETS.map((option) => {
                  const isSelected = fontPresetId === option.id;

                  const labelClassName = `text-sm font-semibold ${
                    isSelected
                      ? isDark
                        ? "text-appblack"
                        : "text-appwhite"
                      : isDark
                        ? "text-appwhite"
                        : "text-appblack"
                  }`;

                  const labelStyle = option.regularFamily
                    ? { fontFamily: option.regularFamily }
                    : undefined;

                  return (
                    <TouchableOpacity
                      key={option.id}
                      className={`px-3 py-2 mx-1 mb-2 rounded-full border ${
                        isSelected
                          ? "bg-baccent border-baccent"
                          : isDark
                            ? "border-dark4"
                            : "border-light4"
                      }`}
                      onPress={() => {
                        hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                        setFontPreset(option.id);
                      }}
                    >
                      {option.regularFamily ? (
                        <Text className={labelClassName} style={labelStyle}>
                          {option.name}
                        </Text>
                      ) : (
                        <RNText className={labelClassName}>
                          {option.name}
                        </RNText>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View
                className={`mt-4 rounded-xl px-4 py-4 ${
                  isDark ? "bg-dark4" : "bg-light4"
                }`}
              >
                <Text
                  className={`${
                    isDark ? "text-appwhite" : "text-appblack"
                  } text-sm`}
                >
                  Preview
                </Text>

                <Text
                  className={`mt-3 text-lg ${
                    isDark ? "text-appwhite" : "text-appblack"
                  }`}
                >
                  Alpha step, Omega, step
                </Text>

                <Text
                  className={`mt-2 text-lg font-medium ${
                    isDark ? "text-appwhite" : "text-appblack"
                  }`}
                >
                  Kappa, step, Sigma, step
                </Text>

                <Text
                  className={`mt-2 text-lg font-semibold ${
                    isDark ? "text-appwhite" : "text-appblack"
                  }`}
                >
                  A.k.a., step, Delta, step
                </Text>

                <Text
                  className={`mt-2 text-lg font-bold ${
                    isDark ? "text-appwhite" : "text-appblack"
                  }`}
                >
                  S.G. Rho, step, Zeta, step
                </Text>
              </View>
            </View>
          </LiquidGlassView>
        </View>

        <View className="mt-6">
          <Text className="text-2xl font-bold text-baccent mb-4">
            Experience
          </Text>

          <LiquidGlassView
            className="rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View className="px-4 py-4">
              <Text
                className={`${
                  isDark ? "text-appwhite" : "text-appblack"
                } text-base font-semibold`}
              >
                Greeting Messages
              </Text>

              <Text
                className={`${
                  isDark ? "text-appwhite" : "text-appblack"
                }/60 text-sm mt-1`}
              >
                Choose what shows on the Courses screen.
              </Text>

              <View className="flex-row mt-3">
                {[
                  { key: "default", label: "Default" },
                  { key: "inspirational", label: "Inspire" },
                  { key: "off", label: "Off" },
                ].map((option) => {
                  const isSelected = messageMode === option.key;

                  return (
                    <TouchableOpacity
                      key={option.key}
                      className={`flex-1 py-2 mx-1 rounded-full border ${
                        isSelected
                          ? "bg-baccent border-baccent"
                          : isDark
                            ? "border-dark4"
                            : "border-light4"
                      }`}
                      onPress={() => {
                        updateMessageMode(
                          option.key as "default" | "inspirational" | "off",
                        );
                      }}
                    >
                      <Text
                        className={`text-center text-sm font-semibold ${
                          isSelected
                            ? isDark
                              ? "text-appblack"
                              : "text-appwhite"
                            : isDark
                              ? "text-appwhite"
                              : "text-appblack"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
            />

            <View className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text
                  className={`${
                    isDark ? "text-appwhite" : "text-appblack"
                  } text-base font-semibold`}
                >
                  Refresh Button
                </Text>

                <Text
                  className={`${
                    isDark ? "text-appwhite" : "text-appblack"
                  }/60 text-sm mt-1`}
                >
                  Show a refresh button on the Courses screen.
                </Text>
              </View>

              <AppToggle
                value={showRefreshButton}
                onValueChange={toggleRefreshButton}
              />
            </View>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
            />

            <View className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text
                  className={`${
                    isDark ? "text-appwhite" : "text-appblack"
                  } text-base font-semibold`}
                >
                  Haptics
                </Text>

                <Text
                  className={`${
                    isDark ? "text-appwhite" : "text-appblack"
                  }/60 text-sm mt-1`}
                >
                  Turn vibration feedback on or off.
                </Text>
              </View>

              <AppToggle
                value={hapticsEnabled}
                onValueChange={toggleHaptics}
              />
            </View>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
            />

            <View className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}
                >
                  Midnight Mode
                </Text>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}
                >
                  Starry late-night visuals. It also turns on automatically from 12:00–3:00 AM{automaticMidnight ? " and is active right now" : ""}.
                </Text>
              </View>

              <AppToggle
                value={midnightModeForced}
                onValueChange={async (value) => {
                  await setMidnightModeForced(value);
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            </View>

            <View
              className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
            />

            <View className="px-4 py-4">
              <Text
                className={`${
                  isDark ? "text-appwhite" : "text-appblack"
                } text-base font-semibold`}
              >
                Profile Greeting
              </Text>

              <View className="flex-row items-center justify-between mt-3">
                <View className="flex-1 pr-3">
                  <Text
                    className={`${
                      isDark ? "text-appwhite" : "text-appblack"
                    } text-sm font-semibold`}
                  >
                    Enable Profile Greeting
                  </Text>
                </View>

                <AppToggle
                  value={profileGreetingEnabled}
                  onValueChange={toggleProfileGreeting}
                />
              </View>

              <TextInput
                value={profileGreetingName}
                editable={profileGreetingEnabled}
                onChangeText={setProfileGreetingName}
                placeholder="Custom name (optional)"
                placeholderTextColor={activeTone.muted}
                autoCapitalize="words"
                style={{
                  minHeight: 46,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: activeTone.border,
                  backgroundColor: activeTone.bg2,
                  color: activeTone.fg,
                  paddingHorizontal: 13,
                  fontSize: 15,
                  marginTop: 12,
                  opacity: profileGreetingEnabled ? 1 : 0.45,
                }}
              />

              <View className="flex-row mt-3">
                <TouchableOpacity
                  className="flex-1 rounded-xl bg-baccent px-4 py-3 mr-2"
                  disabled={!profileGreetingEnabled}
                  onPress={saveProfileGreetingName}
                  style={{ opacity: profileGreetingEnabled ? 1 : 0.45 }}
                >
                  <Text
                    className={`text-center font-semibold ${
                      isDark ? "text-appblack" : "text-appwhite"
                    }`}
                  >
                    Save Name
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 rounded-xl px-4 py-3 ml-2"
                  disabled={!profileGreetingEnabled}
                  onPress={useStudentNumberForGreeting}
                  style={{
                    backgroundColor: activeTone.bg4,
                    opacity: profileGreetingEnabled ? 1 : 0.45,
                  }}
                >
                  <Text
                    className={`text-center font-semibold ${
                      isDark ? "text-appwhite" : "text-appblack"
                    }`}
                  >
                    Use Student Number
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </LiquidGlassView>
        </View>

        <View className="mt-6">
          <Text className="text-2xl font-bold text-baccent mb-4">Pet</Text>
          <LiquidGlassView
            className="rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text className={`${isDark ? "text-appwhite" : "text-appblack"} text-base font-semibold`}>
                  Maxwell
                </Text>
                <Text className={`${isDark ? "text-appwhite" : "text-appblack"}/60 text-sm mt-1`}>
                  Put Maxwell at the bottom of the app. Drag him around and gravity brings him back down.
                </Text>
              </View>
              <AppToggle
                value={petEnabled}
                onValueChange={async (value) => {
                  await setPetEnabled(value);
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            </View>
          </LiquidGlassView>
        </View>

        <LiquidGlassView
          className="rounded-2xl overflow-hidden mt-5"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <View className="px-4 py-4 flex-row justify-between items-center">
            <View className="flex-1 pr-3">
              <Text
                className={`${
                  isDark ? "text-appwhite" : "text-appblack"
                } text-base font-semibold`}
              >
                Looking for something else?
              </Text>

              <TouchableOpacity
                onPress={() => {
                  hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
                  router.push("/AdvancedView");
                }}
              >
                <Text
                  className={`${
                    isDark ? "text-appwhite" : "text-appblack"
                  }/60 mt-4`}
                >
                  Use Liquid Glass
                </Text>

                {showLiquidGlassAppearanceWarning ? (
                  <Text
                    className={`${
                      isDark ? "text-appwhite" : "text-appblack"
                    }/60 mt-2 text-sm`}
                  >
                    If your device stays in Light Mode while the app is in Dark
                    Mode, things might look weird. Turn on Dark Mode on your
                    device to fix it.
                  </Text>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>
        </LiquidGlassView>
      </ScrollView>
    </View>
  );
};

export default PersonalizationScreen;
