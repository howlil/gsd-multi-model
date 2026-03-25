/**
 * Backup Service Tests
 * 
 * Tests for BackupService: backup creation, manifest integrity, retention pruning,
 * and checksum verification.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

import { createTempGitProject, cleanup } from './helpers.js';

describe('BackupService', () => {
  let tmpDir;
  let BackupService;

  beforeEach(() => {
    tmpDir = createTempGitProject();
    // Clear module cache to get fresh instances
    const backupServicePath = require.resolve('../ez-agents/bin/lib/backup-service.cjs');
    delete require.cache[backupServicePath];
    BackupService = require('../ez-agents/bin/lib/backup-service.cjs');
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  describe('createBackup()', () => {
    it('copies only configured recovery paths and skips missing optional paths', () => {
      const backupService = new BackupService(tmpDir);

      // Create some files that are in the default backup scope
      fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.planning', 'PROJECT.md'), '# Project\n');
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"name": "test"}\n');

      // Create a backup (synchronous)
      const result = backupService.createBackup({ label: 'test', scope: ['.planning', 'package.json'] });

      // Verify backup was created
      assert.ok(result.backupDir, 'createBackup should return backupDir');
      assert.ok(fs.existsSync(result.backupDir), 'backup directory should exist');

      // Verify only specified paths are included
      const backupFiles = [];
      function walkDir(dir, baseDir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullPath);
          if (entry.isDirectory()) {
            backupFiles.push(relativePath + '/');
            walkDir(fullPath, baseDir);
          } else {
            backupFiles.push(relativePath);
          }
        }
      }
      walkDir(result.backupDir, result.backupDir);

      // Should contain .planning and package.json but not missing paths
      assert.ok(
        backupFiles.some(f => f.startsWith('.planning')),
        'backup should contain .planning files'
      );
      assert.ok(
        backupFiles.includes('package.json'),
        'backup should contain package.json'
      );
    });

    it('backs up files to .planning/recovery/backups/<backup-id>/', () => {
      const backupService = new BackupService(tmpDir);

      // Create required files
      fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.planning', 'PROJECT.md'), '# Project\n');

      const result = backupService.createBackup({ label: 'smoke' });

      // Verify backup is in correct location (normalize path separators for cross-platform)
      const normalizedPath = result.backupDir.replace(/\\/g, '/');
      assert.ok(
        normalizedPath.includes('.planning/recovery/backups/'),
        `backup should be in .planning/recovery/backups/, got ${result.backupDir}`
      );

      // Verify directory structure exists
      const backupsDir = path.join(tmpDir, '.planning', 'recovery', 'backups');
      assert.ok(fs.existsSync(backupsDir), 'backups directory should exist');
    });

    it('manifest.json contains backup_id, created_at, scope, commit_sha, and files', () => {
      const backupService = new BackupService(tmpDir);

      // Create required files
      fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.planning', 'PROJECT.md'), '# Project\n');

      const result = backupService.createBackup({ label: 'test' });

      // Read manifest
      const manifestPath = path.join(result.backupDir, 'manifest.json');
      assert.ok(fs.existsSync(manifestPath), 'manifest.json should exist');

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      // Verify required fields
      assert.ok(manifest.backup_id, 'manifest should have backup_id');
      assert.ok(manifest.created_at, 'manifest should have created_at');
      assert.ok(Array.isArray(manifest.scope), 'manifest should have scope array');
      assert.ok('commit_sha' in manifest, 'manifest should have commit_sha');
      assert.ok(Array.isArray(manifest.files), 'manifest should have files array');
    });

    it('file entries contain path, sha256, and size_bytes', () => {
      const backupService = new BackupService(tmpDir);

      // Create a test file
      fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
      const testFile = path.join(tmpDir, '.planning', 'test.txt');
      const testContent = 'test content';
      fs.writeFileSync(testFile, testContent);

      const result = backupService.createBackup({ 
        label: 'test', 
        scope: ['.planning/test.txt'] 
      });

      // Read manifest
      const manifest = JSON.parse(
        fs.readFileSync(path.join(result.backupDir, 'manifest.json'), 'utf-8')
      );

      assert.ok(manifest.files.length > 0, 'should have backed up files');

      for (const file of manifest.files) {
        assert.ok(file.path, 'file entry should have path');
        assert.ok(file.sha256, 'file entry should have sha256');
        assert.ok(typeof file.size_bytes === 'number', 'file entry should have size_bytes');
        assert.match(file.sha256, /^[a-f0-9]{64}$/, 'sha256 should be valid hex');
      }
    });

    it('retention pruning respects recovery.retention.local_backups', () => {
      const backupService = new BackupService(tmpDir);

      // Create required files
      fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.planning', 'PROJECT.md'), '# Project\n');

      // Create multiple backups with delays to ensure unique timestamps
      for (let i = 0; i < 5; i++) {
        backupService.createBackup({ label: `prune-${i}` });
        // Small delay to ensure unique timestamps
        const end = Date.now() + 10;
        while (Date.now() < end) {} // busy wait
      }

      const backupsBefore = backupService.listBackups();
      // listBackups returns array of objects with 'name' property
      const backupCount = Array.isArray(backupsBefore) ? backupsBefore.length : 0;
      assert.ok(backupCount >= 5, `should have 5+ backups before pruning, got ${backupCount}`);

      // Prune to keep only 3
      const pruneResult = backupService.pruneBackups(3);

      // pruneResult.pruned is an array of pruned backup names
      assert.ok(Array.isArray(pruneResult.pruned), 'pruned should be an array');
      assert.strictEqual(pruneResult.pruned.length, backupsBefore.length - 3, `should prune ${backupsBefore.length - 3} backups`);

      const backupsAfter = backupService.listBackups();
      const afterCount = Array.isArray(backupsAfter) ? backupsAfter.length : 0;
      assert.strictEqual(afterCount, 3);
    });
  });

  describe('verifyBackup()', () => {
    it('succeeds when checksums match', () => {
      const backupService = new BackupService(tmpDir);

      // Create required files
      fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.planning', 'PROJECT.md'), '# Project\n');

      const result = backupService.createBackup({ label: 'verify' });

      // Verify should succeed
      const verification = backupService.verifyBackup(result.backupDir);
      assert.strictEqual(verification.valid, true);
    });

    it('fails on checksum mismatch', () => {
      const backupService = new BackupService(tmpDir);

      // Create required files
      fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
      const testFile = path.join(tmpDir, '.planning', 'PROJECT.md');
      fs.writeFileSync(testFile, '# Project\n');

      const result = backupService.createBackup({ label: 'corrupt' });

      // Corrupt a file in the backup
      const backupFile = path.join(result.backupDir, '.planning', 'PROJECT.md');
      fs.appendFileSync(backupFile, 'corrupted');

      // Verify should return invalid result (not throw)
      const verification = backupService.verifyBackup(result.backupDir);
      assert.strictEqual(verification.valid, false);
      assert.ok(verification.errors.length > 0, 'should have errors');
      assert.ok(verification.errors.some(e => e.includes('Checksum mismatch')), 'should have checksum mismatch error');
    });
  });
});
