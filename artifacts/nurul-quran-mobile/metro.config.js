const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Let Metro find packages in the pnpm monorepo workspace root
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Block list: exclude temp files pnpm creates during install (e.g. react-presence_tmp_2891)
// and other non-mobile artifacts from being watched by Metro
config.resolver.blockList = [
  // pnpm temp directories (created/deleted during installs, cause ENOENT crashes)
  /_tmp_\d+/,
  // Other workspace artifacts — only watch nurul-quran-mobile
  /workspace\/artifacts\/(?!nurul-quran-mobile).*/,
  // Replit internals
  /workspace\/\.local\/.*/,
  /workspace\/\.replit.*/,
];

// Ensure symlinks from pnpm are resolved correctly
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
