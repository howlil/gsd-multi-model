#!/usr/bin/env node

/**
 * Analyze Dependency Audit Trends
 *
 * Reads audit results and maintains trend data for monthly reporting.
 * Helps identify patterns in vulnerability introduction and resolution.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const TRENDS_FILE = join(process.cwd(), '.planning', 'audit-trends.json');
const AUDIT_FILE = join(process.cwd(), 'audit-results.json');

/**
 * Main analysis function
 */
function analyzeTrends() {
  console.log('Analyzing dependency audit trends...\n');
  
  // Read current audit results
  let audit;
  try {
    audit = JSON.parse(readFileSync(AUDIT_FILE, 'utf8'));
  } catch (err) {
    console.error('Failed to read audit results:', err.message);
    process.exit(1);
  }
  
  // Load existing trends
  let trends = loadTrends();
  
  // Add new data point
  const dataPoint = {
    date: new Date().toISOString(),
    total: audit.metadata?.total || 0,
    info: countBySeverity(audit.vulnerabilities, 'info'),
    low: countBySeverity(audit.vulnerabilities, 'low'),
    moderate: countBySeverity(audit.vulnerabilities, 'moderate'),
    high: countBySeverity(audit.vulnerabilities, 'high'),
    critical: countBySeverity(audit.vulnerabilities, 'critical'),
    dependencies: countDependencies()
  };
  
  trends.history.push(dataPoint);
  
  // Keep only last 12 months
  if (trends.history.length > 12) {
    trends.history = trends.history.slice(-12);
  }
  
  // Calculate trends
  trends.summary = calculateSummary(trends.history);
  trends.averages = calculateAverages(trends.history);
  
  // Save updated trends
  saveTrends(trends);
  
  // Print report
  printReport(dataPoint, trends.summary);
}

/**
 * Load existing trends from file
 */
function loadTrends() {
  try {
    if (existsSync(TRENDS_FILE)) {
      return JSON.parse(readFileSync(TRENDS_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('Failed to load trends, starting fresh:', err.message);
  }
  
  return {
    history: [],
    summary: {},
    averages: {}
  };
}

/**
 * Save trends to file
 */
function saveTrends(trends) {
  try {
    const dir = join(process.cwd(), '.planning');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(TRENDS_FILE, JSON.stringify(trends, null, 2), 'utf8');
    console.log('✓ Trends saved to', TRENDS_FILE);
  } catch (err) {
    console.error('Failed to save trends:', err.message);
  }
}

/**
 * Count vulnerabilities by severity
 */
function countBySeverity(vulnerabilities, severity) {
  if (!vulnerabilities) return 0;
  return vulnerabilities.filter(v => v.severity === severity).length;
}

/**
 * Count total dependencies
 */
function countDependencies() {
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    return Object.keys(pkg.dependencies || {}).length + 
           Object.keys(pkg.devDependencies || {}).length;
  } catch (err) {
    return 0;
  }
}

/**
 * Calculate summary statistics
 */
function calculateSummary(history) {
  if (history.length === 0) return {};
  
  const latest = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : null;
  
  return {
    currentTotal: latest.total,
    changeFromLast: previous ? latest.total - previous.total : 0,
    trend: previous ? (latest.total > previous.total ? 'increasing' : latest.total < previous.total ? 'decreasing' : 'stable') : 'unknown',
    highCritical: latest.high + latest.critical,
    monthsTracked: history.length
  };
}

/**
 * Calculate average vulnerabilities
 */
function calculateAverages(history) {
  if (history.length === 0) return {};
  
  const sum = history.reduce((acc, dp) => ({
    total: acc.total + dp.total,
    info: acc.info + dp.info,
    low: acc.low + dp.low,
    moderate: acc.moderate + dp.moderate,
    high: acc.high + dp.high,
    critical: acc.critical + dp.critical
  }), { total: 0, info: 0, low: 0, moderate: 0, high: 0, critical: 0 });
  
  const count = history.length;
  
  return {
    avgTotal: Math.round(sum.total / count * 10) / 10,
    avgHighCritical: Math.round((sum.high + sum.critical) / count * 10) / 10
  };
}

/**
 * Print analysis report
 */
function printReport(dataPoint, summary) {
  console.log('\n=== Dependency Audit Trends ===\n');
  console.log(`Date: ${dataPoint.date.split('T')[0]}`);
  console.log(`Total dependencies: ${dataPoint.dependencies}`);
  console.log('');
  console.log('Vulnerabilities:');
  console.log(`  Critical: ${dataPoint.critical}`);
  console.log(`  High:     ${dataPoint.high}`);
  console.log(`  Moderate: ${dataPoint.moderate}`);
  console.log(`  Low:      ${dataPoint.low}`);
  console.log(`  Info:     ${dataPoint.info}`);
  console.log(`  ─────────────────`);
  console.log(`  Total:    ${dataPoint.total}`);
  console.log('');
  
  if (summary.changeFromLast !== undefined) {
    const change = summary.changeFromLast;
    const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
    console.log(`Change from last month: ${arrow} ${Math.abs(change)}`);
  }
  
  console.log(`Trend: ${summary.trend}`);
  console.log(`Months tracked: ${summary.monthsTracked}`);
  console.log('');
  
  if (dataPoint.high + dataPoint.critical > 0) {
    console.log('⚠️  ACTION REQUIRED: High/critical vulnerabilities found!');
    console.log('   Check GitHub issue created by monthly-audit workflow.');
  } else {
    console.log('✓ No high/critical vulnerabilities');
  }
  console.log('');
}

// Run analysis
analyzeTrends();
