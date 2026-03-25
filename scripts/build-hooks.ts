#!/usr/bin/env node
/**
 * Copy EZ hooks to dist for installation.
 * Hooks are compiled by tsup to dist/hooks/, then copied to hooks/dist/ for installation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HOOKS_SRC_DIR = path.join(__dirname, '..', 'dist', 'hooks');
const HOOKS_DEST_DIR = path.join(__dirname, '..', 'hooks', 'dist');

// Hooks to copy (compiled from TypeScript)
const HOOKS_TO_COPY: string[] = [
  'ez-check-update.js',
  'ez-context-monitor.js',
  'ez-statusline.js'
];

function build(): void {
  // Ensure dest directory exists
  if (!fs.existsSync(HOOKS_DEST_DIR)) {
    fs.mkdirSync(HOOKS_DEST_DIR, { recursive: true });
  }

  // Check if source directory exists (tsup should have compiled hooks)
  if (!fs.existsSync(HOOKS_SRC_DIR)) {
    console.warn('Warning: dist/hooks/ not found. Run npm run build first.');
    return;
  }

  // Copy hooks to dist
  for (const hook of HOOKS_TO_COPY) {
    const src = path.join(HOOKS_SRC_DIR, hook);
    const dest = path.join(HOOKS_DEST_DIR, hook);

    if (!fs.existsSync(src)) {
      console.warn(`Warning: ${hook} not found in dist/hooks/, skipping`);
      continue;
    }

    console.log(`Copying ${hook}...`);
    fs.copyFileSync(src, dest);
    console.log(`  → ${dest}`);
  }

  console.log('\nBuild complete.');
}

build();
