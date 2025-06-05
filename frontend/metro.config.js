const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional file types
config.resolver.assetExts.push(
  // Audio formats
  'caf',
  'mp3',
  'm4a',
  'aac',
  'wav',
  // Video formats
  'mp4',
  'm4v',
  'mov',
  'avi',
  'mkv',
  // Document formats
  'pdf',
  'doc',
  'docx',
  // Other
  'db'
);

// Configure transformer for better performance
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: {
    keep_classnames: true,
    keep_fnames: true,
  },
};

module.exports = config;
