/**
 * BudgetEnforcer Tests - Updated for TS implementation
 */

import * as path from 'path';
import * as fs from 'fs';
import { BudgetEnforcer } from '../../bin/lib/finops/budget-enforcer.js';

describe('BudgetEnforcer', () => {
  let tmpDir: string;
  let enforcer: BudgetEnforcer;

  beforeEach(() => {
    tmpDir = createTempProject();
    enforcer = new BudgetEnforcer(tmpDir);
  });

  afterEach(() => cleanup(tmpDir));

  test('constructor does not throw', () => {
    expect(enforcer).toBeTruthy();
  });

  test('setBudget() configures spending limit', async () => {
    const result = await enforcer.setBudget({ ceiling: 100, warningThreshold: 80 });
    expect(result).toBeTruthy();
    expect(result.ceiling).toBe(100);
  });

  test('checkBudget() returns status', async () => {
    await enforcer.setBudget({ ceiling: 100 });
    await enforcer.recordSpending({ amount: 50 });
    const status = enforcer.checkBudget();
    expect(status).toBeTruthy();
    expect(status.current).toBeGreaterThanOrEqual(0);
  });

  test('checkBudget() returns warning when near limit', async () => {
    await enforcer.setBudget({ ceiling: 100, warningThreshold: 80 });
    await enforcer.recordSpending({ amount: 85 });
    const status = enforcer.checkBudget();
    expect(status.status).toBe('warning');
  });

  test('checkBudget() returns exceeded when over limit', async () => {
    await enforcer.setBudget({ ceiling: 100 });
    await enforcer.recordSpending({ amount: 120 });
    const status = enforcer.checkBudget();
    expect(status.status).toBe('exceeded');
  });

  test('enforce() blocks when budget exceeded', async () => {
    await enforcer.setBudget({ ceiling: 100 });
    await enforcer.recordSpending({ amount: 150 });
    const result = enforcer.enforce();
    expect(result.allowed).toBeFalsy();
  });

  test('enforce() allows when within budget', async () => {
    await enforcer.setBudget({ ceiling: 100 });
    await enforcer.recordSpending({ amount: 50 });
    const result = enforcer.enforce();
    expect(result.allowed).toBeTruthy();
  });

  test('getSpendingByCategory() returns breakdown', async () => {
    await enforcer.recordSpending({ amount: 50, category: 'api' });
    await enforcer.recordSpending({ amount: 30, category: 'storage' });
    const spending = enforcer.getSpendingByCategory();
    expect(spending.total).toBeGreaterThanOrEqual(0);
  });
});
