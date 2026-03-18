#!/usr/bin/env node

/**
 * Fix Qwen Code Installation
 * 
 * This script fixes the Qwen Code installation by copying ez-agents commands
 * to the correct ~/.qwen/commands/ez/ directory instead of ~/.qwen/skills/
 * 
 * Usage: node fix-qwen-installation.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const reset = '\x1b[0m';

console.log(`${cyan}Fixing Qwen Code Installation${reset}\n`);

// Get Qwen config directory
const qwenDir = process.env.QWEN_CONFIG_DIR 
  ? path.resolve(process.env.QWEN_CONFIG_DIR)
  : path.join(os.homedir(), '.qwen');

const skillsDir = path.join(qwenDir, 'skills');
const commandsDir = path.join(qwenDir, 'commands');
const ezCommandsDir = path.join(commandsDir, 'ez');

// Find ez-agents installation
let ezAgentsDir = null;
const possibleLocations = [
  path.join(qwenDir, 'ez-agents'),
  path.join(qwenDir, '.ez-agents'),
  path.join(os.homedir(), '.ez-agents'),
];

for (const loc of possibleLocations) {
  if (fs.existsSync(loc)) {
    ezAgentsDir = loc;
    break;
  }
}

if (!ezAgentsDir) {
  console.log(`${yellow}Warning:${reset} ez-agents installation not found in common locations`);
  console.log(`Looking for workflows in ${skillsDir}/ez-*/`);
  
  // Try to find workflows from installed skills
  if (!fs.existsSync(skillsDir)) {
    console.log(`${red}Error:${reset} Neither ez-agents nor skills directory found`);
    console.log(`Please run: ${cyan}ez-agents --qwen --global${reset}`);
    process.exit(1);
  }
}

console.log(`Qwen config directory: ${cyan}${qwenDir}${reset}`);
console.log(`Current skills location: ${yellow}${skillsDir}${reset}`);
console.log(`Target commands location: ${green}${ezCommandsDir}${reset}\n`);

// Create commands/ez directory
console.log(`${cyan}Step 1: Creating commands directory${reset}`);
fs.mkdirSync(ezCommandsDir, { recursive: true });
console.log(`${green}✓${reset} Created ${ezCommandsDir}\n`);

// Copy workflow files from skills to commands
console.log(`${cyan}Step 2: Copying ez-agents commands${reset}`);

let sourceDir = null;
if (ezAgentsDir && fs.existsSync(path.join(ezAgentsDir, 'workflows'))) {
  sourceDir = path.join(ezAgentsDir, 'workflows');
} else if (fs.existsSync(skillsDir)) {
  // Check if skills are installed as ez-* directories
  const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith('ez-'))
    .map(d => d.name);
  
  if (skillDirs.length > 0) {
    console.log(`${yellow}Note:${reset} Found skills in skills/ directory: ${skillDirs.join(', ')}`);
    console.log(`${yellow}Note:${reset} Qwen Code uses commands/ directory instead\n`);
  }
}

if (sourceDir && fs.existsSync(sourceDir)) {
  const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    const srcFile = path.join(sourceDir, file);
    const destFile = path.join(ezCommandsDir, file);
    
    try {
      let content = fs.readFileSync(srcFile, 'utf-8');
      
      // Update any references from skills/ to commands/
      content = content.replace(/~\/\.qwen\/skills\//g, '~/.qwen/commands/');
      content = content.replace(/\.qwen\/skills\//g, '.qwen/commands/');
      
      fs.writeFileSync(destFile, content, 'utf-8');
      console.log(`${green}✓${reset} Copied ${file}`);
    } catch (err) {
      console.log(`${red}✗${reset} Failed to copy ${file}: ${err.message}`);
    }
  }
  
  console.log(`\n${green}✓${reset} Copied ${files.length} commands\n`);
} else {
  console.log(`${yellow}Note:${reset} No workflows found to copy`);
  console.log(`The commands will be available after running ${cyan}ez-agents --qwen --global${reset} again\n`);
}

// Verify installation
console.log(`${cyan}Step 3: Verifying installation${reset}`);
if (fs.existsSync(ezCommandsDir)) {
  const commandFiles = fs.readdirSync(ezCommandsDir).filter(f => f.endsWith('.md'));
  console.log(`${green}✓${reset} Found ${commandFiles.length} command files in ${ezCommandsDir}`);
  
  if (commandFiles.length > 0) {
    console.log(`\n${green}Success!${reset} EZ Agents commands are now available in Qwen Code\n`);
    console.log(`Available commands:`);
    
    // Show first 10 commands
    const sampleCommands = commandFiles.slice(0, 10).map(f => f.replace('.md', ''));
    sampleCommands.forEach(cmd => {
      console.log(`  ${cyan}/ez:${cmd}${reset}`);
    });
    
    if (commandFiles.length > 10) {
      console.log(`  ... and ${commandFiles.length - 10} more`);
    }
    
    console.log(`\n${green}Usage:${reset}`);
    console.log(`  Open a project in Qwen Code and run:`);
    console.log(`  ${cyan}/ez:help${reset} - Show all available commands`);
    console.log(`  ${cyan}/ez:new-project${reset} - Initialize new project`);
    console.log(`  ${cyan}/ez:quick${reset} - Quick start\n`);
  }
} else {
  console.log(`${red}✗${reset} Commands directory not created`);
}

console.log(`${cyan}Note:${reset} You may need to restart Qwen Code for changes to take effect\n`);
