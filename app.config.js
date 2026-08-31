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
