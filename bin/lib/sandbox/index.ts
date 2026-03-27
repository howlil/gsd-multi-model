/**
 * Sandbox Module — Sandboxed execution for agent isolation
 *
 * Provides resource isolation, network controls, and secret management
 * for secure parallel agent execution.
 *
 * @module sandbox
 */

export {
  executeInSandbox,
  getSandboxStatus,
  type SandboxConfig,
  type SandboxResult,
  type ResourceLimits
} from './sandbox-executor.js';

export {
  isCgroupAvailable,
  getCgroupVersion,
  initCgroupHierarchy,
  createCgroup,
  deleteCgroup,
  getCgroupStats,
  runInCgroup,
  type CgroupConfig,
  type CgroupStats
} from './cgroup-manager.js';

export {
  getDefaultPolicy,
  loadPolicies,
  savePolicies,
  isUrlAllowed,
  logNetworkRequest,
  createFetchWrapper,
  initNetworkPolicy,
  getPolicySummary,
  type NetworkPolicy,
  type NetworkRequest
} from './network-policy.js';

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
