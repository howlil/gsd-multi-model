/**
 * EZ Tools Tests - AnalyticsCLI Integration Tests
 *
 * Integration tests for the analytics CLI commands covering
 * event tracking, report generation, and data export.
 *
 * These tests are RED (failing) until implementation ships.
 * Requirement: ANALYTICS-06
 */



import * as path from 'path';
import * as fs from 'fs';


describe('ez-agents analytics', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = createTempProject(); });
  afterEach(() => cleanup(tmpDir));

  test('analytics track --event records event with properties', () => {
    const result = runEzTools(
      ['analytics', 'track', '--event page_view', '--user user-123', '--props {"page":"/home"}'],
      tmpDir
    );
    expect(result.success).toBeTruthy() // 'analytics track must exit 0: ' + result.error;
    expect(result.output.includes('Event recorded')).toBeTruthy() // 'output must confirm event recorded';

    const dataPath = path.join(tmpDir, '.planning', 'analytics.json');
    expect(fs.existsSync(dataPath)).toBeTruthy() // 'analytics.json must exist after track';
  });

  test('analytics session --start creates new session', () => {
    const result = runEzTools(
      ['analytics', 'session', '--start', '--user user-456'],
      tmpDir
    );
    expect(result.success).toBeTruthy() // 'analytics session --start must exit 0: ' + result.error;

    const sessionId = result.output.match(/Session ID: (\S+)/);
    expect(sessionId).toBeTruthy() // 'output must contain session ID';

    const dataPath = path.join(tmpDir, '.planning', 'analytics.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    expect(Array.isArray(data.sessions)).toBeTruthy() // 'must have sessions array';
  });

  test('analytics session --end closes session with duration', () => {
    // Start session
    const startResult = runEzTools(
      ['analytics', 'session', '--start', '--user', 'user-789'],
      tmpDir
    );
    expect(startResult.success).toBeTruthy() // 'session start must succeed';
    const sessionIdMatch = startResult.output.match(/Session ID: (\S+)/);
    expect(sessionIdMatch).toBeTruthy() // 'Session ID should be found in output';
    const sessionId = sessionIdMatch[1];
    expect(sessionId).toBeTruthy() // 'Session ID should not be empty';

    // End session
    const endResult = runEzTools(
      ['analytics', 'session', '--end', '--id ' + sessionId],
      tmpDir
    );
    expect(endResult.success).toBeTruthy() // 'analytics session --end must exit 0: ' + endResult.error;
    expect(endResult.output.includes('Session ended')).toBeTruthy() // 'output must confirm session ended';
  });

  test('analytics report --type generates report in specified format', () => {
    const result = runEzTools(
      ['analytics', 'report', '--type=weekly', '--format json'],
      tmpDir
    );
    expect(result.success).toBeTruthy() // 'analytics report must exit 0: ' + result.error;

    // Output should be valid JSON or contain report path
    try {
      JSON.parse(result.output);
    } catch {
      // If not JSON directly, should contain file path
      expect(result.output.includes('Report generated') || result.output.includes('.json')).toBeTruthy() // 'output must contain report data or file path';
    }
  });

  test('analytics export --format csv exports data to file', () => {
    const result = runEzTools(
      ['analytics', 'export', '--format csv', '--output analytics-export'],
      tmpDir
    );
    expect(result.success).toBeTruthy() // 'analytics export must exit 0: ' + result.error;

    // Should create CSV file
    const csvPath = path.join(tmpDir, 'analytics-export.csv');
    expect(fs.existsSync(csvPath) || result.output.includes('.csv')).toBeTruthy() // 'must create CSV export file or return path';
  });
});
