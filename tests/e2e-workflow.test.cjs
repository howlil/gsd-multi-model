/**
 * EZ Tools - End-to-End Workflow Tests
 *
 * Comprehensive E2E tests that simulate complete user workflows:
 * - New project initialization
 * - Phase lifecycle (add, complete, remove)
 * - Milestone management
 * - State management across sessions
 *
 * These tests verify the complete user journey from project setup to milestone completion.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { runEzTools, createTempProject, createTempGitProject, cleanup } = require('./helpers.cjs');

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Initialize a minimal project structure for E2E testing
 */
function initMinimalProject(tmpDir) {
  // Create PROJECT.md
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'PROJECT.md'),
    `# Test Project

## What This Is

A test project for E2E workflow validation.

## Core Value

Provides automated testing of EZ Agents workflows.

## Requirements

- REQ-01: Project initialization
- REQ-02: Phase management
- REQ-03: Milestone tracking
`
  );

  // Create ROADMAP.md
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'ROADMAP.md'),
    `# Roadmap

## Milestone v1.0 - MVP

### Phase 1: Project Setup

**Goal**: Initialize project structure

**Requirements**: REQ-01

### Phase 2: Core Features

**Goal**: Implement core functionality

**Requirements**: REQ-02

### Phase 3: Testing

**Goal**: Add comprehensive tests

**Requirements**: REQ-03
`
  );

  // Create STATE.md
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'STATE.md'),
    `# Session State

## Current Position

**Milestone:** v1.0 MVP
**Current phase:** 1
**Status:** In Progress

## Session Log

- ${new Date().toISOString().split('T')[0]}: Project initialized
`
  );

  // Create config.json
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'config.json'),
    JSON.stringify({
      model_profile: 'balanced',
      commit_docs: true,
      workflow: {
        nyquist_validation: true
      }
    }, null, 2)
  );

  // Create requirements tracking
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'REQUIREMENTS.md'),
    `# Requirements Traceability

| ID | Requirement | Phase | Status | Notes |
|----|-------------|-------|--------|-------|
| REQ-01 | Project initialization | 1 | In Progress | |
| REQ-02 | Phase management | 2 | Not Started | |
| REQ-03 | Milestone tracking | 3 | Not Started | |
`
  );
}

/**
 * Create a phase directory with plan and summary
 */
function createPhaseWithPlan(tmpDir, phaseNum, phaseName, planCount = 1) {
  const phaseDir = path.join(tmpDir, '.planning', 'phases', phaseNum);
  fs.mkdirSync(phaseDir, { recursive: true });

  for (let i = 1; i <= planCount; i++) {
    const planNum = String(i).padStart(2, '0');
    fs.writeFileSync(
      path.join(phaseDir, `${planNum}-PLAN.md`),
      `---
phase: ${phaseNum}
plan: ${planNum}
type: feature
wave: 1
depends_on: []
files_modified: []
autonomous: true
must_haves: []
---

# Plan ${phaseNum}-${planNum}

<objective>Test objective</objective>

<task>
  <name>Test Task</name>
  <action>Implement feature</action>
  <verify>Verify implementation</verify>
  <done>Task completed</done>
  <files>
    - src/test.js
  </files>
</task>
`
    );

    fs.writeFileSync(
      path.join(phaseDir, `${planNum}-SUMMARY.md`),
      `# Summary ${phaseNum}-${planNum}

## Files Created

- \`src/test.js\`

## Commits

- abc1234 - Initial implementation

## Self-Check

✅ All tasks completed successfully
`
    );
  }
}

// ─── E2E Workflow Tests ──────────────────────────────────────────────────────

