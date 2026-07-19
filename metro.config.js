const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Co-located test files (per the `testing` skill) live inside src/app,
// which Expo Router scans as its route directory. Without this, Metro
// evaluates *.test.tsx to check whether it's a route, executing its
// top-level imports — @testing-library/react-native pulls in Node's
// `console` module, which crashes the on-device bundle.
const testFilePattern = /\.test\.[jt]sx?$/;
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = Array.isArray(existingBlockList)
  ? [...existingBlockList, testFilePattern]
  : existingBlockList
    ? [existingBlockList, testFilePattern]
    : [testFilePattern];

module.exports = config;
