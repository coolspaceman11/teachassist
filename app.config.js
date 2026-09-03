const IS_DEV = process.env.APP_VARIANT === "development";

module.exports = ({ config }) => {
  const basePlugins = config.plugins ?? [];

  return {
    ...config,

    name: IS_DEV ? "TeachAssist+ Dev" : config.name,
    slug: IS_DEV ? "teachassist-plus-dev" : config.slug,
    scheme: IS_DEV ? "teachassistplusdev" : config.scheme,

    ios: {
      ...config.ios,
      bundleIdentifier: IS_DEV
        ? "com.teachassistplus.studentapp.dev"
        : config.ios?.bundleIdentifier,
      infoPlist: {
        ...(config.ios?.infoPlist ?? {}),
        NSLocationWhenInUseUsageDescription:
          "TeachAssist+ uses your location only to calculate your driving ETA to Maple High School.",
        NSHealthShareUsageDescription:
          "TeachAssist+ reads your step and activity totals so you can view a private activity summary in Misc.",
      },
      entitlements: {
        ...(config.ios?.entitlements ?? {}),
        "com.apple.developer.weatherkit": true,
        "com.apple.developer.healthkit": true,
      },
    },

    android: {
      ...config.android,
      package: IS_DEV
        ? "com.teachassistplus.studentapp.dev"
        : config.android?.package,
    },

    plugins: [
      ...basePlugins,
      [
        "expo-dev-client",
        {
          addGeneratedScheme: IS_DEV,
        },
      ],
      [
        "react-native-ble-plx",
        {
          isBackgroundEnabled: false,
          bluetoothAlwaysPermission:
            "Allow TeachAssist+ to connect to your Bluetooth devices, including your Flipper Zero.",
        },
      ],
    ],
  };
};
