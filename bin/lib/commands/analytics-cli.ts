#!/usr/bin/env node
/**
 * Analytics CLI handler
 * 
 * Handles analytics subcommands: track, session, report, export
 */

import * as path from 'path';

/**
 * Parse command-line arguments in --key=value or --flag format
 * @param args - Array of argument strings
 * @returns Parsed key-value pairs
 */
function parseArgs(args: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};

  for (const arg of args) {
    const match = arg.match(/^--([^=]+)(?:=(.+))?$/);
    if (match) {
      const key = match[1];
      const value = match[2];
      result[key] = value !== undefined ? value : true;
    }
  }

  return result;
}

/**
 * Handle analytics CLI commands
 * @param args - Command-line arguments (excluding 'analytics' subcommand)
 * @param cwd - Current working directory
 */
export async function handleAnalytics(args: string[], cwd: string): Promise<void> {
  const subcommand = args[0];
  const params = parseArgs(args.slice(1));

  switch (subcommand) {
    case 'track': {
      const { AnalyticsCollector } = await import('../analytics/analytics-collector.js');
      const collector = new AnalyticsCollector(cwd);

      const event = typeof params['event'] === 'string' ? params['event'] : 'unknown';
      const user = typeof params['user'] === 'string' ? params['user'] : undefined;
      const propsStr = typeof params['props'] === 'string' ? params['props'] : undefined;

      let properties: Record<string, unknown> | undefined;
      if (propsStr) {
        try {
          properties = JSON.parse(propsStr);
        } catch {
          properties = { raw: propsStr };
        }
      }

      await collector.track({
        name: event,
        userId: user,
        properties
      });

      console.log(`Event recorded: ${event}`);
      break;
    }

    case 'session': {
      const { AnalyticsCollector } = await import('../analytics/analytics-collector.js');
      const collector = new AnalyticsCollector(cwd);

      const isStart = params['start'] === true;
      const isEnd = params['end'] === true;

      if (isStart) {
        const user = params['user'] as string | undefined;
        const sessionId = await collector.startSession({ userId: user });
        console.log(`Session ID: ${sessionId}`);
      } else if (isEnd) {
        const sessionId = (params['id'] as string) || '';
        if (sessionId) {
          await collector.endSession(sessionId);
          console.log('Session ended');
        } else {
          console.log('Error: --id is required for session --end');
        }
      } else {
        console.log('Usage: analytics session --start --user=<id> OR analytics session --end --id=<session-id>');
      }
      break;
    }

    case 'report': {
      const { AnalyticsReporter } = await import('../analytics/analytics-reporter.js');
      const reporter = new AnalyticsReporter(cwd);

      const type = typeof params['type'] === 'string' ? params['type'] : 'weekly';
      const format = typeof params['format'] === 'string' ? params['format'] : 'json';
      
      // Default to last 7 days
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const report = await reporter.generateReport({
        type,
        startDate,
        endDate
      });

      console.log(`Report generated (${type}):`);
      console.log(`  Total Events: ${report.metrics.totalEvents}`);
      console.log(`  Total Users: ${report.metrics.totalUsers}`);
      console.log(`  Active Users: ${report.metrics.activeUsers}`);
      break;
    }

    case 'export': {
      const { AnalyticsReporter } = await import('../analytics/analytics-reporter.js');
      const reporter = new AnalyticsReporter(cwd);

      const format = typeof params['format'] === 'string' ? (params['format'] as 'json' | 'csv') : 'json';
      const output = typeof params['output'] === 'string' ? params['output'] : 'analytics-export';
      
      // Generate a report first
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const report = await reporter.generateReport({
        type: 'export',
        startDate,
        endDate
      });

      const outputPath = await reporter.exportReport(report, {
        format,
        filename: output
      });

      console.log(`Exported to: ${outputPath}`);
      break;
    }

    default:
      console.log('Analytics commands:');
      console.log('  track --event=<name> --user=<id> --props=<json>');
      console.log('  session --start --user=<id>');
      console.log('  session --end --id=<session-id>');
      console.log('  report --type=<type> --format=<format>');
      console.log('  export --format=<format> --output=<filename>');
  }
}
