module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
       "expo-router/babel",
      // other plugins...
      "react-native-reanimated/plugin", // 👈 LAST
    ],
  };
};
