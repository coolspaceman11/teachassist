const IS_DEV = process.env.APP_VARIANT === "development";

module.exports = ({ config }) => {
  const basePlugins = config.plugins ?? [];

  return {
    ...config,

    // Different name so stable + dev can coexist.
    name: IS_DEV ? "TeachAssist+ Dev" : config.name,

    // Different Expo slug for development.
    slug: IS_DEV ? "teachassist-plus-dev" : config.slug,

    // Different deep-link scheme so QR codes open the DEV app.
    scheme: IS_DEV ? "teachassistplusdev" : config.scheme,

    ios: {
      ...config.ios,

      // Critical: unique bundle ID allows both apps on one iPhone.
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
          // Only make the special Expo dev-client scheme for the dev build.
          addGeneratedScheme: IS_DEV,
        },
      ],
    ],
  };
};