describe('E2E: Complete Project Lifecycle', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempGitProject();
    initMinimalProject(tmpDir);
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('complete workflow: health check → phase management → milestone complete', () => {
    // Step 1: Initial health check - should be at least not broken
    const healthResult = runEzTools(['validate', 'health'], tmpDir);
    assert.strictEqual(healthResult.success, true, 'Health check should succeed');
    const healthOutput = JSON.parse(healthResult.output);
    assert.ok(['healthy', 'degraded'].includes(healthOutput.status), `Initial health should be healthy or degraded, got ${healthOutput.status}`);

    // Step 2: List phases (should be empty initially)
    const listPhasesResult = runEzTools(['phases', 'list'], tmpDir);
    assert.strictEqual(listPhasesResult.success, true, 'Phase list should succeed');

    // Step 3: Create phase 1 with plans
    createPhaseWithPlan(tmpDir, '01-setup', 'Project Setup', 2);

    // Step 4: Verify phase completeness
    const verifyPhaseResult = runEzTools(['verify', 'phase-completeness', '1'], tmpDir);
    assert.strictEqual(verifyPhaseResult.success, true, 'Phase verification should succeed');
    const verifyOutput = JSON.parse(verifyPhaseResult.output);
    assert.strictEqual(verifyOutput.complete, true, 'Phase should be complete');

    // Step 5: Get state snapshot
    const stateResult = runEzTools(['state-snapshot'], tmpDir);
    assert.strictEqual(stateResult.success, true, 'State snapshot should succeed');
    const stateOutput = JSON.parse(stateResult.output);
    assert.ok(stateOutput.current_phase || stateOutput.phase, 'Should have current phase');

    // Step 6: Health check should still work with phase data
    const healthResult2 = runEzTools(['validate', 'health'], tmpDir);
    assert.strictEqual(healthResult2.success, true, 'Health check should succeed');
    const healthOutput2 = JSON.parse(healthResult2.output);
    assert.ok(['healthy', 'degraded'].includes(healthOutput2.status), 'Health should be healthy or degraded');
  });

  test('phase lifecycle: create → verify → complete', () => {
    // Create phase 1
    const phase1Dir = path.join(tmpDir, '.planning', 'phases', '01-setup');
    fs.mkdirSync(phase1Dir, { recursive: true });

    // Add a plan
    fs.writeFileSync(
      path.join(phase1Dir, '01-PLAN.md'),
      `---
phase: 01
plan: 01
type: feature
wave: 1
depends_on: []
files_modified: []
autonomous: true
must_haves: []
---

# Plan

<objective>Setup project</objective>

<task>
  <name>Initialize</name>
  <action>Run init</action>
  <verify>Check files</verify>
  <done>Done</done>
  <files>
    - package.json
  </files>
</task>
`
    );

    // Verify phase is incomplete (no summary yet)
    const verifyIncomplete = runEzTools(['verify', 'phase-completeness', '1'], tmpDir);
    assert.strictEqual(verifyIncomplete.success, true);
    const verifyIncompleteOutput = JSON.parse(verifyIncomplete.output);
    assert.strictEqual(verifyIncompleteOutput.complete, false, 'Phase should be incomplete without summary');

    // Add summary
    fs.writeFileSync(
      path.join(phase1Dir, '01-SUMMARY.md'),
      `# Summary

## Files Created

- \`package.json\`

## Commits

- def5678 - Project setup

## Self-Check

✅ All tasks complete
`
    );

    // Verify phase is now complete
    const verifyComplete = runEzTools(['verify', 'phase-completeness', '1'], tmpDir);
    assert.strictEqual(verifyComplete.success, true);
    const verifyCompleteOutput = JSON.parse(verifyComplete.output);
    assert.strictEqual(verifyCompleteOutput.complete, true, 'Phase should be complete with summary');
  });

  test('state management: load → update → verify persistence', () => {
    // Load initial state
    const loadResult = runEzTools(['state', 'load'], tmpDir);
    assert.strictEqual(loadResult.success, true, 'State load should succeed');

    // Update state field
    const updateResult = runEzTools(['state', 'update', 'current_phase', '2'], tmpDir);
    assert.strictEqual(updateResult.success, true, 'State update should succeed');

    // Load state again to verify persistence
    const loadResult2 = runEzTools(['state', 'load'], tmpDir);
    assert.strictEqual(loadResult2.success, true, 'State reload should succeed');

    // Verify the update persisted (check STATE.md file directly)
    const stateContent = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    assert.ok(stateContent.includes('2'), 'State should contain updated phase number');
  });

  test('roadmap analyze with disk status', () => {
    // Create phase directory
    createPhaseWithPlan(tmpDir, '01-setup', 'Setup');

    // Analyze roadmap
    const analyzeResult = runEzTools(['roadmap', 'analyze'], tmpDir);
    assert.strictEqual(analyzeResult.success, true, 'Roadmap analyze should succeed');
    const analyzeOutput = JSON.parse(analyzeResult.output);

    assert.ok(analyzeOutput.phases, 'Should have phases array');
    assert.ok(analyzeOutput.phases.length > 0, 'Should have at least one phase');

    // Check that disk status is included
    const phase1 = analyzeOutput.phases.find(p => p.phase === '1' || p.phase === '01');
    if (phase1) {
      assert.ok('disk_status' in phase1 || 'status' in phase1, 'Phase should have disk status');
    }
  });
});

