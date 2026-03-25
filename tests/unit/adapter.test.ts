const { test, describe } = require('node:test');
import assert from 'node:assert';
import { 
  AssistantAdapter, 
  ClaudeCodeAdapter, 
  OpenCodeAdapter, 
  GeminiAdapter, 
  CodexAdapter, 
  createAdapter, 
  getAvailableAdapters 
} from '../../ez-agents/bin/lib/assistant-adapter.js';

describe('Assistant Adapters', () => {
  test('AssistantAdapter is abstract', () => {
    assert.throws(() => new AssistantAdapter('test'), {
      message: 'AssistantAdapter is abstract - use a concrete subclass'
    });
  });

  test('ClaudeCodeAdapter implementation', () => {
    const adapter = new ClaudeCodeAdapter();
    assert.strictEqual(adapter.name, 'claude-code');
    assert.strictEqual(adapter.selectModel('planning'), 'claude-3-opus');
    assert.strictEqual(adapter.selectModel('execution'), 'claude-3-sonnet');
  });

  test('OpenCodeAdapter implementation', () => {
    const adapter = new OpenCodeAdapter();
    assert.strictEqual(adapter.name, 'opencode');
    assert.strictEqual(adapter.selectModel('planning'), 'gpt-4-turbo');
  });

  test('GeminiAdapter implementation', () => {
    const adapter = new GeminiAdapter();
    assert.strictEqual(adapter.name, 'gemini');
    assert.strictEqual(adapter.selectModel('any'), 'gemini-pro');
  });

  test('CodexAdapter implementation', () => {
    const adapter = new CodexAdapter();
    assert.strictEqual(adapter.name, 'codex');
    assert.strictEqual(adapter.selectModel('any'), 'codex-latest');
  });

  test('createAdapter factory', () => {
    const adapter = createAdapter('claude-code');
    assert.ok(adapter instanceof ClaudeCodeAdapter);
    
    assert.throws(() => createAdapter('unknown'), {
      message: /Unknown adapter type: unknown/
    });
  });

  test('getAvailableAdapters returns list', () => {
    const adapters = getAvailableAdapters();
    assert.ok(Array.isArray(adapters));
    assert.ok(adapters.includes('claude-code'));
    assert.ok(adapters.includes('gemini'));
  });

  test('Adapter spawnAgent (mock)', async () => {
    const adapter = new ClaudeCodeAdapter();
    const result = await adapter.spawnAgent('planner', { prompt: 'test' });
    assert.strictEqual(result.status, 'completed');
    assert.ok(result.result.includes('Claude Code agent result'));
  });
});
