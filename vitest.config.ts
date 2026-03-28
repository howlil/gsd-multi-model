import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/test-setup.ts'],
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/types/**/*.types.test.ts',
      'tests/context/**/*.test.ts',
      'tests/core/**/*.test.ts',
      'tests/deploy/**/*.test.ts',
      'tests/perf/**/*.test.ts',
      'tests/e2e/**/*.test.ts',
      'tests/gates/**/*.test.ts',
      'tests/analytics/**/*.test.ts',
      'tests/finops/**/*.test.ts',
      'tests/state/**/*.test.ts',
      'tests/critical-paths/**/*.test.ts',
      'tests/property/**/*.test.ts'
    ],
    exclude: [
      'tests/fixtures/**',
      'node_modules/**',
      'dist/**'
    ],
    testTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        isolate: false,
      },
    },
    coverage: {
      provider: 'c8',
      threshold: 70,
      include: ['bin/lib/**/*.ts'],
      exclude: ['tests/**', 'node_modules/**']
    },
    // Resolve bin/lib imports to source files directly
    alias: {
      '^../../bin/lib/(.*)$': resolve(__dirname, 'bin/lib/$1'),
      '^../bin/lib/(.*)$': resolve(__dirname, 'bin/lib/$1'),
      '^../../../bin/lib/(.*)$': resolve(__dirname, 'bin/lib/$1'),
    }
  },
});
