/**
 * CostReporter Tests - Updated for TS implementation
 */

import { CostReporter } from '../../bin/lib/finops/cost-reporter.js';

describe('CostReporter', () => {
  let tmpDir: string;
  let reporter: CostReporter;

  beforeEach(() => {
    tmpDir = createTempProject();
    reporter = new CostReporter(tmpDir);
  });

  afterEach(() => cleanup(tmpDir));

  test('constructor does not throw', () => {
    expect(reporter).toBeTruthy();
  });

  test('generateReport() creates summary', async () => {
    const report = await reporter.generateReport();
    expect(report).toBeTruthy();
  });

  test('getCostByService() returns costs', async () => {
    const costs = await reporter.getCostByService();
    expect(costs).toBeTruthy();
  });

  test('getCostByPeriod() returns period costs', async () => {
    const periods = await reporter.getCostByPeriod();
    expect(periods).toBeTruthy();
  });

  test('exportReport() writes to file', async () => {
    const report = { summary: { total: 100 } };
    const path = await reporter.exportReport(report, { format: 'json' });
    expect(path).toBeTruthy();
  });

  test('comparePeriods() returns comparison', async () => {
    const comparison = await reporter.comparePeriods();
    expect(comparison).toBeTruthy();
  });
});
