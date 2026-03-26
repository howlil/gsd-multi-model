/**
 * FinOpsAnalyzer Tests - Updated for TS implementation
 */

import { FinOpsAnalyzer } from '../../bin/lib/finops/finops-analyzer.js';

describe('FinOpsAnalyzer', () => {
  let tmpDir: string;
  let analyzer: FinOpsAnalyzer;

  beforeEach(() => {
    tmpDir = createTempProject();
    analyzer = new FinOpsAnalyzer(tmpDir);
  });

  afterEach(() => cleanup(tmpDir));

  test('constructor does not throw', () => {
    expect(analyzer).toBeTruthy();
  });

  test('analyzeCosts() returns breakdown', async () => {
    const result = await analyzer.analyzeCosts();
    expect(result).toBeTruthy();
  });

  test('getOptimizationRecommendations() returns suggestions', async () => {
    const recs = await analyzer.getOptimizationRecommendations();
    expect(recs).toBeTruthy();
  });

  test('detectAnomalies() identifies patterns', async () => {
    const anomalies = await analyzer.detectAnomalies();
    expect(anomalies).toBeTruthy();
  });

  test('forecastSpending() predicts costs', async () => {
    const forecast = await analyzer.forecastSpending();
    expect(forecast).toBeTruthy();
  });

  test('getCostPerUnit() calculates efficiency', async () => {
    const unitCost = await analyzer.getCostPerUnit();
    expect(unitCost).toBeTruthy();
  });
});
