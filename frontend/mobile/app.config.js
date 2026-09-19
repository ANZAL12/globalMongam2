module.exports = ({ config }) => {
  // Check if running in EAS Build, EAS Update, or GitHub Actions CI
  const isEAS = Boolean(
    process.env.EAS_BUILD ||
    process.env.CI ||
    process.env.EAS_UPDATE ||
    process.env.APP_ENV === 'production'
  );

  return {
    ...config,
    // When running locally in Expo Go, omit runtimeVersion so Expo Go uses its internal SDK runtime.
    // When building with EAS or publishing OTA updates via CI, enforce appVersion policy.
    ...(isEAS
      ? {
          runtimeVersion: {
            policy: 'appVersion',
          },
          updates: {
            url: 'https://u.expo.dev/04b08287-629b-4e36-b12c-d469080b1f02',
            enabled: true,
            checkAutomatically: 'ON_LOAD',
            fallbackToCacheTimeout: 5000,
          },
        }
      : {
          updates: {
            enabled: false,
          },
        }),
  };
};
