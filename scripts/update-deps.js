#!/usr/bin/env node

/**
 * Update Dependencies Script
 *
 * Manual dependency update workflow with staging → production promotion.
 * Use this instead of automated tools (Dependabot/Renovate) for better control.
 *
 * Usage:
 *   node scripts/update-deps.js                    # Check for updates
 *   node scripts/update-deps.js --staging          # Create staging branch
 *   node scripts/update-deps.js --promote          # Promote to production
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const STAGING_BRANCH = 'deps/staging';
const PRODUCTION_BRANCH = 'main';

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'check';
  
  console.log('Dependency Update Workflow\n');
  console.log('Mode:', mode);
  console.log('');
  
  if (mode === '--check' || mode === 'check') {
    checkForUpdates();
  } else if (mode === '--staging' || mode === 'staging') {
    createStagingBranch();
  } else if (mode === '--promote' || mode === 'promote') {
    promoteToProduction();
  } else {
    console.log('Usage:');
    console.log('  node scripts/update-deps.js check      # Check for updates');
    console.log('  node scripts/update-deps.js staging    # Create staging branch with updates');
    console.log('  node scripts/update-deps.js promote    # Promote staging to production');
    process.exit(1);
  }
}

/**
 * Check for available updates
 */
function checkForUpdates() {
  console.log('Checking for dependency updates...\n');
  
  try {
    // Run npm outdated
    const output = execSync('npm outdated --json', { encoding: 'utf8' });
    const outdated = JSON.parse(output);
    
    const packages = Object.keys(outdated);
    
    if (packages.length === 0) {
      console.log('✓ All dependencies are up to date!\n');
      return;
    }
    
    console.log(`Found ${packages.length} outdated packages:\n`);
    console.log('Package'.padEnd(30), 'Current'.padEnd(12), 'Wanted'.padEnd(12), 'Latest'.padEnd(12), 'Type');
    console.log('─'.repeat(80));
    
    for (const pkg of packages) {
      const info = outdated[pkg];
      const type = info.type || 'prod';
      console.log(
        pkg.padEnd(30),
        info.current.padEnd(12),
        info.wanted.padEnd(12),
        info.latest.padEnd(12),
        type
      );
    }
    
    console.log('\n');
    console.log('Next steps:');
    console.log('1. Review updates above');
    console.log('2. Run: node scripts/update-deps.js staging');
    console.log('3. Test in staging branch');
    console.log('4. Run: node scripts/update-deps.js promote\n');
    
  } catch (err) {
    if (err.status === 1) {
      console.log('✓ All dependencies are up to date!\n');
    } else {
      console.error('Failed to check for updates:', err.message);
      process.exit(1);
    }
  }
}

/**
 * Create staging branch with updates
 */
function createStagingBranch() {
  console.log('Creating staging branch with dependency updates...\n');
  
  try {
    // Check for uncommitted changes
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    if (status) {
      console.error('✗ Uncommitted changes detected. Please commit or stash first.\n');
      process.exit(1);
    }
    
    // Create staging branch
    console.log('Creating staging branch...');
    execSync(`git checkout -b ${STAGING_BRANCH}`, { stdio: 'inherit' });
    
    // Update dependencies
    console.log('\nUpdating dependencies...');
    execSync('npm update', { stdio: 'inherit' });
    
    // Pin to exact versions
    console.log('\nPinning to exact versions...');
    pinToExactVersions();
    
    // Install with exact versions
    console.log('\nInstalling with exact versions...');
    execSync('npm ci', { stdio: 'inherit' });
    
    // Run tests
    console.log('\nRunning tests...');
    execSync('npm test', { stdio: 'inherit' });
    
    // Run build
    console.log('\nRunning build...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Commit changes
    console.log('\nCommitting changes...');
    execSync('git add package.json package-lock.json', { stdio: 'inherit' });
    execSync('git commit -m "chore: update dependencies (staging)"', { stdio: 'inherit' });
    
    console.log('\n✓ Staging branch created successfully!\n');
    console.log('Next steps:');
    console.log(`1. Push branch: git push origin ${STAGING_BRANCH}`);
    console.log('2. Create PR and review changes');
    console.log('3. Test thoroughly');
    console.log('4. Run: node scripts/update-deps.js promote\n');
    
  } catch (err) {
    console.error('\n✗ Failed to create staging branch:', err.message);
    console.error('\nRolling back...');
    try {
      execSync(`git checkout ${PRODUCTION_BRANCH}`, { stdio: 'pipe' });
      execSync(`git branch -D ${STAGING_BRANCH}`, { stdio: 'pipe' });
      console.log('✓ Rolled back to production branch\n');
    } catch (rollbackErr) {
      console.error('✗ Rollback failed. Manual intervention may be required.\n');
    }
    process.exit(1);
  }
}

/**
 * Promote staging to production
 */
function promoteToProduction() {
  console.log('Promoting dependency updates to production...\n');
  
  try {
    // Check we're on main branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    if (currentBranch !== PRODUCTION_BRANCH) {
      console.error(`✗ Must be on ${PRODUCTION_BRANCH} branch. Current: ${currentBranch}\n`);
      process.exit(1);
    }
    
    // Check for uncommitted changes
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    if (status) {
      console.error('✗ Uncommitted changes detected. Please commit or stash first.\n');
      process.exit(1);
    }
    
    // Merge staging
    console.log('Merging staging branch...');
    execSync(`git merge ${STAGING_BRANCH} --no-ff -m "chore: promote dependency updates to production"`, { stdio: 'inherit' });
    
    // Final test
    console.log('\nRunning final tests...');
    execSync('npm test', { stdio: 'inherit' });
    
    // Final build
    console.log('\nRunning final build...');
    execSync('npm run build', { stdio: 'inherit' });
    
    console.log('\n✓ Promoted to production successfully!\n');
    console.log('Next steps:');
    console.log(`1. Push: git push origin ${PRODUCTION_BRANCH}`);
    console.log(`2. Delete staging: git branch -d ${STAGING_BRANCH}`);
    console.log('3. Monitor for issues\n');
    
  } catch (err) {
    console.error('\n✗ Failed to promote to production:', err.message);
    process.exit(1);
  }
}

/**
 * Pin all dependencies to exact versions
 */
function pinToExactVersions() {
  const pkgPath = join(process.cwd(), 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  
  let changed = false;
  
  // Pin dependencies
  if (pkg.dependencies) {
    for (const [name, version] of Object.entries(pkg.dependencies)) {
      const pinned = version.replace(/^[~^]/, '');
      if (pinned !== version) {
        pkg.dependencies[name] = pinned;
        changed = true;
      }
    }
  }
  
  // Pin devDependencies
  if (pkg.devDependencies) {
    for (const [name, version] of Object.entries(pkg.devDependencies)) {
      const pinned = version.replace(/^[~^]/, '');
      if (pinned !== version) {
        pkg.devDependencies[name] = pinned;
        changed = true;
      }
    }
  }
  
  if (changed) {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log('✓ Pinned all dependencies to exact versions');
  } else {
    console.log('✓ All dependencies already pinned to exact versions');
  }
}

// Run main function
main();
