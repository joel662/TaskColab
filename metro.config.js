const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure proper handling of all file types
config.resolver.assetExts.push(
  // Fonts
  'ttf',
  'otf',
  'woff',
  'woff2',
  // Images
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  // Audio
  'mp3',
  'wav',
  'm4a',
  'aac',
  'oga',
  'ogg',
  // Video
  'mp4',
  'webm',
  'mov',
  'avi',
  'wmv',
  'flv',
  'mkv'
);

module.exports = config;
