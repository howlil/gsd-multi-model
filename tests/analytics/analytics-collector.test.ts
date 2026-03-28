import * as path from 'path';
import * as fs from 'fs';
import { AnalyticsCollector } from '../../bin/lib/analytics/analytics-collector.js';

describe('AnalyticsCollector', () => {
  let tmpDir: string;
  let collector: AnalyticsCollector;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'test-'));
    // Enable analytics for tests
    process.env.EZ_ANALYTICS_ENABLED = 'true';
    collector = new AnalyticsCollector(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    delete process.env.EZ_ANALYTICS_ENABLED;
  });

  test('constructor does not throw', () => {
    expect(collector).toBeTruthy();
  });

  test('track() records event with timestamp and metadata', async () => {
    // Arrange
    const eventData = {
      name: 'page_view',
      userId: 'user-123',
      properties: { page: '/home' }
    };

    // Act
    await collector.track(eventData);

    // Assert
    const dataPath = path.join(tmpDir, '.planning', 'analytics.json');
    expect(fs.existsSync(dataPath)).toBeTruthy();

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    expect(data.events.length).toBe(1);
    
    const event = data.events[0];
    expect(event.name).toBe('page_view');
    expect(event.userId).toBe('user-123');
    expect(event.timestamp).toBeTruthy();
    expect(event.properties).toEqual({ page: '/home' });
  });

  test('startSession() creates session with unique ID', async () => {
    // Act
    const sessionId = await collector.startSession({ userId: 'user-456' });

    // Assert
    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe('string');
    expect(sessionId).toMatch(/^session-\d+-\d+$/);

    const dataPath = path.join(tmpDir, '.planning', 'analytics.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    expect(data.sessions.length).toBe(1);

    const session = data.sessions[0];
    expect(session.id).toBe(sessionId);
    expect(session.userId).toBe('user-456');
    expect(session.startTime).toBeTruthy();
  });

  test('endSession() closes session with duration', async () => {
    // Arrange
    const sessionId = await collector.startSession({ userId: 'user-789' });
    
    // Wait a small amount to ensure duration > 0
    await new Promise(resolve => setTimeout(resolve, 10));

    // Act
    await collector.endSession(sessionId);

    // Assert
    const dataPath = path.join(tmpDir, '.planning', 'analytics.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    const session = data.sessions.find((s: { id: string }) => s.id === sessionId);
    expect(session).toBeTruthy();
    expect(session.endTime).toBeTruthy();
    expect(session.duration).toBeGreaterThanOrEqual(0);
  });

  test('getEvents() returns filtered events by name', async () => {
    // Arrange
    await collector.track({ name: 'page_view', userId: 'user-1' });
    await collector.track({ name: 'click', userId: 'user-2' });
    await collector.track({ name: 'page_view', userId: 'user-3' });

    // Act
    const pageViewEvents = collector.getEvents({ name: 'page_view' });

    // Assert
    expect(pageViewEvents.length).toBe(2);
    pageViewEvents.forEach(event => {
      expect(event.name).toBe('page_view');
    });
  });
});
