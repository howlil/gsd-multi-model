/**
 * Phase 22: Core Module Tests
 * 
 * Tests for CORE-TEST-01 to CORE-TEST-06:
 * - CORE-TEST-01: Core utilities initialization
 * - CORE-TEST-02: Phase name normalization
 * - CORE-TEST-03: Phase search and discovery
 * - CORE-TEST-04: Config loading and management
 * - CORE-TEST-05: Git utilities and operations
 * - CORE-TEST-06: Model resolution and profiles
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createTempProject, createTempGitProject, cleanup } from '../helpers.js';

import {
  MODEL_PROFILES,
  normalizePhaseName,
  comparePhaseNum,
  loadConfig,
  escapeRegex,
  generateSlugInternal,
  getMilestoneInfo,
  getMilestonePhaseFilter,
  findPhaseInternal,
  getArchivedPhaseDirs,
  getRoadmapPhaseInternal,
  resolveModelInternal,
  pathExistsInternal,
  toPosixPath
} from '../../bin/lib/core.js';

describe('Phase 22: Core Module Tests', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  /**
   * CORE-TEST-01: Core Utilities Initialization
   * Verify core module exports and constants
   */
  describe('CORE-TEST-01: Core Utilities Initialization', () => {
    it('should export MODEL_PROFILES constant', () => {
      expect(MODEL_PROFILES).toBeDefined();
      expect(typeof MODEL_PROFILES).toBe('object');
    });

    it('should have model profiles for all agent types', () => {
      const expectedAgents = [
        'ez-planner',
        'ez-executor',
        'ez-roadmapper',
        'ez-phase-researcher',
        'ez-project-researcher',
        'ez-debugger',
        'ez-codebase-mapper',
        'ez-verifier',
        'ez-plan-checker',
        'ez-ui-auditor'
      ];

      for (const agent of expectedAgents) {
        expect(MODEL_PROFILES[agent]).toBeDefined();
        expect(MODEL_PROFILES[agent].quality).toBeDefined();
        expect(MODEL_PROFILES[agent].balanced).toBeDefined();
        expect(MODEL_PROFILES[agent].budget).toBeDefined();
      }
    });

    it('should export all utility functions', () => {
      expect(normalizePhaseName).toBeDefined();
      expect(comparePhaseNum).toBeDefined();
      expect(loadConfig).toBeDefined();
      expect(escapeRegex).toBeDefined();
      expect(generateSlugInternal).toBeDefined();
      expect(getMilestoneInfo).toBeDefined();
      expect(findPhaseInternal).toBeDefined();
      expect(getRoadmapPhaseInternal).toBeDefined();
      expect(resolveModelInternal).toBeDefined();
      expect(pathExistsInternal).toBeDefined();
      expect(toPosixPath).toBeDefined();
    });

    it('should have correct model profile structure', () => {
      const profile = MODEL_PROFILES['ez-planner'];
      expect(profile.quality).toBe('opus');
      expect(profile.balanced).toBe('opus');
      expect(profile.budget).toBe('sonnet');
    });
  });

  /**
   * CORE-TEST-02: Phase Name Normalization
   * Verify phase name normalization and comparison
   */
  describe('CORE-TEST-02: Phase Name Normalization', () => {
    it('should normalize single-digit phase numbers', () => {
      expect(normalizePhaseName('1')).toBe('01');
      expect(normalizePhaseName('5')).toBe('05');
      expect(normalizePhaseName('9')).toBe('09');
    });

    it('should keep double-digit phase numbers unchanged', () => {
      expect(normalizePhaseName('10')).toBe('10');
      expect(normalizePhaseName('25')).toBe('25');
      expect(normalizePhaseName('99')).toBe('99');
    });

    it('should handle phase numbers with letters', () => {
      expect(normalizePhaseName('12A')).toBe('12A');
      expect(normalizePhaseName('12b')).toBe('12B');
      expect(normalizePhaseName('1a')).toBe('01A');
    });

    it('should handle phase numbers with decimals', () => {
      expect(normalizePhaseName('1.1')).toBe('01.1');
      expect(normalizePhaseName('10.2.3')).toBe('10.2.3');
    });

    it('should handle phase numbers with letters and decimals', () => {
      expect(normalizePhaseName('12A.1')).toBe('12A.1');
      expect(normalizePhaseName('5b.2')).toBe('05B.2');
    });

    it('should return unchanged for non-matching input', () => {
      expect(normalizePhaseName('phase-1')).toBe('phase-1');
      expect(normalizePhaseName('test')).toBe('test');
    });
  });

  /**
   * CORE-TEST-03: Phase Search and Discovery
   * Verify phase search functionality
   */
  describe('CORE-TEST-03: Phase Search and Discovery', () => {
    it('should return null for empty phase', () => {
      const result = findPhaseInternal(tmpDir, '');
      expect(result).toBeNull();
    });

    it('should return null when phases directory does not exist', () => {
      const emptyDir = path.join(tmpDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });
      
      const result = findPhaseInternal(emptyDir, '1');
      expect(result).toBeNull();
    });

    it('should find phase directory by number', () => {
      // Create phase directory
      const phaseDir = path.join(tmpDir, '.planning', 'phases', '20-test-phase');
      fs.mkdirSync(phaseDir, { recursive: true });
      fs.writeFileSync(path.join(phaseDir, 'PLAN.md'), '# Plan');

      const result = findPhaseInternal(tmpDir, '20');
      expect(result).not.toBeNull();
      expect(result?.found).toBe(true);
      expect(result?.phase_number).toBe('20');
    });

    it('should find phase directory with normalized number', () => {
      const phaseDir = path.join(tmpDir, '.planning', 'phases', '05-context');
      fs.mkdirSync(phaseDir, { recursive: true });

      const result = findPhaseInternal(tmpDir, '5');
      expect(result).not.toBeNull();
      expect(result?.phase_number).toBe('05');
    });

    it('should detect incomplete plans', () => {
      const phaseDir = path.join(tmpDir, '.planning', 'phases', '21-testing');
      fs.mkdirSync(phaseDir, { recursive: true });
      // File naming pattern: {id}-PLAN.md and {id}-SUMMARY.md
      fs.writeFileSync(path.join(phaseDir, '1-PLAN.md'), '# Plan 1');
      fs.writeFileSync(path.join(phaseDir, '2-PLAN.md'), '# Plan 2');
      fs.writeFileSync(path.join(phaseDir, '1-SUMMARY.md'), '# Summary 1');

      const result = findPhaseInternal(tmpDir, '21');
      expect(result).not.toBeNull();
      expect(result?.incomplete_plans).toContain('2-PLAN.md');
    });

    it('should detect research, context, and verification files', () => {
      const phaseDir = path.join(tmpDir, '.planning', 'phases', '22-research');
      fs.mkdirSync(phaseDir, { recursive: true });
      fs.writeFileSync(path.join(phaseDir, 'RESEARCH.md'), '# Research');
      fs.writeFileSync(path.join(phaseDir, 'CONTEXT.md'), '# Context');
      fs.writeFileSync(path.join(phaseDir, 'VERIFICATION.md'), '# Verification');

      const result = findPhaseInternal(tmpDir, '22');
      expect(result?.has_research).toBe(true);
      expect(result?.has_context).toBe(true);
      expect(result?.has_verification).toBe(true);
    });

    it('should generate phase slug from name', () => {
      const phaseDir = path.join(tmpDir, '.planning', 'phases', '23-context-slicing');
      fs.mkdirSync(phaseDir, { recursive: true });

      const result = findPhaseInternal(tmpDir, '23');
      expect(result?.phase_slug).toBe('context-slicing');
    });
  });

  /**
   * CORE-TEST-04: Config Loading and Management
   * Verify configuration loading and management
   */
  describe('CORE-TEST-04: Config Loading', () => {
    it('should return defaults when config does not exist', () => {
      const config = loadConfig(tmpDir);
      
      expect(config.model_profile).toBe('balanced');
      expect(config.commit_docs).toBe(true);
      expect(config.search_gitignored).toBe(false);
      expect(config.parallelization).toBe(true);
    });

    it('should load config from .planning/config.json', () => {
      const configPath = path.join(tmpDir, '.planning', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        model_profile: 'quality',
        commit_docs: false,
        research: false
      }));

      const config = loadConfig(tmpDir);
      expect(config.model_profile).toBe('quality');
      expect(config.commit_docs).toBe(false);
      expect(config.research).toBe(false);
    });

    it('should migrate deprecated depth key to granularity', () => {
      const configPath = path.join(tmpDir, '.planning', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        depth: 'quick'
      }));

      const config = loadConfig(tmpDir);
      
      // Should have migrated
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(updatedConfig.granularity).toBe('coarse');
      expect(updatedConfig.depth).toBeUndefined();
    });

    it('should handle parallelization as nested object', () => {
      const configPath = path.join(tmpDir, '.planning', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        parallelization: { enabled: true }
      }));

      const config = loadConfig(tmpDir);
      expect(config.parallelization).toBe(true);
    });

    it('should handle model_overrides', () => {
      const configPath = path.join(tmpDir, '.planning', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        model_overrides: {
          'ez-planner': 'opus',
          'ez-executor': 'sonnet'
        }
      }));

      const config = loadConfig(tmpDir);
      expect(config.model_overrides).toBeDefined();
      expect(config.model_overrides?.['ez-planner']).toBe('opus');
    });
  });

  /**
   * CORE-TEST-05: Git Utilities and Operations
   * Verify git-related utilities
   */
  describe('CORE-TEST-05: Git Utilities', () => {
    it('should escape regex special characters', () => {
      expect(escapeRegex('test')).toBe('test');
      expect(escapeRegex('test.*')).toBe('test\\.\\*');
      expect(escapeRegex('test[abc]')).toBe('test\\[abc\\]');
      expect(escapeRegex('test(a|b)')).toBe('test\\(a\\|b\\)');
    });

    it('should generate slug from text', () => {
      expect(generateSlugInternal('Test Phase Name')).toBe('test-phase-name');
      expect(generateSlugInternal('Phase 20: Testing')).toBe('phase-20-testing');
      expect(generateSlugInternal('Special!@#Characters')).toBe('special-characters');
    });

    it('should return null for empty slug input', () => {
      expect(generateSlugInternal('')).toBeNull();
    });

    it('should convert Windows paths to POSIX format', () => {
      expect(toPosixPath('C:\\Users\\test')).toBe('C:/Users/test');
      expect(toPosixPath('path\\to\\file')).toBe('path/to/file');
      expect(toPosixPath('path/to/file')).toBe('path/to/file'); // Already POSIX
    });

    it('should check if path exists', () => {
      const testFile = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(testFile, 'test');

      expect(pathExistsInternal(tmpDir, 'test.txt')).toBe(true);
      expect(pathExistsInternal(tmpDir, 'nonexistent.txt')).toBe(false);
    });

    it('should handle absolute paths in pathExistsInternal', () => {
      const testFile = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(testFile, 'test');

      expect(pathExistsInternal(tmpDir, testFile)).toBe(true);
    });
  });

  /**
   * CORE-TEST-06: Model Resolution and Profiles
   * Verify model resolution logic
   */
  describe('CORE-TEST-06: Model Resolution', () => {
    it('should resolve model based on profile', () => {
      const configPath = path.join(tmpDir, '.planning', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        model_profile: 'quality'
      }));

      expect(resolveModelInternal(tmpDir, 'ez-planner')).toBe('inherit'); // opus -> inherit
      expect(resolveModelInternal(tmpDir, 'ez-codebase-mapper')).toBe('sonnet');
    });

    it('should use balanced profile by default', () => {
      const configPath = path.join(tmpDir, '.planning', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({}));

      expect(resolveModelInternal(tmpDir, 'ez-planner')).toBe('inherit'); // opus in balanced
      expect(resolveModelInternal(tmpDir, 'ez-codebase-mapper')).toBe('haiku');
    });

    it('should use agent-specific override', () => {
      const configPath = path.join(tmpDir, '.planning', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        model_overrides: {
          'ez-planner': 'sonnet'
        }
      }));

      expect(resolveModelInternal(tmpDir, 'ez-planner')).toBe('sonnet');
    });

    it('should return sonnet for unknown agent types', () => {
      expect(resolveModelInternal(tmpDir, 'unknown-agent')).toBe('sonnet');
    });

    it('should get milestone info from ROADMAP.md', () => {
      const roadmapPath = path.join(tmpDir, '.planning', 'ROADMAP.md');
      fs.mkdirSync(path.dirname(roadmapPath), { recursive: true });
      fs.writeFileSync(roadmapPath, '# Roadmap\n\n## v5.0: Test Quality\n\n- Phase 20\n- Phase 21');

      const milestone = getMilestoneInfo(tmpDir);
      expect(milestone.version).toBe('v5.0');
    });

    it('should return default milestone when ROADMAP.md does not exist', () => {
      const milestone = getMilestoneInfo(tmpDir);
      expect(milestone.version).toBe('v1.0');
      expect(milestone.name).toBe('milestone');
    });

    it('should get milestone phase filter', () => {
      const roadmapPath = path.join(tmpDir, '.planning', 'ROADMAP.md');
      fs.writeFileSync(roadmapPath, '### Phase 20: FinOps\n### Phase 21: Context\n### Phase 25: Performance');

      const filter = getMilestonePhaseFilter(tmpDir);
      
      expect(filter.phaseCount).toBe(3);
      expect(filter('20-finops')).toBe(true);
      expect(filter('21-context')).toBe(true);
      expect(filter('99-unknown')).toBe(false);
    });

    it('should get roadmap phase info', () => {
      const roadmapPath = path.join(tmpDir, '.planning', 'ROADMAP.md');
      fs.writeFileSync(roadmapPath, `
### Phase 20: FinOps Tests
**Goal:** Implement FinOps tests

- FINOPS-01 to FINOPS-07

### Phase 21: Context Tests
**Goal:** Context module tests
`);

      const phase = getRoadmapPhaseInternal(tmpDir, '20');
      expect(phase).not.toBeNull();
      expect(phase?.phase_number).toBe('20');
      expect(phase?.phase_name).toBe('FinOps Tests');
      expect(phase?.goal).toBe('Implement FinOps tests');
    });

    it('should return null for non-existent phase in roadmap', () => {
      const roadmapPath = path.join(tmpDir, '.planning', 'ROADMAP.md');
      fs.writeFileSync(roadmapPath, '### Phase 20: FinOps');

      const phase = getRoadmapPhaseInternal(tmpDir, '99');
      expect(phase).toBeNull();
    });

    it('should get archived phase directories', () => {
      // Create milestone archive structure
      const archiveDir = path.join(tmpDir, '.planning', 'milestones', 'v4.0-phases', '15-archived');
      fs.mkdirSync(archiveDir, { recursive: true });

      const archived = getArchivedPhaseDirs(tmpDir);
      expect(archived.length).toBeGreaterThan(0);
      expect(archived[0].milestone).toBe('v4.0');
      expect(archived[0].name).toBe('15-archived');
    });
  });

  /**
   * Additional Core Utility Tests
   */
  describe('Additional Core Utilities', () => {
    it('should compare phase numbers correctly', () => {
      expect(comparePhaseNum('1', '2')).toBeLessThan(0);
      expect(comparePhaseNum('2', '1')).toBeGreaterThan(0);
      expect(comparePhaseNum('1', '1')).toBe(0);
    });

    it('should compare phase numbers with letters', () => {
      expect(comparePhaseNum('12', '12A')).toBeLessThan(0);
      expect(comparePhaseNum('12A', '12B')).toBeLessThan(0);
      expect(comparePhaseNum('12A', '12A')).toBe(0);
    });

    it('should compare phase numbers with decimals', () => {
      expect(comparePhaseNum('1.1', '1.2')).toBeLessThan(0);
      expect(comparePhaseNum('1.10', '1.2')).toBeGreaterThan(0); // 10 > 2
      expect(comparePhaseNum('1.1', '1.1')).toBe(0);
    });

    it('should sort phase directories correctly', () => {
      const phases = ['10-phase', '2-phase', '1-phase', '2A-phase', '1.1-phase'];
      const sorted = phases.sort(comparePhaseNum);
      
      expect(sorted[0]).toBe('1-phase');
      expect(sorted[1]).toBe('1.1-phase');
      expect(sorted[2]).toBe('2-phase');
      expect(sorted[3]).toBe('2A-phase');
      expect(sorted[4]).toBe('10-phase');
    });
  });
});
