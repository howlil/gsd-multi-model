/**
 * Gate 7 Release Readiness Validator Tests
 */

import { describe, it, beforeEach, afterEach } from 'vitest';
import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the validator
const {
  validateReleaseReadiness,
  getReleaseRequirements,
  validateRollbackPlan
} = await import(path.join(__dirname, '../../../.planning/gates/gate-07-release/validator.cjs'));

describe('Gate 7 Validator', () => {
  describe('getReleaseRequirements', () => {
    it('should return MVP requirements', () => {
      const reqs = getReleaseRequirements('mvp');
      assert.ok(reqs.requirements.includes('smoke_tests'));
      assert.ok(reqs.requirements.includes('rollback_plan'));
    });
    
    it('should return Medium requirements', () => {
      const reqs = getReleaseRequirements('medium');
      assert.ok(reqs.requirements.includes('smoke_tests'));
      assert.ok(reqs.requirements.includes('rollback_plan'));
      assert.ok(reqs.requirements.includes('monitoring'));
    });
    
    it('should return Enterprise requirements', () => {
      const reqs = getReleaseRequirements('enterprise');
      assert.ok(reqs.requirements.includes('smoke_tests'));
      assert.ok(reqs.requirements.includes('rollback_plan'));
      assert.ok(reqs.requirements.includes('monitoring'));
      assert.ok(reqs.requirements.includes('runbooks'));
    });
    
    it('should throw for unknown tier', () => {
      assert.throws(
        () => getReleaseRequirements('invalid'),
        /Unknown tier/
      );
    });
  });
  
  describe('validateRollbackPlan', () => {
    let tempFile;
    
    beforeEach(() => {
      tempFile = path.join(os.tmpdir(), `rollback-${Date.now()}.md`);
    });
    
    afterEach(() => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // Ignore
      }
    });
    
    it('should return failure when rollback plan does not exist', () => {
      const result = validateRollbackPlan('/nonexistent/rollback.md');
      assert.strictEqual(result.pass, false);
      assert.strictEqual(result.valid, false);
    });
    
    it('should fail when rollback plan has too few steps', () => {
      const content = `# Rollback Plan

1. Stop the app
2. Start the app
`;
      fs.writeFileSync(tempFile, content);
      const result = validateRollbackPlan(tempFile);
      assert.strictEqual(result.pass, false);
      assert.ok(result.issues.some(i => i.includes('too simple')));
    });
    
    it('should pass when rollback plan is complete', () => {
      const content = `# Rollback Plan

## Backup Procedure
1. Create database backup
2. Backup current code

## Revert Procedure  
1. Stop the application
2. Restore previous version
3. Restore database from backup
4. Restart application

## Verification
1. Check health endpoint
2. Verify core functionality
3. Monitor error rates
`;
      fs.writeFileSync(tempFile, content);
      const result = validateRollbackPlan(tempFile);
      assert.strictEqual(result.pass, true);
      assert.ok(result.stepCount >= 3);
    });
    
    it('should fail when missing backup procedure', () => {
      const content = `# Rollback Plan

1. Revert code
2. Restart app
`;
      fs.writeFileSync(tempFile, content);
      const result = validateRollbackPlan(tempFile);
      assert.strictEqual(result.pass, false);
      assert.ok(result.issues.some(i => i.includes('backup')));
    });
  });
  
  describe('validateReleaseReadiness', () => {
    let tempDir;
    
    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate7-test-'));
    });
    
    afterEach(() => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    
    it('should fail MVP when rollback plan missing', () => {
      const result = validateReleaseReadiness(tempDir, 'mvp');
      assert.strictEqual(result.pass, false);
      assert.ok(result.failures.some(f => f.includes('Rollback')));
    });
    
    it('should pass MVP with valid rollback plan', () => {
      // Create docs directory and rollback plan
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir);
      
      const rollbackContent = `# Rollback Plan

## Backup
1. Backup database
2. Backup code

## Revert
1. Stop application
2. Restore previous version  
3. Restore database
4. Restart application

## Verify
1. Check health
2. Test functionality
`;
      fs.writeFileSync(path.join(docsDir, 'rollback.md'), rollbackContent);
      
      const result = validateReleaseReadiness(tempDir, 'mvp');
      assert.strictEqual(result.pass, true);
      assert.strictEqual(result.rollback_valid, true);
    });
    
    it('should fail medium tier without monitoring', () => {
      // Create valid rollback
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir);
      fs.writeFileSync(path.join(docsDir, 'rollback.md'), `# Rollback

## Backup
1. Backup DB

## Revert  
1. Stop
2. Restore
3. Start

## Verify
1. Check
`);
      
      const result = validateReleaseReadiness(tempDir, 'medium');
      assert.strictEqual(result.pass, false);
      assert.ok(result.failures.some(f => f.includes('Monitoring')));
    });
    
    it('should pass medium tier with monitoring configured', () => {
      // Create docs and monitoring
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir);
      fs.mkdirSync(path.join(tempDir, '.planning', 'observability'), { recursive: true });

      fs.writeFileSync(path.join(docsDir, 'rollback.md'), `# Rollback

## Backup
1. Backup DB

## Revert
1. Stop
2. Restore previous version
3. Start

## Verify
1. Check
`);

      const result = validateReleaseReadiness(tempDir, 'medium');
      assert.strictEqual(result.pass, true, `Expected pass but got failures: ${result.failures.join(', ')}`);
    });
  });
});
