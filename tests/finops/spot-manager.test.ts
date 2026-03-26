/**
 * SpotManager Tests - Updated for TS implementation
 */

import { SpotManager } from '../../bin/lib/finops/spot-manager.js';

describe('SpotManager', () => {
  let tmpDir: string;
  let manager: SpotManager;

  beforeEach(() => {
    tmpDir = createTempProject();
    manager = new SpotManager(tmpDir);
  });

  afterEach(() => cleanup(tmpDir));

  test('constructor does not throw', () => {
    expect(manager).toBeTruthy();
  });

  test('requestSpotInstance() provisions instance', async () => {
    const result = await manager.requestSpotInstance({ maxPrice: 0.05 });
    expect(result).toBeTruthy();
    expect(result.instanceId).toBeTruthy();
  });

  test('handleInterruption() handles termination', async () => {
    const result = await manager.handleInterruption('spot-123');
    expect(result).toBeTruthy();
    expect(result.handled).toBeTruthy();
  });

  test('getSpotSavings() calculates savings', async () => {
    const savings = await manager.getSpotSavings();
    expect(savings).toBeTruthy();
  });

  test('getOptimalSpotConfig() recommends config', async () => {
    const config = await manager.getOptimalSpotConfig();
    expect(config).toBeTruthy();
  });
});
