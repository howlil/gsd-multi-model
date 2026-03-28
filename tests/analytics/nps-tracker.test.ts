import * as path from 'path';
import * as fs from 'fs';
import { NPSTracker } from '../../bin/lib/analytics/nps-tracker.js';

describe('NPSTracker', () => {
  let tmpDir: string;
  let tracker: NPSTracker;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'test-'));
    tracker = new NPSTracker(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('constructor does not throw', () => {
    expect(tracker).toBeTruthy();
  });

  test('recordResponse() categorizes promoters, passives, detractors', async () => {
    // Arrange
    const responses = [
      { userId: 'u1', score: 10 }, // promoter
      { userId: 'u2', score: 9 },  // promoter
      { userId: 'u3', score: 8 },  // passive
      { userId: 'u4', score: 4 }   // detractor
    ];

    // Act
    for (const response of responses) {
      await tracker.recordResponse(response);
    }

    // Assert
    const npsPath = path.join(tmpDir, '.planning', 'nps.json');
    expect(fs.existsSync(npsPath)).toBeTruthy();

    const data = JSON.parse(fs.readFileSync(npsPath, 'utf8'));
    expect(data.responses.length).toBe(4);

    const promoters = data.responses.filter((r: { category: string }) => r.category === 'promoter');
    const passives = data.responses.filter((r: { category: string }) => r.category === 'passive');
    const detractors = data.responses.filter((r: { category: string }) => r.category === 'detractor');

    expect(promoters.length).toBe(2);
    expect(passives.length).toBe(1);
    expect(detractors.length).toBe(1);
  });

  test('calculateScore() returns NPS = %promoters - %detractors', () => {
    // Arrange: 2 promoters, 1 passive, 1 detractor
    // NPS = (2/4)*100 - (1/4)*100 = 50 - 25 = 25
    const responses = [
      { userId: 'u1', score: 10 },
      { userId: 'u2', score: 9 },
      { userId: 'u3', score: 8 },
      { userId: 'u4', score: 4 }
    ];

    // Act
    responses.forEach(r => tracker.recordResponse(r));
    const result = tracker.calculateScore();

    // Assert
    expect(result.nps).toBe(25);
    expect(result.promoters).toBe(2);
    expect(result.passives).toBe(1);
    expect(result.detractors).toBe(1);
    expect(result.total).toBe(4);
  });

  test('getTrend() returns NPS change over time periods', async () => {
    // Arrange: Record responses over time
    const responses = [
      { userId: 'u1', score: 10, timestamp: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString() }, // 4 weeks ago
      { userId: 'u2', score: 9, timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString() },  // 3 weeks ago
      { userId: 'u3', score: 6, timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },  // 2 weeks ago
      { userId: 'u4', score: 5, timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }    // 1 week ago
    ];

    // Act
    for (const response of responses) {
      await tracker.recordResponse(response);
    }

    const trend = tracker.getTrendWithOptions({ periods: 4, periodType: 'week' });

    // Assert
    expect(trend).toBeTruthy();
    expect(trend.periods).toBeTruthy();
    expect(trend.periods.length).toBe(4);
    expect(['improving', 'declining', 'stable']).toContain(trend.direction);
  });
});
