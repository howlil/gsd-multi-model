/**
 * Sandbox Module — Docker-based sandboxed execution for agent isolation
 *
 * Provides resource isolation, network controls, and secret management
 * for secure parallel agent execution.
 *
 * Features:
 * - SANDBOX-01: Docker container setup
 * - SANDBOX-02: CPU limits
 * - SANDBOX-03: Memory limits
 * - SANDBOX-04: Time limits
 * - SANDBOX-05: Network controls
 * - SANDBOX-06: Filesystem isolation
 * - SANDBOX-07: Secrets isolation
 * - SANDBOX-08: Health monitoring
 * - SANDBOX-09: Graceful termination
 * - SANDBOX-10: Image management
 * - SANDBOX-11: Local dev mode
 * - SANDBOX-12: Execution statistics
 *
 * @module sandbox
 */

// ============================================================================
// Sandbox Executor — Main execution interface
// ============================================================================
export {
  executeInSandbox,
  getSandboxStatus,
  isDockerAvailable,
  hasDockerImage,
  ensureDockerImage,
  buildDockerImage,
  removeDockerImage,
  listDockerImages,
  stopContainer,
  removeContainer,
  setupGracefulShutdown,
  performHealthCheck,
  monitorHealth,
  recordExecutionStats,
  getExecutionStats,
  getAggregateStats,
  type SandboxConfig,
  type SandboxResult,
  type ResourceLimits,
  type NetworkPolicy,
  type HealthCheckResult,
  type ExecutionStats
} from './sandbox-executor.js';

// ============================================================================
// Cgroup Manager — Resource limits (Linux native + Docker)
// ============================================================================
export {
  isCgroupAvailable,
  getCgroupVersion,
  initCgroupHierarchy,
  createCgroup,
  deleteCgroup,
  getCgroupStats,
  runInCgroup,
  buildDockerRunCommand,
  getContainerResourceUsage,
  monitorContainerResources,
  memoryToBytes,
  bytesToMemory,
  validateResourceLimits,
  getDefaultLimits,
  type CgroupConfig,
  type CgroupStats,
  type DockerResourceLimits,
  type ResourceUsage
} from './cgroup-manager.js';

// ============================================================================
// Network Policy — Network access control
// ============================================================================
export {
  getDefaultPolicy,
  loadPolicies,
  savePolicies,
  isUrlAllowed,
  logNetworkRequest,
  createFetchWrapper,
  initNetworkPolicy,
  getPolicySummary,
  getAllPoliciesSummary,
  getNetworkAuditLog,
  createDockerNetwork,
  removeDockerNetwork,
  listDockerNetworks,
  getDockerNetworkDetails,
  connectContainerToNetwork,
  disconnectContainerFromNetwork,
  getNetworkStats,
  clearAuditLog,
  getDockerNetworkMode,
  buildDockerNetworkArgs,
  type NetworkPolicy as NetworkPolicyConfig,
  type NetworkRequest,
  type NetworkStats,
  type DockerNetworkConfig
} from './network-policy.js';

// ============================================================================
// Secrets Manager — Secure secret injection
// ============================================================================
export {
  initSecretsDir,
  storeSecret,
  injectSecrets,
  cleanupSecrets,
  deleteSecret,
  listSecrets,
  getSecretAuditLog,
  validateSecretAccess,
  type SecretConfig,
  type SecretInjection
} from './secrets-manager.js';

// ============================================================================
// Workspace Manager — Ephemeral workspace management
// ============================================================================
export {
  initWorkspaceBase,
  createWorkspace,
  cleanupWorkspace,
  getWorkspaceInfo,
  listWorkspaces,
  getWorkspaceUsage,
  cleanupOldWorkspaces,
  type WorkspaceConfig,
  type WorkspaceInfo
} from './workspace-manager.js';

// ============================================================================
// Module Constants
// ============================================================================

/**
 * Sandbox module version
 */
export const SANDBOX_VERSION = '1.0.0';

/**
 * Supported sandbox modes
 */