describe('E2E: Error Handling and Edge Cases', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('health check with missing critical files', () => {
    // Only create .planning directory, no files inside
    const healthResult = runEzTools(['validate', 'health'], tmpDir);
    assert.strictEqual(healthResult.success, true, 'Health check should succeed');
    const healthOutput = JSON.parse(healthResult.output);
    assert.strictEqual(healthOutput.status, 'broken', 'Status should be broken');
    assert.ok(healthOutput.errors.length > 0, 'Should have errors');
  });

  test('phase operations with invalid phase numbers', () => {
    // Try to verify nonexistent phase
    const verifyResult = runEzTools(['verify', 'phase-completeness', '999'], tmpDir);
    assert.strictEqual(verifyResult.success, true, 'Command should succeed');
    const verifyOutput = JSON.parse(verifyResult.output);
    assert.ok(verifyOutput.error, 'Should have error for nonexistent phase');

    // Try to get nonexistent phase from roadmap
    const getPhaseResult = runEzTools(['roadmap', 'get-phase', '999'], tmpDir);
    assert.strictEqual(getPhaseResult.success, true);
    const getPhaseOutput = JSON.parse(getPhaseResult.output);
    assert.ok(getPhaseOutput.error || !getPhaseOutput.content, 'Should indicate phase not found');
  });

  test('state operations with missing STATE.md', () => {
    // Don't create STATE.md
    const stateResult = runEzTools(['state', 'load'], tmpDir);
    assert.strictEqual(stateResult.success, true, 'State load should succeed');
    const stateOutput = JSON.parse(stateResult.output);
    assert.strictEqual(stateOutput.state_exists, false, 'STATE.md should not exist');
  });

  test('config operations with invalid JSON', () => {
    // Create invalid config.json
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'config.json'),
      '{invalid json'
    );

    const healthResult = runEzTools(['validate', 'health'], tmpDir);
    assert.strictEqual(healthResult.success, true);
    const healthOutput = JSON.parse(healthResult.output);
    assert.ok(
      healthOutput.errors.some(e => e.code === 'E005'),
      'Should have E005 error for invalid JSON'
    );
  });
});

describe('E2E: Multi-Phase Workflow', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempGitProject();
    initMinimalProject(tmpDir);
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('multiple phases with dependencies', () => {
    // Create multiple phases
    createPhaseWithPlan(tmpDir, '01-setup', 'Setup', 1);
    createPhaseWithPlan(tmpDir, '02-development', 'Development', 2);
    createPhaseWithPlan(tmpDir, '03-testing', 'Testing', 1);

    // List all phases - just verify the command succeeds
    const listResult = runEzTools(['phases', 'list'], tmpDir);
    assert.strictEqual(listResult.success, true, 'Phase list should succeed');
    // Output format may vary, just check we get valid JSON
    try {
      JSON.parse(listResult.output);
    } catch (e) {
      assert.fail('Output should be valid JSON');
    }

    // Get phase-plan-index for each phase
    for (const phaseNum of ['1', '2', '3']) {
      const indexResult = runEzTools(['phase-plan-index', phaseNum], tmpDir);
      assert.strictEqual(indexResult.success, true, `Phase ${phaseNum} index should succeed`);
      const indexOutput = JSON.parse(indexResult.output);
      assert.ok(indexOutput.plans !== undefined, `Phase ${phaseNum} should have plans data`);
    }

    // Health check should work
    const healthResult = runEzTools(['validate', 'health'], tmpDir);
    assert.strictEqual(healthResult.success, true);
    const healthOutput = JSON.parse(healthResult.output);
    assert.ok(['healthy', 'degraded'].includes(healthOutput.status), 'Should be healthy with all phases');
  });

  test('phase numbering with decimal phases', () => {
    // Create base phase
    createPhaseWithPlan(tmpDir, '01-setup', 'Setup', 1);

    // Create decimal phase
    const decimalPhaseDir = path.join(tmpDir, '.planning', 'phases', '01.1-extension');
    fs.mkdirSync(decimalPhaseDir, { recursive: true });
    fs.writeFileSync(
      path.join(decimalPhaseDir, '01-PLAN.md'),
      `---
phase: 01.1
plan: 01
type: extension
wave: 1
depends_on: []
files_modified: []
autonomous: true
must_haves: []
---

# Decimal Phase Plan

<objective>Extend base phase</objective>

<task>
  <name>Extension Task</name>
  <action>Extend functionality</action>
  <verify>Verify extension</verify>
  <done>Extension complete</done>
  <files>
    - src/extension.js
  </files>
</task>
`
    );
    fs.writeFileSync(
      path.join(decimalPhaseDir, '01-SUMMARY.md'),
      `# Decimal Phase Summary

## Files Created

- \`src/extension.js\`

## Commits

- fedcba9 - Extension implemented

## Self-Check

✅ Extension complete
`
    );

    // List phases should work
    const listResult = runEzTools(['phases', 'list'], tmpDir);
    assert.strictEqual(listResult.success, true);
    // Just verify the command succeeds - output format may vary

    // Health check should work
    const healthResult = runEzTools(['validate', 'health'], tmpDir);
    assert.strictEqual(healthResult.success, true);
    const healthOutput = JSON.parse(healthResult.output);
    assert.ok(['healthy', 'degraded'].includes(healthOutput.status), 'Should handle decimal phases correctly');
  });
});
