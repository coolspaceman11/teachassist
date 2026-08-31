import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/contexts/ThemeContext";
import { hapticsImpact } from "@/utils/haptics";

const TabIcon = ({
  focused,
  name,
  focusedSize = 31,
  normalSize = 28,
}: {
  focused: boolean;
  name:
    | "menu-book"
    | "calendar-month"
    | "auto-stories"
    | "chat-bubble"
    | "account-circle"
    | "widgets";
  focusedSize?: number;
  normalSize?: number;
}) => {
  const { activeTone } = useTheme();

  return (
    <View
      style={{
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 7,
      }}
    >
      <MaterialIcons
        name={name}
        size={focused ? focusedSize : normalSize}
        color={focused ? activeTone.accent : activeTone.muted}
      />
    </View>
  );
};

export default function TabLayout() {
  const { activeTone } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarBaseHeight = 56;

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          hapticsImpact(Haptics.ImpactFeedbackStyle.Rigid);
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          width: "100%",
          height: "100%",
          justifyContent: "center",
        },
        tabBarStyle: {
          backgroundColor: activeTone.bg1,
          overflow: "hidden",
          borderColor: activeTone.border,
          borderTopWidth: 2,
          height:
            Platform.OS === "ios"
              ? tabBarBaseHeight + insets.bottom - 7
              : tabBarBaseHeight + insets.bottom,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="courses"
        options={{
          title: "Courses",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name="menu-book"
              focusedSize={34}
              normalSize={31}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name="calendar-month"
              focusedSize={34}
              normalSize={31}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="study"
        options={{
          title: "Study",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name="auto-stories"
              focusedSize={32}
              normalSize={29}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="misc"
        options={{
          title: "Misc",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name="widgets"
              focusedSize={31}
              normalSize={28}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="guidance"
        options={{
          title: "Guidance",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name="chat-bubble"
              focusedSize={31}
              normalSize={28}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name="account-circle"
              focusedSize={34}
              normalSize={31}
            />
          ),
        }}
      />
    </Tabs>
  );
}
