/**
 * EZ Tools Tests - CohortAnalyzer Unit Tests
 *
 * Unit tests for cohort-analyzer.cjs covering cohort definition,
 * retention calculation, and comparative analysis.
 *
 * These tests are RED (failing) until implementation ships.
 * Requirement: ANALYTICS-04
 */



import * as path from 'path';
import * as fs from 'fs';

import { CohortAnalyzer } from '../../bin/lib/analytics/cohort-analyzer.js';

describe('CohortAnalyzer', () => {
  let tmpDir, analyzer;

  beforeEach(() => {
    tmpDir = createTempProject();
    analyzer = new CohortAnalyzer(tmpDir);
  });

  afterEach(() => cleanup(tmpDir));

  test('constructor does not throw', () => {
    expect(analyzer).toBeTruthy() // 'CohortAnalyzer instance must be created without throwing';
  });

  test('defineCohort() creates cohort by signup period', async () => {
    const cohort = {
      name: 'january_2026',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      criteria: { event: 'user_signed_up' }
    };

    await analyzer.defineCohort(cohort);

    const dataPath = path.join(tmpDir, '.planning', 'cohorts.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    expect(Array.isArray(data.cohorts)).toBeTruthy() // 'cohorts.json must have cohorts array';
    expect(data.cohorts.length).toBe(1, 'must have 1 cohort');

    const saved = data.cohorts[0];
    expect(saved.name).toBe('january_2026', 'cohort name must match');
    expect(saved.startDate).toBe('2026-01-01', 'startDate must match');
    expect(saved.endDate).toBe('2026-01-31', 'endDate must match');
  });

  test('addUserToCohort() assigns user based on signup date', async () => {
    await analyzer.defineCohort({
      name: 'week1_march',
      startDate: '2026-03-01',
      endDate: '2026-03-07',
      criteria: { event: 'user_signed_up' }
    });

    await analyzer.addUserToCohort('user-1', '2026-03-02');
    await analyzer.addUserToCohort('user-2', '2026-03-05');

    const dataPath = path.join(tmpDir, '.planning', 'cohorts.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    expect(data.memberships).toBeTruthy() // 'must have memberships data';
    const week1Members = data.memberships['week1_march'];
    expect(week1Members).toBeTruthy() // 'must have week1_march members';
    expect(week1Members.length).toBe(2, 'must have 2 members');
    expect(week1Members.includes('user-1')).toBeTruthy() // 'must include user-1';
    expect(week1Members.includes('user-2')).toBeTruthy() // 'must include user-2';
  });

  test('calculateRetention() returns retention rate per period', async () => {
    await analyzer.defineCohort({
      name: 'test_cohort',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      criteria: { event: 'user_signed_up' }
    });

    // 10 users in cohort
    for (let i = 0; i < 10; i++) {
      await analyzer.addUserToCohort(`user-${i}`, '2026-01-15');
    }

    // Record activity: 10 in week 0, 7 in week 1, 5 in week 2, 3 in week 3
    for (let i = 0; i < 10; i++) {
      await analyzer.recordActivity(`user-${i}`, '2026-01-15'); // week 0
    }
    for (let i = 0; i < 7; i++) {
      await analyzer.recordActivity(`user-${i}`, '2026-01-22'); // week 1
    }
    for (let i = 0; i < 5; i++) {
      await analyzer.recordActivity(`user-${i}`, '2026-01-29'); // week 2
    }
    for (let i = 0; i < 3; i++) {
      await analyzer.recordActivity(`user-${i}`, '2026-02-05'); // week 3
    }

    const retention = analyzer.calculateRetention('test_cohort');

    expect(retention).toBeTruthy() // 'calculateRetention must return data';
    expect(Array.isArray(retention.periods)).toBeTruthy() // 'must have periods array';
    expect(retention.periods[0].rate).toBe(100, 'week 0 must be 100%');
    expect(retention.periods[1].rate).toBe(70, 'week 1 must be 70%');
    expect(retention.periods[2].rate).toBe(50, 'week 2 must be 50%');
    expect(retention.periods[3].rate).toBe(30, 'week 3 must be 30%');
  });

  test('compareCohorts() returns comparative retention metrics', async () => {
    // Cohort A: 10 users, 50% retention at week 1
    await analyzer.defineCohort({
      name: 'cohort_a',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      criteria: { event: 'user_signed_up' }
    });
    for (let i = 0; i < 10; i++) {
      await analyzer.addUserToCohort(`a-${i}`, '2026-01-15');
      await analyzer.recordActivity(`a-${i}`, '2026-01-15');
    }
    for (let i = 0; i < 5; i++) {
      await analyzer.recordActivity(`a-${i}`, '2026-01-22');
    }

    // Cohort B: 10 users, 80% retention at week 1
    await analyzer.defineCohort({
      name: 'cohort_b',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      criteria: { event: 'user_signed_up' }
    });
    for (let i = 0; i < 10; i++) {
      await analyzer.addUserToCohort(`b-${i}`, '2026-02-15');
      await analyzer.recordActivity(`b-${i}`, '2026-02-15');
    }
    for (let i = 0; i < 8; i++) {
      await analyzer.recordActivity(`b-${i}`, '2026-02-22');
    }

    const comparison = await analyzer.compareCohorts(['cohort_a', 'cohort_b']);

    expect(comparison).toBeTruthy() // 'compareCohorts must return data';
    expect(Array.isArray(comparison.cohorts || comparison)).toBeTruthy();
    expect(comparison.cohorts.length).toBe(2, 'must compare 2 cohorts');
    expect(comparison.summary).toBeTruthy() // 'must have summary data';
  });

  test('getCohortMetrics() returns size, activity, and lifetime value', async () => {
    await analyzer.defineCohort({
      name: 'premium_cohort',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      criteria: { event: 'user_signed_up' }
    });

    for (let i = 0; i < 5; i++) {
      await analyzer.addUserToCohort(`user-${i}`, '2026-01-15');
      await analyzer.recordActivity(`user-${i}`, '2026-01-15');
      await analyzer.recordValue(`user-${i}`, 100); // $100 LTV each
    }

    const metrics = analyzer.getCohortMetrics('premium_cohort');

    expect(metrics).toBeTruthy() // 'getCohortMetrics must return data';
    expect(metrics.size).toBe(5, 'cohort size must be 5');
    expect(metrics.totalValue).toBe(500, 'total value must be 500');
    expect(metrics.avgValuePerUser).toBe(100, 'avg value per user must be 100');
  });
});
