module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // expo-router
      'expo-router/babel',
      // react-native-reanimated must be last
      'react-native-reanimated/plugin',
    ],
  }
}
