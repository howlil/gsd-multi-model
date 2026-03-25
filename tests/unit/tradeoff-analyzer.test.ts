#!/usr/bin/env node

/**
 * Unit Tests for Trade-off Analyzer
 *
 * Tests analysis generation, reversibility assessment, and template validation.
 */

import assert from 'node:assert';
import { test } from './test-utils.js';
import { TradeOffAnalyzer, TRADEOFF_TEMPLATE } from '../../ez-agents/bin/lib/tradeoff-analyzer.js';

console.log('Running Trade-off Analyzer Tests...\n');

let passed = 0;
let failed = 0;

// Test: generateAnalysis produces valid markdown
test('generateAnalysis produces valid markdown', () => {
  const analyzer = new TradeOffAnalyzer();
  const options = [
    {
      name: 'Monolith',
      pros: ['Simple to develop', 'Easy to test', 'Fast deployment'],
      cons: ['Hard to scale', 'Tight coupling'],
      long_term_implications: ['May need refactoring at scale']
    },
    {
      name: 'Microservices',
      pros: ['Independent scaling', 'Team autonomy'],
      cons: ['Complex operations', 'Network latency'],
      long_term_implications: ['Requires mature DevOps']
    }
  ];

  const context = {
    decision: 'Architecture Pattern',
    project_phase: 'MVP',
    team_size: '5 developers'
  };

  const analysis = analyzer.generateAnalysis(options, context);

  assert.ok(analysis.includes('## Trade-off Analysis'), 'Should have title');
  assert.ok(analysis.includes('**Decision:**'), 'Should have decision section');
  assert.ok(analysis.includes('**Options Considered:**'), 'Should have options section');
  assert.ok(analysis.includes('**Rationale:**'), 'Should have rationale section');
});

// Test: assessReversibility returns Easy/Medium/Hard
test('assessReversibility returns Easy/Medium/Hard', () => {
  const analyzer = new TradeOffAnalyzer();

  const monolithOption = { name: 'Monolith' };
  const microservicesOption = { name: 'Microservices' };

  const monolithReversibility = analyzer.assessReversibility(monolithOption);
  const microservicesReversibility = analyzer.assessReversibility(microservicesOption);

  assert.ok(['Easy', 'Medium', 'Hard'].includes(monolithReversibility.level), 'Monolith should have valid level');
  assert.ok(['Easy', 'Medium', 'Hard'].includes(microservicesReversibility.level), 'Microservices should have valid level');
  assert.ok(monolithReversibility.details, 'Should have reversal details');
});

// Test: generateAnalysis includes all required sections
test('generateAnalysis includes all required sections', () => {
  const analyzer = new TradeOffAnalyzer();
  const options = [
    {
      name: 'Option A',
      pros: ['Pro 1'],
      cons: ['Con 1'],
      long_term_implications: ['Implication 1']
    }
  ];

  const context = {
    decision: 'Test Decision',
    project_phase: 'MVP',
    team_size: 'Small',
    deadline: 'Tight',
    user_count: 'Low',
    compliance: 'None'
  };

  const analysis = analyzer.generateAnalysis(options, context);

  assert.ok(analysis.includes('Project Phase: MVP'), 'Should include project phase');
  assert.ok(analysis.includes('Team Size: Small'), 'Should include team size');
  assert.ok(analysis.includes('Deadline: Tight'), 'Should include deadline');
  assert.ok(analysis.includes('**Reversibility:**'), 'Should include reversibility');
  assert.ok(analysis.includes('**Review Date:**'), 'Should include review date');
});

// Test: _calculateReviewDate based on reversibility
test('calculateReviewDate returns future date', () => {
  const analyzer = new TradeOffAnalyzer();
  
  // Access private method via prototype or test indirectly
  const reviewDate = analyzer._calculateReviewDate('Easy');
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 6);
  
  const reviewDateObj = new Date(reviewDate);
  assert.ok(reviewDateObj >= new Date(), 'Review date should be in future');
});

// Test: TRADEOFF_TEMPLATE has required placeholders
test('TRADEOFF_TEMPLATE has required placeholders', () => {
  assert.ok(TRADEOFF_TEMPLATE.includes('{decision}'), 'Should have decision placeholder');
  assert.ok(TRADEOFF_TEMPLATE.includes('{project_phase}'), 'Should have project_phase placeholder');
  assert.ok(TRADEOFF_TEMPLATE.includes('{options_section}'), 'Should have options_section placeholder');
  assert.ok(TRADEOFF_TEMPLATE.includes('{selected_option}'), 'Should have selected_option placeholder');
  assert.ok(TRADEOFF_TEMPLATE.includes('{rationale}'), 'Should have rationale placeholder');
  assert.ok(TRADEOFF_TEMPLATE.includes('{reversibility}'), 'Should have reversibility placeholder');
  assert.ok(TRADEOFF_TEMPLATE.includes('{review_date}'), 'Should have review_date placeholder');
});

// Test: Empty options handling
test('generateAnalysis handles empty options', () => {
  const analyzer = new TradeOffAnalyzer();
  const analysis = analyzer.generateAnalysis([], { decision: 'Empty Test' });
  
  assert.ok(analysis.includes('No options provided') || analysis.includes('Decision'), 'Should handle empty options gracefully');
});

// Test: Single option handling
test('generateAnalysis handles single option', () => {
  const analyzer = new TradeOffAnalyzer();
  const options = [{ name: 'Only Option', pros: ['Good'], cons: ['Bad'] }];
  const analysis = analyzer.generateAnalysis(options, { decision: 'Single Option Test' });
  
  assert.ok(analysis.includes('Only Option'), 'Should include the single option');
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
