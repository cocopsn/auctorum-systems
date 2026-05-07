import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Separate config for E2E tests against the deployed VPS. Slower, requires
 * internet, and may hit real rate limits. Runs ONLY when invoked explicitly
 * via `pnpm test:e2e`. Never blocks `pnpm test:run`.
 *
 * The base URL defaults to https://med.auctorum.com.mx but can be
 * overridden with TEST_BASE_URL for staging.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e-vps/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30_000,
    // Sequential — do not parallelize HTTP calls against prod
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@quote-engine/ai': path.resolve(__dirname, 'packages/ai'),
      '@quote-engine/db': path.resolve(__dirname, 'packages/db'),
      '@quote-engine/notifications': path.resolve(__dirname, 'packages/notifications'),
      '@': path.resolve(__dirname, 'apps/medconcierge/src'),
    },
  },
})