export enum SandboxMode {
  DOCKER = 'docker',
  CGROUP = 'cgroup',
  LOCAL = 'local'
}

/**
 * Agent types supported by sandbox
 */
export enum AgentType {
  PLANNER = 'planner',
  EXECUTOR = 'executor',
  VERIFIER = 'verifier',
  RESEARCHER = 'researcher'
}

/**
 * Default sandbox configuration
 */
export const DEFAULT_SANDBOX_CONFIG = {
  docker: {
    enabled: true,
    image: 'ez-agents/agent-runner:latest',
    networkMode: 'none',
    removeOnExit: true
  },
  resources: {
    defaultCpu: 0.5,
    defaultMemory: '1G',
    defaultPids: 50,
    defaultTimeout: 60000
  },
  health: {
    enabled: true,
    intervalMs: 10000,
    timeoutMs: 5000
  },
  stats: {
    enabled: true,
    retentionMs: 86400000  // 24 hours
  }
};

/**
 * Get default resource limits for agent type
 */
export function getDefaultResourceLimits(agentType: string): ResourceLimits {
  const limits: Record<string, ResourceLimits> = {
    [AgentType.PLANNER]: { memory: '1G', cpu: 0.5, timeout: 60000, pids: 50 },
    [AgentType.EXECUTOR]: { memory: '1.5G', cpu: 1, timeout: 120000, pids: 100 },
    [AgentType.VERIFIER]: { memory: '512M', cpu: 0.25, timeout: 60000, pids: 25 },
    [AgentType.RESEARCHER]: { memory: '1G', cpu: 0.5, timeout: 180000, pids: 50, shmSize: '64m' }
  };

  return limits[agentType] || limits[AgentType.EXECUTOR];
}

/**
 * Get default network policy for agent type
 */
export function getDefaultNetworkPolicy(agentType: string): NetworkPolicy {
  const policies: Record<string, NetworkPolicy> = {
    [AgentType.PLANNER]: { mode: 'none' as const, allow: [], deny: ['all'], logAll: false },
    [AgentType.EXECUTOR]: { mode: 'none' as const, allow: [], deny: ['all'], logAll: false },
    [AgentType.VERIFIER]: { mode: 'none' as const, allow: [], deny: ['all'], logAll: false },
    [AgentType.RESEARCHER]: {
      mode: 'bridge' as const,
      allow: [
        'registry.npmjs.org',
        'github.com',
        'raw.githubusercontent.com',
        'api.openai.com',
        'api.anthropic.com',
        'api.qwen.ai',
        'api.kimi.ai'
      ],
      deny: [],
      logAll: true
    }
  };

  return policies[agentType] || policies[AgentType.EXECUTOR];
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick sandbox execution with defaults
 */
export async function quickSandboxExecute(
  command: string,
  agentType: string = 'executor',
  taskId?: string
): Promise<SandboxResult> {
  const id = taskId || `quick-${Date.now()}`;

  return executeInSandbox({
    agentType: agentType as any,
    taskId: id,
    command,
    useDocker: await isDockerAvailable()
  });
}

/**
 * Check sandbox readiness
 */
export async function checkSandboxReadiness(): Promise<{
  ready: boolean;
  docker: boolean;
  cgroup: boolean;
  image: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  const dockerAvailable = await isDockerAvailable();
  const cgroupAvailable = isCgroupAvailable();
  let imageAvailable = false;

  if (dockerAvailable) {
    imageAvailable = await hasDockerImage();
    if (!imageAvailable) {
      issues.push('Docker image not found. Run: docker build -f Dockerfile.agent -t ez-agents/agent-runner:latest .');
    }
  } else {
    issues.push('Docker not available. Falling back to local execution.');
  }

  if (!cgroupAvailable && process.platform === 'linux') {
    issues.push('Cgroups not available. Resource limits may not be enforced.');
  }

  return {
    ready: imageAvailable || !dockerAvailable,
    docker: dockerAvailable,
    cgroup: cgroupAvailable,
    image: imageAvailable,
    issues
  };
}
