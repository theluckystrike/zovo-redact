import { ManifestV3Export } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { BuildOptions, defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import { stripDevIcons, stripI18nDescriptions } from './custom-vite-plugins';
import devManifest from './manifest.dev.json';
import manifest from './manifest.json';
import pkg from './package.json';

const isDev = process.env.__DEV__ === 'true';
const buildTarget = process.env.VOYAGER_BUILD_TARGET === 'edge' ? 'edge' : 'chrome';
// set this flag to true, if you want localization support
const localize = false;

export const baseManifest = {
  ...manifest,
  version: pkg.version,
  ...(isDev ? devManifest : ({} as ManifestV3Export)),
  ...(localize
    ? {
        name: '__MSG_extName__',
        description: '__MSG_extDescription__',
        default_locale: 'en',
      }
    : {}),
  // Dev override: bypass the i18n placeholder so the unpacked dev extension
  // shows up as "Voyager (Dev)" in chrome://extensions, the toolbar tooltip,
  // and OS task switchers. Makes it impossible to confuse with the Chrome Web
  // Store install when both are loaded.
  ...(isDev ? { name: 'Zovo Redact (Dev)' } : {}),
} as ManifestV3Export;

export const baseBuildOptions: BuildOptions = {
  sourcemap: isDev,
  emptyOutDir: !isDev,
  // Content scripts run under page CSP context for DOM-injected preload links.
  // Disable Vite modulepreload hints to avoid generating "/assets/*" requests
  // on the host page origin (e.g. aistudio.google.com), which are blocked by CSP.
  modulePreload: false,
  rollupOptions: {
    output: {
      entryFileNames: 'assets/zr2-[name]-[hash].min.js',
      chunkFileNames: 'assets/zr2-[name]-[hash].min.js',
      assetFileNames: 'assets/zr2-[name]-[hash][extname]',
    },
  },
};

export default defineConfig({
  define: {
    'import.meta.env.VOYAGER_BUILD_TARGET': JSON.stringify(buildTarget),
    __SUPABASE_ANON_KEY__: JSON.stringify(process.env.SUPABASE_ANON_KEY?.trim() || ''),
  },
  resolve: {
    alias: {
      // The public WaveDrom entrypoint eagerly bundles its browser editor,
      // including an eval-based parser that this renderer never calls. Import
      // only the pinned package's render primitive so extension artifacts stay
      // CSP-safe and store-review friendly.
      'wavedrom/render-any': resolve(__dirname, 'node_modules/wavedrom/lib/render-any.js'),
    },
  },
  plugins: [tsconfigPaths(), react(), stripDevIcons(isDev), stripI18nDescriptions(isDev)],
  publicDir: resolve(__dirname, 'redact-public'),
  esbuild: {
    pure: isDev ? [] : ['console.log', 'console.debug'],
  },
});
