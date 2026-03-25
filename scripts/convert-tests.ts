#!/usr/bin/env node

/**
 * Test File Converter Script
 * 
 * Converts .cjs and .js test files to TypeScript (.ts)
 * Usage: node scripts/convert-tests.js [directory]
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patterns to replace
const replacements = [
  // Import conversions
  { pattern: /const\s+assert\s*=\s*require\(['"]assert['"]\);/g, replacement: "import assert from 'node:assert';" },
  { pattern: /const\s+assert\s*=\s*require\(['"]node:assert['"]\);/g, replacement: "import assert from 'node:assert';" },
  { pattern: /const\s+\{\s*describe,\s*it\s*\}\s*=\s*require\(['"]node:test['"]\);/g, replacement: "import { describe, it } from 'node:test';" },
  { pattern: /const\s+\{\s*test\s*\}\s*=\s*require\(['"]node:test['"]\);/g, replacement: "import { test } from 'node:test';" },
  { pattern: /const\s+path\s*=\s*require\(['"]path['"]\);/g, replacement: "import * as path from 'path';" },
  { pattern: /const\s+fs\s*=\s*require\(['"]fs['"]\);/g, replacement: "import * as fs from 'fs';" },
  { pattern: /const\s+os\s*=\s*require\(['"]os['"]\);/g, replacement: "import * as os from 'os';" },
  { pattern: /const\s+\{\s*execSync\s*\}\s*=\s*require\(['"]child_process['"]\);/g, replacement: "import { execSync } from 'child_process';" },
  { pattern: /const\s+\{\s*spawnSync\s*\}\s*=\s*require\(['"]child_process['"]\);/g, replacement: "import { spawnSync } from 'child_process';" },
  { pattern: /const\s+\{\s*execSync,\s*spawnSync\s*\}\s*=\s*require\(['"]child_process['"]\);/g, replacement: "import { execSync, spawnSync } from 'child_process';" },
  
  // Module imports - convert to .js extensions
  { pattern: /require\(['"]\.\.\/(['"])?test-utils\.cjs['"]\);/g, replacement: "import { createTempDir, cleanupTempDir, test, runTests, runTestsWithCounters, getTestStats, resetTestCounters } from '../test-utils.js';" },
  { pattern: /require\(['"]\.\.\/(['"])?helpers\.cjs['"]\);/g, replacement: "import { runEzTools, createTempProject, createTempGitProject, cleanup } from '../helpers.js';" },
  { pattern: /require\(['"]\.\.\/(['"])?\.\.\/(['"])?bin\/lib\/([^'"]+)\.cjs['"]\);/g, replacement: "import $3 from '../../bin/lib/$3.cjs';" },
  { pattern: /require\(['"]\.\.\/(['"])?\.\.\/(['"])?ez-agents\/bin\/lib\/([^'"]+)\.cjs['"]\);/g, replacement: "import $3 from '../../bin/lib/$3.cjs';" },
  { pattern: /require\(['"]\.\.\/(['"])?\.\.\/(['"])?bin\/lib\/([^'"]+)\.cjs['"]\);/g, replacement: "import { $3 } from '../../bin/lib/$3.cjs';" },
  
  // Module exports - remove for ESM
  { pattern: /module\.exports\s*=\s*\{[^}]+\};/g, replacement: '// Exported via ES modules' },
  { pattern: /module\.exports\s*=\s*\{([^}]+)\};/g, replacement: '// Exports: $1' },
  
  // __dirname replacement for ESM
  { pattern: /const\s+__dirname\s*=\s*path\.dirname\(__filename\);/g, replacement: "const __dirname = path.dirname(fileURLToPath(import.meta.url));" },
  
  // Add import.meta.url if needed
  { pattern: /import\s+\{\s*fileURLToPath\s*\}\s+from\s+['"]url['"];?/g, replacement: "import { fileURLToPath } from 'url';" },
];

// Files that need special handling
const specialFiles = [
  'verify.test.cjs.skip',
  'agent-frontmatter.test.cjs.skip',
  'circuit-breaker.test.cjs.skip',
];

function convertFile(filePath: string): boolean {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;
    
    // Apply replacements
    for (const { pattern, replacement } of replacements) {
      content = content.replace(pattern, replacement as string);
    }
    
    // Add shebang removal if present
    if (content.startsWith('#!/usr/bin/env node')) {
      content = content.replace('#!/usr/bin/env node\n', '');
    }
    
    // Add import for fileURLToPath if __dirname is used
    if (content.includes('__dirname') || content.includes('__filename')) {
      if (!content.includes("import { fileURLToPath } from 'url'")) {
        content = "import { fileURLToPath } from 'url';\nimport path from 'path';\n" + content;
      }
    }
    
    // Write converted file
    const newPath = filePath.replace(/\.cjs(\.skip)?$/, '.ts').replace(/\.js$/, '.ts');
    fs.writeFileSync(newPath, content, 'utf-8');
    
    console.log(`✓ Converted: ${path.basename(filePath)} -> ${path.basename(newPath)}`);
    return true;
  } catch (err) {
    console.error(`✗ Failed: ${path.basename(filePath)} - ${err instanceof Error ? err.message : 'Unknown error'}`);
    return false;
  }
}

function findTestFiles(dir: string): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(fullPath);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.cjs') || entry.name.endsWith('.js')) && entry.name.includes('.test')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

// Main execution
const targetDir = process.argv[2] || path.join(__dirname, '..', 'tests');

console.log(`\n=== Test File Converter ===`);
console.log(`Scanning: ${targetDir}\n`);

const files = findTestFiles(targetDir);
console.log(`Found ${files.length} test files to convert\n`);

let success = 0;
let failed = 0;

for (const file of files) {
  if (convertFile(file)) {
    success++;
  } else {
    failed++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`Converted: ${success}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
