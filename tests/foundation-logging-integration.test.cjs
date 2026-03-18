const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const TARGET_MODULES = [
  'ez-agents/bin/lib/state.cjs',
  'ez-agents/bin/lib/init.cjs',
  'ez-agents/bin/lib/commands.cjs',
  'ez-agents/bin/lib/core.cjs',
  'ez-agents/bin/lib/phase.cjs',
  'ez-agents/bin/lib/verify.cjs',
];

const LOG03_CRITICAL_MODULES = [
  'ez-agents/bin/lib/commands.cjs',
  'ez-agents/bin/lib/phase.cjs',
];

function assertCatchBlocksLogged(content, relPath) {
  const catches = [...content.matchAll(/catch\s*\(\s*[^)]*\)\s*\{([\s\S]*?)\n\s*\}/g)];
  for (const match of catches) {
    const body = match[1];
    assert.ok(
      /logger\.(warn|error)\(/.test(body),
      `${relPath} has catch(err) block without logger.warn/error`
    );
  }
}

test('foundation modules do not use silent catch blocks', () => {
  for (const relPath of TARGET_MODULES) {
    const fullPath = path.join(__dirname, '..', relPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(
      !/catch\s*\{\s*\}/g.test(content),
      `${relPath} still contains silent catch {}`
    );
  }
});

test('LOG-03 critical module list explicitly includes commands and phase', () => {
  assert.ok(
    TARGET_MODULES.includes('ez-agents/bin/lib/commands.cjs'),
    'commands.cjs must stay in silent-catch scan list'
  );
  assert.ok(
    TARGET_MODULES.includes('ez-agents/bin/lib/phase.cjs'),
    'phase.cjs must stay in silent-catch scan list'
  );
});

test('foundation modules route catch paths to logger.warn/error', () => {
  for (const relPath of TARGET_MODULES) {
    const fullPath = path.join(__dirname, '..', relPath);
    const content = fs.readFileSync(fullPath, 'utf-8');

    const hasCatch = /catch\s*\(/.test(content);
    if (!hasCatch) continue;

    assertCatchBlocksLogged(content, relPath);
  }
});

test('LOG-03 critical modules have logged catch(err) handlers', () => {
  for (const relPath of LOG03_CRITICAL_MODULES) {
    const fullPath = path.join(__dirname, '..', relPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assertCatchBlocksLogged(content, relPath);
  }
});
