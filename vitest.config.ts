import { defineConfig } from 'vitest/config';

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
      'tests/deploy/**/*.test.ts',
      'tests/perf/**/*.test.ts',
      'tests/gates/**/*.test.ts',
      'tests/analytics/**/*.test.ts',
      'tests/finops/**/*.test.ts'
    ],
    exclude: [
      'tests/fixtures/**',
      'node_modules/**'
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
    // Allow importing .ts files without .js extension in tests
    alias: {
      '^../../bin/lib/(.*)$': '../../bin/lib/$1.js',
      '^../bin/lib/(.*)$': '../bin/lib/$1.js',
    }
  },
});
