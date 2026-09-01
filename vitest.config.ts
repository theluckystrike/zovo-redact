import path from 'path';
import { configDefaults, defineConfig } from 'vitest/config';

const retiredUpstreamSurfaceTests = [
  'scripts/update-readme-badges.test.js',
  'src/core/utils/__tests__/manifestPermissions.test.ts',
  'src/pages/popup/__tests__/changelogSettingPlacement.test.ts',
  'src/pages/popup/__tests__/nativeSiteCapabilityIntegration.test.ts',
  'src/pages/popup/__tests__/settingsSearchClearControl.test.ts',
  'src/pages/content/changelog/__tests__/changelog.test.ts',
  'src/pages/content/timestamp/__tests__/conversationHistoryObserver.test.ts',
];

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    exclude: [...configDefaults.exclude, ...retiredUpstreamSurfaceTests],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/tests/', '**/*.d.ts', '**/*.config.*', '**/mockData.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@locales': path.resolve(__dirname, './src/locales'),
      '@/core': path.resolve(__dirname, './src/core'),
      '@/features': path.resolve(__dirname, './src/features'),
      'wavedrom/render-any': path.resolve(__dirname, './node_modules/wavedrom/lib/render-any.js'),
    },
  },
});
