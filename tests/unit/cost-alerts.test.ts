/**
 * EZ Tools Tests - CostAlerts Unit Tests
 *
 * Tests for COST-02: Multi-threshold budget alert system
 * Tests threshold checking, alert logging, and duplicate prevention
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
import assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';
import { createTempProject, cleanup } from '../helpers.js';
import CostAlerts from '../bin/lib/cost-alerts.js';

describe('CostAlerts (COST-02)', () => {
  let tmpDir, alerts;

  beforeEach(() => {
    tmpDir = createTempProject();
    alerts = new CostAlerts(tmpDir);
  });

  afterEach(() => cleanup(tmpDir));

  describe('checkThresholds', () => {
    test('returns empty array when percentUsed below all thresholds', () => {
      const triggered = alerts.checkThresholds({ percentUsed: 30, totalSpent: 1.50, budget: 5.00 });
      assert.strictEqual(triggered.length, 0, 'should not trigger any alerts below 50%');
    });

    test('returns info alert when percentUsed >= 50%', () => {
      const triggered = alerts.checkThresholds({ percentUsed: 50, totalSpent: 2.50, budget: 5.00 });
      assert.strictEqual(triggered.length, 1, 'should trigger 1 alert at 50%');
      assert.strictEqual(triggered[0].level, 'info', 'level should be info');
      assert.strictEqual(triggered[0].threshold, 50, 'threshold should be 50');
    });

    test('returns info and warning alerts when percentUsed >= 75%', () => {
      const triggered = alerts.checkThresholds({ percentUsed: 75, totalSpent: 3.75, budget: 5.00 });
      assert.strictEqual(triggered.length, 2, 'should trigger 2 alerts at 75%');
      assert.strictEqual(triggered[0].level, 'info', 'first alert should be info');
      assert.strictEqual(triggered[1].level, 'warning', 'second alert should be warning');
    });

    test('returns all three alerts when percentUsed >= 90%', () => {
      const triggered = alerts.checkThresholds({ percentUsed: 90, totalSpent: 4.50, budget: 5.00 });
      assert.strictEqual(triggered.length, 3, 'should trigger 3 alerts at 90%');
      assert.strictEqual(triggered[0].level, 'info', 'first alert should be info');
      assert.strictEqual(triggered[1].level, 'warning', 'second alert should be warning');
      assert.strictEqual(triggered[2].level, 'critical', 'third alert should be critical');
    });

    test('alert object contains all required fields', () => {
      const triggered = alerts.checkThresholds({ percentUsed: 80, totalSpent: 4.00, budget: 5.00 });
      const alert = triggered.find(a => a.level === 'warning');
      assert.ok(alert, 'should have warning alert');
      assert.ok('threshold' in alert, 'alert must have threshold field');
      assert.ok('level' in alert, 'alert must have level field');
      assert.ok('percentUsed' in alert, 'alert must have percentUsed field');
      assert.ok('totalSpent' in alert, 'alert must have totalSpent field');
      assert.ok('budget' in alert, 'alert must have budget field');
      assert.ok('message' in alert, 'alert must have message field');
      assert.ok('timestamp' in alert, 'alert must have timestamp field');
    });
  });

  describe('logAlert', () => {
    test('writes alert to alerts.json', async () => {
      const alert = {
        threshold: 50,
        level: 'info',
        percentUsed: 50,
        totalSpent: 2.50,
        budget: 5.00,
        message: 'Test alert',
        timestamp: new Date().toISOString()
      };

      await alerts.logAlert(alert);

      const alertsPath = path.join(tmpDir, '.planning', 'alerts.json');
      assert.ok(fs.existsSync(alertsPath), 'alerts.json must exist after logAlert');

      const data = JSON.parse(fs.readFileSync(alertsPath, 'utf8'));
      assert.ok(Array.isArray(data.alerts), 'alerts.json must have alerts array');
      assert.strictEqual(data.alerts.length, 1, 'alerts array must have 1 entry');
      assert.strictEqual(data.alerts[0].threshold, 50, 'alert threshold must be 50');
      assert.strictEqual(data.alerts[0].level, 'info', 'alert level must be info');
    });

    test('prevents duplicate alerts within 24 hours', async () => {
      const alert = {
        threshold: 50,
        level: 'info',
        percentUsed: 50,
        totalSpent: 2.50,
        budget: 5.00,
        message: 'Test alert',
        timestamp: new Date().toISOString()
      };

      await alerts.logAlert(alert);
      await alerts.logAlert(alert); // Try to log same alert again

      const alertsPath = path.join(tmpDir, '.planning', 'alerts.json');
      const data = JSON.parse(fs.readFileSync(alertsPath, 'utf8'));
      assert.strictEqual(data.alerts.length, 1, 'should prevent duplicate alert');
    });

    test('allows different threshold alerts', async () => {
      const infoAlert = {
        threshold: 50,
        level: 'info',
        percentUsed: 50,
        totalSpent: 2.50,
        budget: 5.00,
        message: 'Info alert',
        timestamp: new Date().toISOString()
      };

      const warningAlert = {
        threshold: 75,
        level: 'warning',
        percentUsed: 75,
        totalSpent: 3.75,
        budget: 5.00,
        message: 'Warning alert',
        timestamp: new Date().toISOString()
      };

      await alerts.logAlert(infoAlert);
      await alerts.logAlert(warningAlert);

      const alertsPath = path.join(tmpDir, '.planning', 'alerts.json');
      const data = JSON.parse(fs.readFileSync(alertsPath, 'utf8'));
      assert.strictEqual(data.alerts.length, 2, 'should allow different threshold alerts');
    });
  });

  describe('getAlerts', () => {
    test('returns empty array when no alerts exist', () => {
      const retrieved = alerts.getAlerts();
      assert.strictEqual(retrieved.length, 0, 'should return empty array when no alerts');
    });

    test('returns all alerts after logging', async () => {
      const alert = {
        threshold: 50,
        level: 'info',
        percentUsed: 50,
        totalSpent: 2.50,
        budget: 5.00,
        message: 'Test alert',
        timestamp: new Date().toISOString()
      };

      await alerts.logAlert(alert);
      const retrieved = alerts.getAlerts();

      assert.strictEqual(retrieved.length, 1, 'should return 1 alert');
      assert.strictEqual(retrieved[0].threshold, 50, 'alert threshold must match');
    });
  });

  describe('getAlertsByLevel', () => {
    test('filters alerts by level', async () => {
      const infoAlert = {
        threshold: 50,
        level: 'info',
        percentUsed: 50,
        totalSpent: 2.50,
        budget: 5.00,
        message: 'Info alert',
        timestamp: new Date().toISOString()
      };

      const warningAlert = {
        threshold: 75,
        level: 'warning',
        percentUsed: 75,
        totalSpent: 3.75,
        budget: 5.00,
        message: 'Warning alert',
        timestamp: new Date().toISOString()
      };

      await alerts.logAlert(infoAlert);
      await alerts.logAlert(warningAlert);

      const infoAlerts = alerts.getAlertsByLevel('info');
      const warningAlerts = alerts.getAlertsByLevel('warning');

      assert.strictEqual(infoAlerts.length, 1, 'should have 1 info alert');
      assert.strictEqual(warningAlerts.length, 1, 'should have 1 warning alert');
    });
  });

  describe('THRESHOLDS constant', () => {
    test('exports correct threshold values', () => {
      assert.strictEqual(CostAlerts.THRESHOLDS.INFO, 50, 'INFO threshold should be 50');
      assert.strictEqual(CostAlerts.THRESHOLDS.WARNING, 75, 'WARNING threshold should be 75');
      assert.strictEqual(CostAlerts.THRESHOLDS.CRITICAL, 90, 'CRITICAL threshold should be 90');
    });
  });
});
