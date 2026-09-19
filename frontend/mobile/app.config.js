module.exports = ({ config }) => {
  return {
    ...config,
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/04b08287-629b-4e36-b12c-d469080b1f02',
      enabled: true,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 5000,
    },
  };
};
