module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-worklets/plugin', // reanimated 4 ke liye yehi sahi hai, purana 'react-native-reanimated/plugin' nahi
    ],
  };
};