import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const plugins = [tsconfigPaths()];

export default defineConfig({
  plugins,
  test: {
    globals: true,
    include: ['integration-tests/**/*.test.ts'],
    setupFiles: ['vitestIntegrationSetup'],
    testTimeout: 20 * 1000, // 20 seconds timeout
    coverage: {
      enabled: false,
    },
  },
});
