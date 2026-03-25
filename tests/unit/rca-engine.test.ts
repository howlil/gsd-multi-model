#!/usr/bin/env node

/**
 * Tests for RCAEngine
 *
 * Coverage:
 * - REV-02: Root cause analysis performed after 2nd failure
 */

import assert from 'node:assert';
import RCAEngine from '../../bin/lib/rca-engine.js';
const { ErrorCategory, FIX_STRATEGIES } = RCAEngine;

let passed = 0;
let failed = 0;

async function runTests() {
  console.log('\n=== RCAEngine Tests ===\n');

  // Constructor tests
  console.log('constructor:');
  const rca1 = new RCAEngine();
  assert.strictEqual(rca1.triggerThreshold, 2);
  console.log('âœ“ should create instance with default options');
  passed++;

  const rca2 = new RCAEngine({ triggerThreshold: 3 });
  assert.strictEqual(rca2.triggerThreshold, 3);
  console.log('âœ“ should create instance with custom trigger threshold');
  passed++;

  // ErrorCategory enum tests
  console.log('\nErrorCategory enum:');
  assert.strictEqual(ErrorCategory.DEPENDENCY, 'Dependency');
  assert.strictEqual(ErrorCategory.SYNTAX, 'Syntax');
  assert.strictEqual(ErrorCategory.LOGIC, 'Logic');
  assert.strictEqual(ErrorCategory.RESOURCE, 'Resource');
  assert.strictEqual(ErrorCategory.TIMEOUT, 'Timeout');
  assert.strictEqual(ErrorCategory.UNKNOWN, 'Unknown');
  console.log('âœ“ should have all 5 standard categories');
  passed++;

  // FIX_STRATEGIES tests
  console.log('\nFIX_STRATEGIES:');
  assert.ok(FIX_STRATEGIES[ErrorCategory.DEPENDENCY]);
  assert.ok(FIX_STRATEGIES[ErrorCategory.SYNTAX]);
  assert.ok(FIX_STRATEGIES[ErrorCategory.LOGIC]);
  assert.ok(FIX_STRATEGIES[ErrorCategory.RESOURCE]);
  assert.ok(FIX_STRATEGIES[ErrorCategory.TIMEOUT]);
  console.log('âœ“ should have strategies for all categories');
  passed++;

  assert.ok(FIX_STRATEGIES[ErrorCategory.DEPENDENCY].length > 0);
  assert.ok(FIX_STRATEGIES[ErrorCategory.SYNTAX].length > 0);
  console.log('âœ“ should have multiple strategies per category');
  passed++;

  // analyze tests
  console.log('\nanalyze:');
  const rca3 = new RCAEngine();
  const analysis1 = await rca3.analyze(
    new Error('Cannot find module \'lodash\''),
    { taskId: 'task-01', taskType: 'build', recentChanges: ['package.json'], failureCount: 2 }
  );
  assert.strictEqual(analysis1.category, ErrorCategory.DEPENDENCY);
  assert.strictEqual(analysis1.taskId, 'task-01');
  console.log('âœ“ should classify Dependency errors correctly');
  passed++;

  const rca4 = new RCAEngine();
  const analysis2 = await rca4.analyze(
    new Error('SyntaxError: Unexpected token }'),
    { taskId: 'task-02', taskType: 'lint', recentChanges: ['src/index.js'], failureCount: 2 }
  );
  assert.strictEqual(analysis2.category, ErrorCategory.SYNTAX);
  console.log('âœ“ should classify Syntax errors correctly');
  passed++;

  const rca5 = new RCAEngine();
  const analysis3 = await rca5.analyze(
    new Error('Assertion failed: expected 5, received 3'),
    { taskId: 'task-03', taskType: 'test', recentChanges: ['src/calculator.js'], failureCount: 2 }
  );
  assert.strictEqual(analysis3.category, ErrorCategory.LOGIC);
  console.log('âœ“ should classify Logic errors correctly');
  passed++;

  const rca6 = new RCAEngine();
  const analysis4 = await rca6.analyze(
    new Error('Error: ENOSPC: no space left on device'),
    { taskId: 'task-04', taskType: 'build', recentChanges: [], failureCount: 2 }
  );
  assert.strictEqual(analysis4.category, ErrorCategory.RESOURCE);
  console.log('âœ“ should classify Resource errors correctly');
  passed++;

  const rca7 = new RCAEngine();
  const analysis5 = await rca7.analyze(
    new Error('Error: Request timeout after 30000ms'),
    { taskId: 'task-05', taskType: 'api', recentChanges: ['src/api.js'], failureCount: 2 }
  );
  assert.strictEqual(analysis5.category, ErrorCategory.TIMEOUT);
  console.log('âœ“ should classify Timeout errors correctly');
  passed++;

  const rca8 = new RCAEngine();
  const analysis6 = await rca8.analyze(
    new Error('Some unknown error occurred'),
    { taskId: 'task-06', taskType: 'unknown', recentChanges: [], failureCount: 2 }
  );
  assert.strictEqual(analysis6.category, ErrorCategory.UNKNOWN);
  console.log('âœ“ should classify unknown errors correctly');
  passed++;

  const rca9 = new RCAEngine();
  const analysis7 = await rca9.analyze(
    new Error('Cannot find module \'express\''),
    { taskId: 'task-07', taskType: 'build', recentChanges: [], failureCount: 2 }
  );
  assert.ok(analysis7.recommended_actions);
  assert.ok(analysis7.recommended_actions.length > 0);
  console.log('âœ“ should include recommended actions');
  passed++;

  const rca10 = new RCAEngine();
  const analysis8 = await rca10.analyze(
    new Error('SyntaxError: Unexpected token'),
    { taskId: 'task-08', taskType: 'lint', recentChanges: [], failureCount: 2 }
  );
  assert.ok(analysis8.confidence > 0);
  assert.ok(analysis8.confidence <= 1);
  console.log('âœ“ should calculate confidence score');
  passed++;

  const rca11 = new RCAEngine();
  const analysis9 = await rca11.analyze(
    new Error('Cannot find module'),
    {
      taskId: 'task-09',
      taskType: 'build',
      recentChanges: ['package.json', 'src/config.js'],
      dependencyState: { outdated: ['lodash'], missing: ['express'], conflicts: [] },
      failureCount: 2
    }
  );
  assert.ok(analysis9.context_analysis);
  assert.ok(analysis9.context_analysis.dependencyIssues.length > 0);
  console.log('âœ“ should analyze context for risk factors');
  passed++;

  const rca12 = new RCAEngine();
  await rca12.analyze(new Error('Cannot find module'), { taskId: 'task-10', taskType: 'build', recentChanges: [], failureCount: 3 });
  await rca12.analyze(new Error('Module not found: lodash'), { taskId: 'task-10', taskType: 'build', recentChanges: [], failureCount: 3 });
  const analysis10 = await rca12.analyze(new Error('Module not found: express'), { taskId: 'task-10', taskType: 'build', recentChanges: [], failureCount: 3 });
  assert.ok(analysis10.patterns);
  assert.strictEqual(analysis10.patterns.isRecurring, true);
  console.log('âœ“ should detect patterns on multiple failures');
  passed++;

  const rca13 = new RCAEngine();
  await rca13.analyze(new Error('Error 1'), { taskId: 'task-11', taskType: 'build', recentChanges: [], failureCount: 2 });
  await rca13.analyze(new Error('Error 2'), { taskId: 'task-11', taskType: 'build', recentChanges: [], failureCount: 2 });
  const history = rca13.getAnalysisHistory('task-11');
  assert.strictEqual(history.length, 2);
  console.log('âœ“ should store analysis history');
  passed++;

  // suggestFix tests
  console.log('\nsuggestFix:');
  const rca14 = new RCAEngine();
  const fix1 = rca14.suggestFix(ErrorCategory.DEPENDENCY);
  assert.strictEqual(fix1.category, ErrorCategory.DEPENDENCY);
  assert.ok(fix1.primary_fix);
  assert.ok(fix1.all_strategies.length > 0);
  console.log('âœ“ should suggest fix for Dependency category');
  passed++;

  const rca15 = new RCAEngine();
  const fix2 = rca15.suggestFix(ErrorCategory.SYNTAX);
  assert.strictEqual(fix2.category, ErrorCategory.SYNTAX);
  console.log('âœ“ should suggest fix for Syntax category');
  passed++;

  const rca16 = new RCAEngine();
  const fix3 = rca16.suggestFix(ErrorCategory.LOGIC);
  assert.strictEqual(fix3.category, ErrorCategory.LOGIC);
  assert.ok(fix3.primary_fix);
  console.log('âœ“ should suggest fix for Logic category');
  passed++;

  const rca17 = new RCAEngine();
  const fix4 = rca17.suggestFix(ErrorCategory.RESOURCE);
  assert.strictEqual(fix4.category, ErrorCategory.RESOURCE);
  assert.ok(fix4.primary_fix);
  console.log('âœ“ should suggest fix for Resource category');
  passed++;

  const rca18 = new RCAEngine();
  const fix5 = rca18.suggestFix(ErrorCategory.TIMEOUT);
  assert.strictEqual(fix5.category, ErrorCategory.TIMEOUT);
  assert.ok(fix5.primary_fix);
  console.log('âœ“ should suggest fix for Timeout category');
  passed++;

  const rca19 = new RCAEngine();
  const fix6 = rca19.suggestFix(ErrorCategory.SYNTAX);
  assert.ok(fix6.estimated_success_rate > 0);
  assert.ok(fix6.estimated_success_rate <= 1);
  console.log('âœ“ should estimate success rate');
  passed++;

  const rca20 = new RCAEngine();
  const fix7 = rca20.suggestFix('UnknownCategory');
  assert.ok(fix7.primary_fix);
  console.log('âœ“ should handle unknown category');
  passed++;

  // shouldTrigger tests
  console.log('\nshouldTrigger:');
  const rca21 = new RCAEngine();
  assert.strictEqual(rca21.shouldTrigger('task-01', 1), false);
  console.log('âœ“ should return false for first failure');
  passed++;

  const rca22 = new RCAEngine();
  assert.strictEqual(rca22.shouldTrigger('task-02', 2), true);
  console.log('âœ“ should return true for second failure (threshold)');
  passed++;

  const rca23 = new RCAEngine();
  assert.strictEqual(rca23.shouldTrigger('task-03', 5), true);
  console.log('âœ“ should return true for subsequent failures');
  passed++;

  const rca24 = new RCAEngine({ triggerThreshold: 3 });
  assert.strictEqual(rca24.shouldTrigger('task-04', 2), false);
  assert.strictEqual(rca24.shouldTrigger('task-04', 3), true);
  console.log('âœ“ should respect custom trigger threshold');
  passed++;

  // getAnalysisHistory tests
  console.log('\ngetAnalysisHistory:');
  const rca25 = new RCAEngine();
  const h1 = rca25.getAnalysisHistory('unknown-task');
  assert.deepStrictEqual(h1, []);
  console.log('âœ“ should return empty array for unknown task');
  passed++;

  const rca26 = new RCAEngine();
  await rca26.analyze(new Error('Error 1'), { taskId: 'task-05', taskType: 'build', recentChanges: [], failureCount: 2 });
  await rca26.analyze(new Error('Error 2'), { taskId: 'task-05', taskType: 'build', recentChanges: [], failureCount: 2 });
  await rca26.analyze(new Error('Error 3'), { taskId: 'task-05', taskType: 'build', recentChanges: [], failureCount: 2 });
  const h2 = rca26.getAnalysisHistory('task-05');
  assert.strictEqual(h2.length, 3);
  console.log('âœ“ should return all analyses for a task');
  passed++;

  // _classifyError tests
  console.log('\n_classifyError:');
  const rca27 = new RCAEngine();
  const c1 = rca27._classifyError('Cannot find module lodash');
  assert.strictEqual(c1, ErrorCategory.DEPENDENCY);
  console.log('âœ“ should handle string errors');
  passed++;

  const rca28 = new RCAEngine();
  const c2 = rca28._classifyError(new Error('SyntaxError: parse error'));
  assert.strictEqual(c2, ErrorCategory.SYNTAX);
  console.log('âœ“ should handle Error objects');
  passed++;

  const rca29 = new RCAEngine();
  const c3 = rca29._classifyError(null);
  const c4 = rca29._classifyError(undefined);
  assert.strictEqual(c3, ErrorCategory.UNKNOWN);
  assert.strictEqual(c4, ErrorCategory.UNKNOWN);
  console.log('âœ“ should handle null/undefined');
  passed++;

  const rca30 = new RCAEngine();
  const c5 = rca30._classifyError('TIMEOUT exceeded');
  const c6 = rca30._classifyError('syntax ERROR');
  assert.strictEqual(c5, ErrorCategory.TIMEOUT);
  assert.strictEqual(c6, ErrorCategory.SYNTAX);
  console.log('âœ“ should be case insensitive');
  passed++;

  // Integration test
  console.log('\nintegration: RCA workflow:');
  const rca31 = new RCAEngine();
  const taskId = 'integration-task';
  const error = new Error('Cannot find module \'express\'');
  const context = {
    taskId,
    taskType: 'build',
    recentChanges: ['package.json', 'src/index.js'],
    dependencyState: { outdated: [], missing: ['express'], conflicts: [] },
    failureCount: 2
  };

  const analysis11 = await rca31.analyze(error, context);
  assert.strictEqual(analysis11.category, ErrorCategory.DEPENDENCY);
  assert.ok(analysis11.confidence > 0.5);
  assert.ok(analysis11.recommended_actions.length > 0);

  const fix8 = rca31.suggestFix(analysis11.category, context);
  assert.strictEqual(fix8.category, ErrorCategory.DEPENDENCY);
  assert.ok(fix8.primary_fix.includes('Install missing dependency'));
  assert.strictEqual(fix8.estimated_success_rate, 0.85);

  await rca31.analyze(new Error('Module not found: lodash'), { ...context, failureCount: 3 });
  await rca31.analyze(new Error('Module not found: react'), { ...context, failureCount: 4 });
  const h3 = rca31.getAnalysisHistory(taskId);
  assert.strictEqual(h3.length, 3);
  assert.strictEqual(h3[2].patterns.isRecurring, true);
  console.log('âœ“ should support complete RCA workflow with fix suggestion');
  passed++;

  // Pattern detection tests
  console.log('\npattern detection:');
  const rca32 = new RCAEngine();
  await rca32.analyze(new Error('Cannot find module A'), { taskId: 'pattern-task', taskType: 'build', recentChanges: [], failureCount: 3 });
  await rca32.analyze(new Error('Cannot find module B'), { taskId: 'pattern-task', taskType: 'build', recentChanges: [], failureCount: 3 });
  const analysis12 = await rca32.analyze(new Error('Cannot find module C'), { taskId: 'pattern-task', taskType: 'build', recentChanges: [], failureCount: 3 });
  assert.strictEqual(analysis12.patterns.isRecurring, true);
  assert.strictEqual(analysis12.patterns.sameCategoryCount, 2);
  console.log('âœ“ should detect recurring same-category failures');
  passed++;

  const rca33 = new RCAEngine();
  await rca33.analyze(new Error('SyntaxError: parse error'), { taskId: 'escalation-task', taskType: 'build', recentChanges: [], failureCount: 4 });
  await rca33.analyze(new Error('Assertion failed'), { taskId: 'escalation-task', taskType: 'build', recentChanges: [], failureCount: 4 });
  await rca33.analyze(new Error('Request timeout'), { taskId: 'escalation-task', taskType: 'build', recentChanges: [], failureCount: 4 });
  const analysis13 = await rca33.analyze(new Error('Cannot find module'), { taskId: 'escalation-task', taskType: 'build', recentChanges: [], failureCount: 4 });
  assert.strictEqual(analysis13.patterns.isEscalating, true);
  assert.ok(analysis13.patterns.uniqueCategories.length > 2);
  console.log('âœ“ should detect escalating failures across categories');
  passed++;

  // Context analysis tests
  console.log('\ncontext analysis:');
  const rca34 = new RCAEngine();
  const analysis14 = await rca34.analyze(new Error('Cannot find module'), {
    taskId: 'config-task',
    taskType: 'build',
    recentChanges: ['config.json', '.env'],
    failureCount: 2
  });
  const hasConfigRisk = analysis14.context_analysis.riskFactors.some(r => r.toLowerCase().includes('configuration'));
  assert.ok(hasConfigRisk);
  console.log('âœ“ should identify risky configuration changes');
  passed++;

  const rca35 = new RCAEngine();
  const analysis15 = await rca35.analyze(new Error('Module not found'), {
    taskId: 'dep-task',
    taskType: 'build',
    recentChanges: ['package.json', 'package-lock.json'],
    failureCount: 2
  });
  const hasDepRisk = analysis15.context_analysis.riskFactors.some(r => r.toLowerCase().includes('dependency'));
  assert.ok(hasDepRisk);
  console.log('âœ“ should identify risky dependency changes');
  passed++;

  const rca36 = new RCAEngine();
  const analysis16 = await rca36.analyze(new Error('Timeout'), {
    taskId: 'async-task',
    taskType: 'api',
    recentChanges: ['src/async-handler.js'],
    failureCount: 2
  });
  const hasAsyncRisk = analysis16.context_analysis.riskFactors.some(r => r.toLowerCase().includes('async') || r.toLowerCase().includes('timing'));
  assert.ok(hasAsyncRisk);
  console.log('âœ“ should identify risky async changes');
  passed++;

  // Summary
  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
