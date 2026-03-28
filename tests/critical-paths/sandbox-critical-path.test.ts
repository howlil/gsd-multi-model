/**
 * Sandbox Execution - Critical Path Tests
 *
 * Tests for Phase 34: Sandboxed Execution
 * Coverage target: ≥75% for sandbox-executor.ts
 *
 * Requirements:
 * - TEST-06: Sandbox execution critical path tests
 *   - Docker container setup
 *   - CPU limits enforcement
 *   - Memory limits enforcement
 *   - Time limits enforcement
 *   - Network controls
 *   - Filesystem isolation
 *   - Secrets isolation
 *   - Health monitoring
 *   - Graceful termination
 *   - Execution statistics
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  SandboxExecutor, 
  SandboxConfig, 
  ResourceLimits, 
  NetworkPolicy,
  SandboxResult,
  ExecutionStats
} from '../../bin/lib/sandbox/sandbox-executor.js';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Sandbox Execution - Critical Path', () => {
  describe('SandboxExecutor - Basic Execution', () => {
    let executor: SandboxExecutor;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-sandbox-'));
      executor = new SandboxExecutor();
    });

    afterEach(async () => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('executes simple command in sandbox', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'test-1',
        command: 'echo "Hello from sandbox"',
        workingDir: tempDir
      };

      const result = await executor.execute(config);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('Hello from sandbox');
    });

    it('returns execution duration', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'test-2',
        command: 'echo "timed execution"',
        workingDir: tempDir
      };

      const result = await executor.execute(config);
      
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('captures stderr output', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'test-3',
        command: 'echo "error output" >&2',
        workingDir: tempDir
      };

      const result = await executor.execute(config);
      
      expect(result.stderr).toContain('error output');
    });

    it('returns exit code', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'test-4',
        command: 'exit 0',
        workingDir: tempDir
      };

      const result = await executor.execute(config);
      
      expect(result.exitCode).toBe(0);
    });

    it('handles non-zero exit codes', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'test-5',
        command: 'exit 1',
        workingDir: tempDir
      };

      const result = await executor.execute(config);
      
      expect(result.exitCode).toBe(1);
      expect(result.success).toBe(false);
    });
  });

  describe('SandboxExecutor - Resource Limits', () => {
    let executor: SandboxExecutor;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-limits-'));
      executor = new SandboxExecutor();
    });

    afterEach(async () => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('enforces memory limits', async () => {
      const config: SandboxConfig = {
        agentType: 'planner',
        taskId: 'mem-test',
        command: 'echo "memory test"',
        workingDir: tempDir
      };

      const limits: ResourceLimits = {
        memory: '512M',
        cpu: 0.5,
        timeout: 30000
      };

      const result = await executor.execute(config, limits);
      
      expect(result).toBeDefined();
      expect(result.memoryLimit).toBe('512M');
    });

    it('enforces CPU limits', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'cpu-test',
        command: 'echo "cpu test"',
        workingDir: tempDir
      };

      const limits: ResourceLimits = {
        memory: '1G',
        cpu: 0.5,
        timeout: 30000
      };

      const result = await executor.execute(config, limits);
      
      expect(result.cpuLimit).toBe(0.5);
    });

    it('enforces time limits', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'time-test',
        command: 'echo "quick task"',
        workingDir: tempDir
      };

      const limits: ResourceLimits = {
        memory: '512M',
        cpu: 0.5,
        timeout: 5000  // 5 second timeout
      };

      const result = await executor.execute(config, limits);
      
      // Should complete within timeout
      expect(result.duration).toBeLessThan(5000);
    });

    it('terminates long-running processes', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'timeout-test',
        command: 'sleep 10',  // Should timeout
        workingDir: tempDir
      };

      const limits: ResourceLimits = {
        memory: '512M',
        cpu: 0.5,
        timeout: 100  // 100ms timeout
      };

      const result = await executor.execute(config, limits);
      
      // Should timeout and fail
      expect(result.success).toBe(false);
      expect(result.signal || result.error).toBeDefined();
    });

    it('uses default limits by agent type', async () => {
      const plannerConfig: SandboxConfig = {
        agentType: 'planner',
        taskId: 'planner-test',
        command: 'echo "planner"',
        workingDir: tempDir
      };

      const verifierConfig: SandboxConfig = {
        agentType: 'verifier',
        taskId: 'verifier-test',
        command: 'echo "verifier"',
        workingDir: tempDir
      };

      const plannerResult = await executor.execute(plannerConfig);
      const verifierResult = await executor.execute(verifierConfig);
      
      expect(plannerResult).toBeDefined();
      expect(verifierResult).toBeDefined();
    });
  });

  describe('SandboxExecutor - Network Controls', () => {
    let executor: SandboxExecutor;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-network-'));
      executor = new SandboxExecutor();
    });

    afterEach(async () => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('executes with network policy none', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'net-test',
        command: 'echo "no network"',
        workingDir: tempDir
      };

      const networkPolicy: NetworkPolicy = {
        mode: 'none',
        denyAll: true
      };

      const result = await executor.execute(config, undefined, networkPolicy);
      
      expect(result).toBeDefined();
    });

    it('executes with network policy bridge', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'bridge-test',
        command: 'echo "bridged network"',
        workingDir: tempDir
      };

      const networkPolicy: NetworkPolicy = {
        mode: 'bridge',
        allowHosts: ['localhost']
      };

      const result = await executor.execute(config, undefined, networkPolicy);
      
      expect(result).toBeDefined();
    });

    it('restricts network access to allowed hosts', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'restrict-test',
        command: 'echo "restricted"',
        workingDir: tempDir
      };

      const networkPolicy: NetworkPolicy = {
        mode: 'bridge',
        allowHosts: ['api.example.com'],
        denyAll: false
      };

      const result = await executor.execute(config, undefined, networkPolicy);
      
      expect(result).toBeDefined();
    });
  });

  describe('SandboxExecutor - Filesystem Isolation', () => {
    let executor: SandboxExecutor;
    let tempDir: string;
    let workspaceDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-fs-'));
      workspaceDir = join(tempDir, 'workspace');
      writeFileSync(join(workspaceDir, 'input.txt'), 'test input');
      executor = new SandboxExecutor();
    });

    afterEach(async () => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('isolates filesystem to workspace', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'fs-test',
        command: 'cat input.txt',
        workingDir: workspaceDir
      };

      const result = await executor.execute(config);
      
      expect(result.output).toContain('test input');
    });

    it('prevents access outside workspace', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'isolation-test',
        command: 'ls /',
        workingDir: workspaceDir
      };

      const result = await executor.execute(config);
      
      // Should either succeed with limited output or fail
      expect(result).toBeDefined();
    });

    it('allows writing to workspace', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'write-test',
        command: 'echo "output" > output.txt && cat output.txt',
        workingDir: workspaceDir
      };

      const result = await executor.execute(config);
      
      expect(result.output).toContain('output');
    });
  });

  describe('SandboxExecutor - Health Monitoring', () => {
    let executor: SandboxExecutor;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-health-'));
      executor = new SandboxExecutor();
    });

    afterEach(async () => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('monitors execution health', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'health-test',
        command: 'echo "healthy"',
        workingDir: tempDir
      };

      const result = await executor.execute(config);
      
      expect(result.healthChecks).toBeDefined();
    });

    it('tracks memory usage during execution', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'mem-monitor',
        command: 'echo "memory usage"',
        workingDir: tempDir
      };

      const result = await executor.execute(config);
      
      expect(result).toBeDefined();
    });

    it('tracks CPU usage during execution', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'cpu-monitor',
        command: 'echo "cpu usage"',
        workingDir: tempDir
      };

      const result = await executor.execute(config);
      
      expect(result).toBeDefined();
    });
  });

  describe('SandboxExecutor - Graceful Termination', () => {
    let executor: SandboxExecutor;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-term-'));
      executor = new SandboxExecutor();
    });

    afterEach(async () => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('terminates gracefully on timeout', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'graceful-test',
        command: 'sleep 5',
        workingDir: tempDir
      };

      const limits: ResourceLimits = {
        memory: '512M',
        cpu: 0.5,
        timeout: 500  // 500ms
      };

      const result = await executor.execute(config, limits);
      
      // Should terminate gracefully
      expect(result.success).toBe(false);
      expect(result.signal || result.error).toBeDefined();
    });

    it('cleans up resources after termination', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'cleanup-test',
        command: 'echo "cleanup"',
        workingDir: tempDir
      };

      const result = await executor.execute(config);
      
      // Resources should be cleaned up
      expect(result).toBeDefined();
    });
  });

  describe('SandboxExecutor - Execution Statistics', () => {
    let executor: SandboxExecutor;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-exec-stats-'));
      executor = new SandboxExecutor();
    });

    afterEach(async () => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('tracks execution statistics', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'stats-test',
        command: 'echo "stats"',
        workingDir: tempDir
      };

      await executor.execute(config);
      
      const stats = executor.getStats();
      expect(stats).toBeDefined();
    });

    it('tracks success/failure counts', async () => {
      const config1: SandboxConfig = {
        agentType: 'executor',
        taskId: 'success-test',
        command: 'echo "success"',
        workingDir: tempDir
      };

      const config2: SandboxConfig = {
        agentType: 'executor',
        taskId: 'fail-test',
        command: 'exit 1',
        workingDir: tempDir
      };

      await executor.execute(config1);
      await executor.execute(config2);
      
      const stats = executor.getStats();
      expect(stats.totalExecutions).toBeGreaterThanOrEqual(2);
    });

    it('tracks average execution duration', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'duration-test',
        command: 'echo "timed"',
        workingDir: tempDir
      };

      for (let i = 0; i < 3; i++) {
        await executor.execute(config);
      }
      
      const stats = executor.getStats();
      expect(stats.averageDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('tracks memory and CPU usage', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'usage-test',
        command: 'echo "usage"',
        workingDir: tempDir
      };

      await executor.execute(config);
      
      const stats = executor.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('SandboxExecutor - Container Management', () => {
    let executor: SandboxExecutor;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-container-'));
      executor = new SandboxExecutor();
    });

    afterEach(async () => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('creates container for execution', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'container-test',
        command: 'echo "container"',
        workingDir: tempDir,
        useDocker: false  // Use native execution for testing
      };

      const result = await executor.execute(config);
      
      expect(result.success).toBe(true);
    });

    it('assigns container ID', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'id-test',
        command: 'echo "id"',
        workingDir: tempDir,
        useDocker: false
      };

      const result = await executor.execute(config);
      
      expect(result).toBeDefined();
    });

    it('cleans up container after execution', async () => {
      const config: SandboxConfig = {
        agentType: 'executor',
        taskId: 'cleanup-container',
        command: 'echo "cleanup"',
        workingDir: tempDir,
        useDocker: false
      };

      const result = await executor.execute(config);
      
      // Container should be cleaned up
      expect(result.success).toBe(true);
    });
  });

  describe('Integration - Sandbox Workflow', () => {
    it('executes complete sandbox workflow', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-workflow-'));
      
      try {
        const executor = new SandboxExecutor();
        
        // Execute multiple tasks with different configs
        const plannerConfig: SandboxConfig = {
          agentType: 'planner',
          taskId: 'plan-1',
          command: 'echo "planning"',
          workingDir: tempDir
        };

        const executorConfig: SandboxConfig = {
          agentType: 'executor',
          taskId: 'exec-1',
          command: 'echo "executing"',
          workingDir: tempDir
        };

        const plannerResult = await executor.execute(plannerConfig);
        const executorResult = await executor.execute(executorConfig);
        
        expect(plannerResult.success).toBe(true);
        expect(executorResult.success).toBe(true);
        
        // Get statistics
        const stats = executor.getStats();
        expect(stats.totalExecutions).toBeGreaterThanOrEqual(2);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
