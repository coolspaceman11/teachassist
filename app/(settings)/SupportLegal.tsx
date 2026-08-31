import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  Image,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

import Text from "@/components/ui/AppText";
import BackButton from "@/components/ui/Back";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { useTheme } from "@/contexts/ThemeContext";
import { hapticsNotification } from "@/utils/haptics";
import { openWriteReview } from "@/utils/storeReview";

type SettingsLink = {
  title: string;
  subtitle?: string;
  href?: string;
  route?: string;
  icon?: any;
  action?: () => void;
};

const SupportLegalScreen = () => {
  const router = useRouter();
  const { isDark, activeTone } = useTheme();

  const textClass = isDark ? "text-appwhite" : "text-appblack";
  const mutedClass = isDark ? "text-appgraylight" : "text-appgraydark";

  const openExternal = (url: string) => {
    hapticsNotification(Haptics.NotificationFeedbackType.Success);
    Linking.openURL(url);
  };

  const openInternal = (route: string) => {
    hapticsNotification(Haptics.NotificationFeedbackType.Success);
    router.push(route as any);
  };

  const supportItems: SettingsLink[] = [
    {
      title: "Get Support & Send Feedback",
      subtitle: "Send feedback to the original TeachAssist team.",
      href: "https://forms.gle/3g7D72cFJUYYH9Fh8",
      icon: require("../../assets/images/support-icon.png"),
    },
    {
      title: "TeachAssist Website",
      subtitle: "Visit the original TeachAssist website.",
      href: "https://prmntr.com/teachassist",
      icon: require("../../assets/images/link-chain.png"),
    },
    {
      title: "TeachAssist+ Source",
      subtitle: "View the TeachAssist+ fork on GitHub.",
      href: "https://github.com/coolspaceman11/teachassist",
      icon: require("../../assets/images/link.png"),
    },
    {
      title: "Rate the Original App",
      subtitle: "Open the App Store review page for TeachAssist.",
      icon: require("../../assets/images/star.png"),
      action: () => {
        hapticsNotification(Haptics.NotificationFeedbackType.Success);
        openWriteReview();
      },
    },
  ];

  const legalItems: SettingsLink[] = [
    {
      title: "Privacy Policy",
      subtitle: "Read the original TeachAssist privacy policy.",
      href: "https://prmntr.com/teachassist/privacy",
    },
    {
      title: "Terms of Service",
      subtitle: "Read the original TeachAssist terms of service.",
      href: "https://prmntr.com/teachassist/tos",
    },
    {
      title: "Original Source Code",
      subtitle: "View the upstream TeachAssist repository.",
      href: "https://github.com/prmntr/teachassist",
    },
    {
      title: "Credits",
      subtitle: "See the original app credits.",
      route: "/credits",
    },
  ];

  const renderItems = (items: SettingsLink[]) =>
    items.map((item, index) => (
      <View key={item.title}>
        <TouchableOpacity
          className="px-5 py-4"
          onPress={() => {
            if (item.action) {
              item.action();
              return;
            }

            if (item.route) {
              openInternal(item.route);
              return;
            }

            if (item.href) {
              openExternal(item.href);
            }
          }}
        >
          <View className="flex-row items-center">
            {item.icon ? (
              <View className="bg-baccent/80 mr-4 p-2 rounded-full">
                <Image
                  className="w-6 h-6"
                  style={{ tintColor: "#fafafa" }}
                  source={item.icon}
                />
              </View>
            ) : null}

            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className={`${textClass} text-base font-semibold`}>
                  {item.title}
                </Text>

                {item.href ? (
                  <Image
                    source={require("../../assets/images/external-link.png")}
                    style={{ tintColor: activeTone.accent }}
                    className="w-5 h-5 ml-2"
                  />
                ) : null}
              </View>

              {item.subtitle ? (
                <Text className={`${textClass}/60 text-sm mt-1`}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>

        {index < items.length - 1 ? (
          <View
            className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mx-4`}
          />
        ) : null}
      </View>
    ));

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
          Support & Legal
        </Text>

        <Text className={`mt-1 text-base leading-6 ${mutedClass}`}>
          Help, policies, source code, and credits in one place.
        </Text>

        <Text className="text-baccent text-xl font-bold mt-7 mb-3">
          Support
        </Text>

        <LiquidGlassView
          className="rounded-2xl overflow-hidden"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          {renderItems(supportItems)}
        </LiquidGlassView>

        <Text className="text-baccent text-xl font-bold mt-7 mb-3">
          Legal
        </Text>

        <LiquidGlassView
          className="rounded-2xl overflow-hidden"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          {renderItems(legalItems)}
        </LiquidGlassView>

        <Text className={`${mutedClass} text-xs text-center mt-6`}>
          The update log now lives on My Profile instead of Support.
        </Text>
      </ScrollView>
    </View>
  );
};

export default SupportLegalScreen;
