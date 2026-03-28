import * as path from 'path';
import * as fs from 'fs';
import { AnalyticsReporter } from '../../bin/lib/analytics/analytics-reporter.js';

describe('AnalyticsReporter', () => {
  let tmpDir: string;
  let reporter: AnalyticsReporter;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'test-'));
    reporter = new AnalyticsReporter(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('constructor does not throw', () => {
    expect(reporter).toBeTruthy();
  });

  test('generateReport() creates summary with key metrics', async () => {
    // Arrange
    const options = {
      type: 'weekly',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    };

    // Act
    const report = await reporter.generateReport(options);

    // Assert
    expect(report).toBeTruthy();
    expect(report.generatedAt).toBeTruthy();
    expect(report.period.startDate).toBe(options.startDate);
    expect(report.period.endDate).toBe(options.endDate);
    expect(report.metrics).toBeTruthy();
    expect(typeof report.metrics.totalEvents).toBe('number');
    expect(typeof report.metrics.totalUsers).toBe('number');
    expect(typeof report.metrics.activeUsers).toBe('number');
  });

  test('aggregateMetrics() combines data from multiple sources', async () => {
    // Arrange
    const options = {
      sources: ['web', 'mobile', 'api'],
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    };

    // Act
    const metrics = await reporter.aggregateMetrics(options);

    // Assert
    expect(metrics).toBeTruthy();
    expect(metrics.summary).toBeTruthy();
    expect(metrics.bySource).toBeTruthy();
    expect(metrics.bySource.length).toBe(3);
    expect(metrics.bySource.map(s => s.source)).toEqual(['web', 'mobile', 'api']);
  });

  test('exportReport() writes report to file in specified format', async () => {
    // Arrange
    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      },
      metrics: {
        totalEvents: 100,
        totalUsers: 50,
        activeUsers: 30
      }
    };

    // Act
    const filePath = await reporter.exportReport(report, {
      format: 'json',
      filename: 'test-report'
    });

    // Assert
    expect(filePath).toBeTruthy();
    expect(fs.existsSync(filePath)).toBeTruthy();

    const content = fs.readFileSync(filePath, 'utf8');
    const exportedReport = JSON.parse(content);
    expect(exportedReport.metrics.totalEvents).toBe(100);
  });

  test('scheduleReport() creates recurring report configuration', async () => {
    // Arrange
    const options = {
      name: 'Weekly Report',
      type: 'weekly',
      recipients: ['team@example.com'],
      format: 'json' as const,
      cron: '0 0 * * 1'
    };

    // Act
    const schedule = await reporter.scheduleReport(options);

    // Assert
    expect(schedule).toBeTruthy();
    expect(schedule.id).toBeTruthy();
    expect(schedule.name).toBe('Weekly Report');
    expect(schedule.type).toBe('weekly');
    expect(schedule.recipients).toEqual(['team@example.com']);
    expect(schedule.enabled).toBe(true);

    const schedulesPath = path.join(tmpDir, '.planning', 'report-schedules.json');
    expect(fs.existsSync(schedulesPath)).toBeTruthy();

    const data = JSON.parse(fs.readFileSync(schedulesPath, 'utf8'));
    expect(data.schedules.length).toBe(1);
    expect(data.schedules[0].name).toBe('Weekly Report');
  });
});
