import * as path from 'path';
import * as fs from 'fs';
import { handleAnalytics } from '../../bin/lib/commands/analytics-cli.js';

describe('ez-agents analytics CLI', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'test-'));
    process.env.EZ_ANALYTICS_ENABLED = 'true';
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    delete process.env.EZ_ANALYTICS_ENABLED;
  });

  test('analytics track --event records event with properties', async () => {
    // Arrange
    const args = ['track', '--event=page_view', '--user=user-123', '--props={"page":"/home"}'];

    // Act
    await expect(handleAnalytics(args, tmpDir)).resolves.not.toThrow();

    // Assert
    const dataPath = path.join(tmpDir, '.planning', 'analytics.json');
    expect(fs.existsSync(dataPath)).toBeTruthy();

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    expect(data.events.length).toBe(1);
    expect(data.events[0].name).toBe('page_view');
    expect(data.events[0].userId).toBe('user-123');
  });

  test('analytics session --start creates new session', async () => {
    // Arrange
    const args = ['session', '--start', '--user=user-456'];

    // Act
    await expect(handleAnalytics(args, tmpDir)).resolves.not.toThrow();

    // Assert
    const dataPath = path.join(tmpDir, '.planning', 'analytics.json');
    expect(fs.existsSync(dataPath)).toBeTruthy();

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    expect(data.sessions.length).toBe(1);
    expect(data.sessions[0].userId).toBe('user-456');
    expect(data.sessions[0].startTime).toBeTruthy();
  });

  test('analytics session --end closes session with duration', async () => {
    // Arrange: First create a session
    const { AnalyticsCollector } = await import('../../bin/lib/analytics/analytics-collector.js');
    const collector = new AnalyticsCollector(tmpDir);
    const sessionId = await collector.startSession({ userId: 'user-789' });

    const args = ['session', '--end', `--id=${sessionId}`];

    // Act
    await expect(handleAnalytics(args, tmpDir)).resolves.not.toThrow();

    // Assert
    const dataPath = path.join(tmpDir, '.planning', 'analytics.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    const session = data.sessions.find((s: { id: string }) => s.id === sessionId);
    expect(session).toBeTruthy();
    expect(session?.endTime).toBeTruthy();
    expect(session?.duration).toBeGreaterThanOrEqual(0);
  });

  test('analytics report --type generates report in specified format', async () => {
    // Arrange
    const args = ['report', '--type=weekly', '--format=json'];

    // Act
    await expect(handleAnalytics(args, tmpDir)).resolves.not.toThrow();
  });

  test('analytics export --format csv exports data to file', async () => {
    // Arrange
    const args = ['export', '--format=csv', '--output=analytics-export'];

    // Act
    await expect(handleAnalytics(args, tmpDir)).resolves.not.toThrow();

    // Assert
    const reportPath = path.join(tmpDir, '.planning', 'analytics', 'reports', 'analytics-export.csv');
    expect(fs.existsSync(reportPath)).toBeTruthy();
  });
});
