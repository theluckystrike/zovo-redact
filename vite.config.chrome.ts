import { ManifestV3Export, crx } from '@crxjs/vite-plugin';
import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Plugin, defineConfig, mergeConfig } from 'vite';

import {
  collectBundleAssetPaths,
  collectStaticAssetPaths,
  pruneDevBuildAssets,
  readViteManifestAssetPaths,
  shouldPruneDevBuildAssets,
} from './scripts/dev-build-assets';
import baseConfig, { baseBuildOptions, baseManifest } from './vite.config.base';

const isDev = process.env.__DEV__ === 'true';
const outDirName =
  process.env.VOYAGER_BUILD_TARGET === 'edge'
    ? 'dist_edge'
    : isDev
      ? 'dist_chrome_dev'
      : 'dist_chrome';
const outDir = resolve(__dirname, outDirName);

function devBuildReadyPlugin(): Plugin | null {
  if (!isDev || outDirName !== 'dist_chrome_dev') return null;

  const viteManifestPath = resolve(outDir, '.vite', 'manifest.json');
  let previousAssets = new Set<string>();
  let canPruneAssets = false;

  return {
    name: 'voyager-dev-build-ready',
    apply: 'build',
    enforce: 'post',
    buildStart() {
      const hadPreviousManifest = existsSync(viteManifestPath);
      previousAssets = readViteManifestAssetPaths(viteManifestPath);
      // A missing manifest is normal for the first build. If one exists but
      // cannot be read, skip cleanup rather than guessing which live assets are
      // safe to remove.
      canPruneAssets = shouldPruneDevBuildAssets(hadPreviousManifest, previousAssets.size);
    },
    writeBundle(_options, bundle) {
      if (canPruneAssets) {
        const currentAssets = collectBundleAssetPaths(Object.keys(bundle));
        const staticAssets = collectStaticAssetPaths(resolve(__dirname, 'public', 'assets'));
        pruneDevBuildAssets(
          outDir,
          new Set([...previousAssets, ...currentAssets, ...staticAssets]),
        );
      }
      // This is the commit marker consumed by launch-chrome.cjs. It is written
      // only after Rollup has finished writing every asset and stale generations
      // have been pruned, so Chrome never reloads against a half-written bundle.
      writeFileSync(resolve(outDir, '.voyager-build-ready'), `${Date.now()}\n`);
    },
  };
}
export const chromeManifest = {
  ...baseManifest,
} as ManifestV3Export;

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [
      crx({
        manifest: chromeManifest,
        browser: 'chrome',
        contentScripts: {
          injectCss: true,
        },
      }),
      devBuildReadyPlugin(),
    ],
    build: {
      ...baseBuildOptions,
      outDir,
    },
  }),
);
