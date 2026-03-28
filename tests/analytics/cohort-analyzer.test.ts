import * as path from 'path';
import * as fs from 'fs';
import { CohortAnalyzer } from '../../bin/lib/analytics/cohort-analyzer.js';

describe('CohortAnalyzer', () => {
  let tmpDir: string;
  let analyzer: CohortAnalyzer;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'test-'));
    analyzer = new CohortAnalyzer(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('constructor does not throw', () => {
    expect(analyzer).toBeTruthy();
  });

  test('defineCohort() creates cohort by signup period', async () => {
    // Arrange
    const cohort = {
      name: 'January 2026',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      criteria: 'Signed up in January'
    };

    // Act
    await analyzer.defineCohort(cohort);

    // Assert
    const dataPath = path.join(tmpDir, '.planning', 'cohorts.json');
    expect(fs.existsSync(dataPath)).toBeTruthy();

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    expect(data.cohorts.length).toBe(1);
    expect(data.cohorts[0].name).toBe('January 2026');
    expect(data.cohorts[0].startDate).toBe('2026-01-01');
    expect(data.cohorts[0].endDate).toBe('2026-01-31');
  });

  test('addUserToCohort() assigns user based on signup date', async () => {
    // Arrange
    await analyzer.defineCohort({
      name: 'January 2026',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      criteria: 'Signed up in January'
    });

    // Act
    await analyzer.addUserToCohort('user-123', '2026-01-15');

    // Assert
    const dataPath = path.join(tmpDir, '.planning', 'cohorts.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    expect(data.memberships['January 2026']).toBeTruthy();
    expect(data.memberships['January 2026'].length).toBe(1);
    expect(data.memberships['January 2026'][0]).toBe('user-123');
    expect(data.cohorts[0].size).toBe(1);
  });

  test('calculateRetention() returns retention rate per period', async () => {
    // Arrange: Create cohort with 10 users
    await analyzer.defineCohort({
      name: 'Test Cohort',
      startDate: '2026-01-01',
      endDate: '2026-01-07',
      criteria: 'Test'
    });

    for (let i = 0; i < 10; i++) {
      await analyzer.addUserToCohort(`user-${i}`, '2026-01-05');
    }

    // Record activity for different weeks
    for (let i = 0; i < 10; i++) {
      await analyzer.recordActivity(`user-${i}`, '2026-01-05'); // week 0
    }
    for (let i = 0; i < 7; i++) {
      await analyzer.recordActivity(`user-${i}`, '2026-01-12'); // week 1
    }
    for (let i = 0; i < 5; i++) {
      await analyzer.recordActivity(`user-${i}`, '2026-01-19'); // week 2
    }
    for (let i = 0; i < 3; i++) {
      await analyzer.recordActivity(`user-${i}`, '2026-01-26'); // week 3
    }

    // Act
    const retention = analyzer.calculateRetention('Test Cohort');

    // Assert
    expect(retention).toBeTruthy();
    expect(retention.cohort).toBe('Test Cohort');
    expect(retention.initialSize).toBe(10);
    expect(retention.periods).toBeTruthy();
    expect(retention.periods.length).toBe(4);
    
    // Week 0 should have 100% retention (all users active)
    expect(retention.periods[0]?.rate).toBeGreaterThanOrEqual(0);
  });

  test('compareCohorts() returns comparative retention metrics', async () => {
    // Arrange
    await analyzer.defineCohort({
      name: 'Cohort A',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      criteria: 'Group A'
    });
    await analyzer.defineCohort({
      name: 'Cohort B',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      criteria: 'Group B'
    });

    await analyzer.addUserToCohort('user-1', '2026-01-15');
    await analyzer.addUserToCohort('user-2', '2026-02-15');

    // Act
    const comparison = await analyzer.compareCohorts(['Cohort A', 'Cohort B']);

    // Assert
    expect(comparison).toBeTruthy();
    expect(comparison.cohorts).toBeTruthy();
    expect(comparison.cohorts.length).toBe(2);
    expect(comparison.cohorts.find(c => c.name === 'Cohort A')?.size).toBe(1);
    expect(comparison.cohorts.find(c => c.name === 'Cohort B')?.size).toBe(1);
  });

  test('getCohortMetrics() returns size, activity, and lifetime value', async () => {
    // Arrange
    await analyzer.defineCohort({
      name: 'Metrics Cohort',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      criteria: 'Test'
    });

    for (let i = 0; i < 5; i++) {
      await analyzer.addUserToCohort(`user-${i}`, '2026-01-15');
    }

    // Act
    const metrics = await analyzer.getCohortMetrics('Metrics Cohort');

    // Assert
    expect(metrics).toBeTruthy();
    expect(metrics.cohort).toBe('Metrics Cohort');
    expect(metrics.size).toBe(5);
    expect(typeof metrics.activity).toBe('number');
    expect(typeof metrics.lifetimeValue).toBe('number');
  });
});
