import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'bin/install': 'bin/install.ts',
    'bin/update': 'bin/update.ts',
    'scripts/build-hooks': 'scripts/build-hooks.ts',
    'scripts/fix-qwen-installation': 'scripts/fix-qwen-installation.ts',
    'hooks/ez-check-update': 'hooks/ez-check-update.ts',
    'hooks/ez-context-monitor': 'hooks/ez-context-monitor.ts',
    'hooks/ez-statusline': 'hooks/ez-statusline.ts'
  },
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  dts: true, // Enable type declaration generation (v5.0.0)
  sourcemap: 'inline', // Inline source maps for debugging (v6.0.0 BUILD-06)
  target: 'node18',
  treeshake: true,
  splitting: true, // Bundle splitting for OOP-optimized builds (v6.0.0 BUILD-01)
  platform: 'node',
  // Don't add banner - source files already have shebangs
  ignoreWatch: ['**/*.cjs', '**/*.js']
});
