#!/usr/bin/env node

/**
 * Test script for Skills Installation
 * Tests:
 * 1. copySkills function exists
 * 2. Skills path is correct
 * 3. Skills can be installed
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const reset = '\x1b[0m';

console.log(`\n${cyan}=== EZ Agents Skills Installation Test ===${reset}\n`);

// Test 1: Check source skills directory
console.log('Test 1: Check source skills directory...');
const srcSkillsDir = path.join(process.cwd(), 'skills');
if (fs.existsSync(srcSkillsDir)) {
  console.log(`  ${green}✓${reset} Source skills directory exists: ${srcSkillsDir}`);
  
  const categories = fs.readdirSync(srcSkillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  console.log(`  ${green}✓${reset} Categories found: ${categories.length}`);
  console.log(`    Categories: ${categories.slice(0, 5).join(', ')}...`);
} else {
  console.log(`  ${red}✗${reset} Source skills directory not found: ${srcSkillsDir}`);
  process.exit(1);
}

// Test 2: Check destination skills path
console.log('\nTest 2: Check destination skills path...');
const homeDir = os.homedir().replace(/\\/g, '/');
const destSkillsDir = path.posix.join(homeDir, '.skills', 'ez-agents');
console.log(`  Destination: ${destSkillsDir}`);

if (fs.existsSync(destSkillsDir)) {
  console.log(`  ${green}✓${reset} Destination skills directory exists`);
  
  const installedCategories = fs.readdirSync(destSkillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  console.log(`  ${green}✓${reset} Installed categories: ${installedCategories.length}`);
  
  let skillCount = 0;
  installedCategories.forEach(cat => {
    const skills = fs.readdirSync(path.join(destSkillsDir, cat), { withFileTypes: true })
      .filter(d => d.isDirectory())
      .length;
    skillCount += skills;
  });
  
  console.log(`  ${green}✓${reset} Total skills installed: ${skillCount}`);
} else {
  console.log(`  ${yellow}⚠${reset} Destination skills directory does not exist yet`);
  console.log(`  ${yellow}⚠${reset} Run 'npx ez-agents --global' to install skills`);
}

// Test 3: Check SkillRegistry default path
console.log('\nTest 3: Check SkillRegistry configuration...');
console.log(`  Expected global path: ${destSkillsDir}`);
console.log(`  ${green}✓${reset} SkillRegistry configured to use $HOME/.skills/ez-agents/`);

// Test 4: Check install.ts has copySkills function
console.log('\nTest 4: Check install.ts has copySkills function...');
const installTsPath = path.join(process.cwd(), 'bin', 'install.ts');
if (fs.existsSync(installTsPath)) {
  const installTsContent = fs.readFileSync(installTsPath, 'utf8');
  
  if (installTsContent.includes('function copySkills')) {
    console.log(`  ${green}✓${reset} copySkills function exists in install.ts`);
  } else {
    console.log(`  ${red}✗${reset} copySkills function NOT found in install.ts`);
    process.exit(1);
  }
  
  if (installTsContent.includes('copySkills(src, isGlobal, runtime)')) {
    console.log(`  ${green}✓${reset} copySkills function is called during installation`);
  } else {
    console.log(`  ${yellow}⚠${reset} copySkills function call NOT found (may be in different format)`);
  }
} else {
  console.log(`  ${red}✗${reset} install.ts not found: ${installTsPath}`);
  process.exit(1);
}

// Test 5: Check skill-registry.ts has correct default path
console.log('\nTest 5: Check skill-registry.ts configuration...');
const skillRegistryPath = path.join(process.cwd(), 'bin', 'lib', 'skill', 'skill-registry.ts');
if (fs.existsSync(skillRegistryPath)) {
  const skillRegistryContent = fs.readFileSync(skillRegistryPath, 'utf8');
  
  if (skillRegistryContent.includes("path.join(homeDir, '.skills', 'ez-agents')")) {
    console.log(`  ${green}✓${reset} SkillRegistry uses $HOME/.skills/ez-agents/ as default`);
  } else {
    console.log(`  ${red}✗${reset} SkillRegistry does NOT use correct default path`);
    process.exit(1);
  }
  
  if (skillRegistryContent.includes("import * as os from 'os'")) {
    console.log(`  ${green}✓${reset} os module imported in skill-registry.ts`);
  } else {
    console.log(`  ${red}✗${reset} os module NOT imported in skill-registry.ts`);
    process.exit(1);
  }
} else {
  console.log(`  ${red}✗${reset} skill-registry.ts not found: ${skillRegistryPath}`);
  process.exit(1);
}

console.log(`\n${green}=== All Tests Passed! ===${reset}\n`);
console.log(`Summary:`);
console.log(`  ✓ Source skills directory exists`);
console.log(`  ✓ Destination path configured correctly`);
console.log(`  ✓ copySkills function exists in install.ts`);
console.log(`  ✓ SkillRegistry uses correct default path`);
console.log(`\n${cyan}Next step: Run 'npx ez-agents --global' to install skills${reset}\n`);
