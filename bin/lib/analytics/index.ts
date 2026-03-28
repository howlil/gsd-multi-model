#!/usr/bin/env node
/**
 * Analytics module exports
 * 
 * Central export point for all analytics classes and types
 */

export { NPSTracker } from './nps-tracker.js';
export type {
  NpsResponse,
  NpsResult,
  NpsCategory,
  TrendPeriod,
  TrendOptions,
  NpsTrend
} from './nps-tracker.js';

export { AnalyticsCollector } from './analytics-collector.js';
export type {
  EventData,
  AnalyticsEvent,
  SessionOptions,
  Session
} from './analytics-collector.js';

export { AnalyticsReporter } from './analytics-reporter.js';
export type {
  AnalyticsReportOptions,
  AnalyticsReport,
  AggregatedMetrics,
  ExportOptions,
  ScheduleOptions,
  ReportSchedule
} from './analytics-reporter.js';

export { CohortAnalyzer } from './cohort-analyzer.js';
export type {
  CohortDefinition,
  Cohort,
  RetentionPeriod,
  RetentionResult,
  CohortComparison,
  CohortMetrics
} from './cohort-analyzer.js';

export { FunnelAnalyzer } from './funnel-analyzer.js';
export type {
  FunnelStep,
  FunnelDefinition,
  Funnel,
  Conversion,
  ConversionRatesResult,
  DropOffResult,
  FunnelMetrics
} from './funnel-analyzer.js';
