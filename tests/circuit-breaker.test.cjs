/**
 * EZ Tools Tests - Circuit Breaker Unit Tests
 *
 * Tests for CIRCUIT-01: Circuit breaker integration with agent spawns
 * Tests state transitions, persistence, and CircuitBreakerAdapter wrapper
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { createTempProject, cleanup } = require('./helpers.cjs');
const CircuitBreaker = require('../bin/lib/circuit-breaker.cjs');
const { CircuitBreakerAdapter, createAdapter } = require('../bin/lib/assistant-adapter.cjs');

describe('CircuitBreaker (CIRCUIT-01)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => cleanup(tmpDir));

  describe('state transitions', () => {
    test('starts in CLOSED state', () => {
      const breaker = new CircuitBreaker({ cwd: tmpDir });
      assert.strictEqual(breaker.getState(), 'CLOSED', 'should start CLOSED');
    });

    test('transitions to OPEN after failureThreshold failures', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3, cwd: tmpDir, agentType: 'test1' });
      const failingOp = async () => { throw new Error('fail'); };

      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failingOp);
        } catch (err) {
          // Expected
        }
      }

      assert.strictEqual(breaker.getState(), 'OPEN', 'should be OPEN after 3 failures');
    });

    test('transitions to HALF_OPEN after resetTimeout', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeout: 100, cwd: tmpDir, agentType: 'test2' });
      const failingOp = async () => { throw new Error('fail'); };

      // Trigger OPEN state
      try {
        await breaker.execute(failingOp);
      } catch (err) {
        // Expected - 1 failure
      }
      try {
        await breaker.execute(failingOp);
      } catch (err) {
        // Expected - 2 failures, should open
      }

      assert.strictEqual(breaker.getState(), 'OPEN', 'should be OPEN after 2 failures');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next execute should transition to HALF_OPEN then CLOSED on success
      await breaker.execute(async () => 'success');

      assert.strictEqual(breaker.getState(), 'CLOSED', 'should be CLOSED after successful recovery');
    });

    test('rejects requests when OPEN', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 10000, cwd: tmpDir, agentType: 'test3' });
      const failingOp = async () => { throw new Error('fail'); };

      try {
        await breaker.execute(failingOp);
      } catch (err) {
        // Expected
      }

      assert.strictEqual(breaker.getState(), 'OPEN', 'should be OPEN');

      // Should throw immediately
      await assert.rejects(
        () => breaker.execute(async () => 'success'),
        /Circuit breaker is OPEN/
      );
    });
  });

  describe('state persistence', () => {
    test('persists state to circuit-breaker.json', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2, cwd: tmpDir, agentType: 'test-persist' });
      const failingOp = async () => { throw new Error('fail'); };

      try {
        await breaker.execute(failingOp);
      } catch (err) {
        // Expected - 1 failure
      }
      try {
        await breaker.execute(failingOp);
      } catch (err) {
        // Expected - 2 failures, should open
      }

      const stateFile = path.join(tmpDir, '.planning', 'circuit-breaker.json');
      assert.ok(fs.existsSync(stateFile), 'circuit-breaker.json must exist');

      const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      assert.ok('test-persist' in data, 'must have test-persist entry');
      assert.strictEqual(data['test-persist'].state, 'OPEN', 'state must be OPEN');
      assert.strictEqual(data['test-persist'].failures, 2, 'failures must be 2');
    });

    test('loads state from disk on construction', async () => {
      const stateFile = path.join(tmpDir, '.planning', 'circuit-breaker.json');
      fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
      fs.writeFileSync(stateFile, JSON.stringify({
        'test-agent': {
          state: 'OPEN',
          failures: 3,
          successes: 1,
          lastFailureTime: new Date().toISOString()
        }
      }, null, 2));

      const breaker = new CircuitBreaker({ cwd: tmpDir, agentType: 'test-agent' });
      const stats = breaker.getStats();

      assert.strictEqual(stats.state, 'OPEN', 'should load OPEN state');
      assert.strictEqual(stats.failures, 3, 'should load failures count');
      assert.strictEqual(stats.successes, 1, 'should load successes count');
    });

    test('persists state on reset', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1, cwd: tmpDir, agentType: 'test-agent' });

      // Open the circuit
      try {
        await breaker.execute(async () => { throw new Error('fail'); });
      } catch (err) {
        // Expected
      }

      // Reset
      await breaker.reset();

      const stateFile = path.join(tmpDir, '.planning', 'circuit-breaker.json');
      const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

      assert.strictEqual(data['test-agent'].state, 'CLOSED', 'state must be CLOSED after reset');
      assert.strictEqual(data['test-agent'].failures, 0, 'failures must be 0 after reset');
    });
  });

  describe('getStats', () => {
    test('returns complete statistics', () => {
      const breaker = new CircuitBreaker({ failureThreshold: 5, resetTimeout: 60000, cwd: tmpDir, agentType: 'test' });
      const stats = breaker.getStats();

      assert.ok('state' in stats, 'must have state');
      assert.ok('failures' in stats, 'must have failures');
      assert.ok('successes' in stats, 'must have successes');
      assert.ok('failureThreshold' in stats, 'must have failureThreshold');
      assert.ok('resetTimeout' in stats, 'must have resetTimeout');
      assert.ok('lastStateChange' in stats, 'must have lastStateChange');
      assert.ok('agentType' in stats, 'must have agentType');
    });
  });

  describe('CircuitBreakerAdapter', () => {
    test('wraps delegate spawnAgent with breaker', async () => {
      const mockDelegate = {
        name: 'mock',
        spawnAgent: async (type, options) => ({ type, status: 'success' }),
        callTool: async () => ({}),
        selectModel: () => 'model',
        getInfo: () => ({ name: 'mock' })
      };

      const breaker = new CircuitBreaker({ cwd: tmpDir });
      const wrapped = new CircuitBreakerAdapter(mockDelegate, breaker);

      const result = await wrapped.spawnAgent('test', {});
      assert.strictEqual(result.status, 'success', 'should return delegate result');
    });

    test('breaker state reflected in getInfo', async () => {
      const mockDelegate = {
        name: 'mock',
        spawnAgent: async () => ({}),
        callTool: async () => ({}),
        selectModel: () => 'model',
        getInfo: () => ({ name: 'mock' })
      };

      const breaker = new CircuitBreaker({ cwd: tmpDir });
      const wrapped = new CircuitBreakerAdapter(mockDelegate, breaker);

      const info = await wrapped.getInfo();
      assert.ok('circuitBreaker' in info, 'must have circuitBreaker info');
      assert.strictEqual(info.circuitBreaker.state, 'CLOSED', 'breaker state must be CLOSED');
    });
  });

  describe('createAdapter with circuit breaker', () => {
    test('wraps adapter with CircuitBreakerAdapter by default', () => {
      const adapter = createAdapter('claude-code', { cwd: tmpDir });
      assert.ok(adapter instanceof CircuitBreakerAdapter, 'should return CircuitBreakerAdapter');
    });

    test('returns plain adapter when circuitBreaker: false', () => {
      const adapter = createAdapter('claude-code', { circuitBreaker: false });
      assert.ok(!(adapter instanceof CircuitBreakerAdapter), 'should return plain adapter');
    });
  });
});
