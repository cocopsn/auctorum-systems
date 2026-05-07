import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Vitest config — runs from the monorepo root.
 *
 *   pnpm test           → watch mode
 *   pnpm test:run       → unit + integration (offline, deterministic, ~10s)
 *   pnpm test:e2e       → tests/e2e-vps/* (HTTP against med.auctorum.com.mx)
 *   pnpm test:integrity → scripts/check-data-integrity.ts (real SQL)
 *
 * Path resolution mirrors the apps' tsconfig + the workspace package names
 * so tests can import from `@quote-engine/*` and from `@/lib/*` (which
 * means "apps/medconcierge/src/lib/*" — same alias the medconcierge app
 * uses).
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts', 'tests/ai/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**', 'tests/e2e-vps/**'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'packages/ai/**/*.ts',
        'packages/db/schema/**/*.ts',
        'packages/notifications/**/*.ts',
        'apps/medconcierge/src/lib/**/*.ts',
      ],
      exclude: [
        '**/node_modules/**',
        '**/*.test.ts',
        '**/migrations/**',
        '**/seed*',
      ],
    },
  },
  resolve: {
    alias: {
      // Workspace packages — DO NOT add `/src` (none of these have a src/ subfolder)
      '@quote-engine/ai': path.resolve(__dirname, 'packages/ai'),
      '@quote-engine/db': path.resolve(__dirname, 'packages/db'),
      '@quote-engine/notifications': path.resolve(__dirname, 'packages/notifications'),
      '@quote-engine/payments': path.resolve(__dirname, 'packages/payments'),
      '@quote-engine/queue': path.resolve(__dirname, 'packages/queue'),
      '@quote-engine/events': path.resolve(__dirname, 'packages/events'),
      '@quote-engine/ui': path.resolve(__dirname, 'packages/ui'),
      // Match the medconcierge app's tsconfig path: `@/*` → `./src/*`
      '@': path.resolve(__dirname, 'apps/medconcierge/src'),
    },
  },
})
