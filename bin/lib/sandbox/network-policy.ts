/**
 * Network Policy Manager — Network access control for sandboxed execution
 *
 * Manages network policies for Docker containers and local execution:
 * - Default-deny policy with explicit allowlists (SANDBOX-05)
 * - Docker network isolation
 * - Host allowlisting for researcher agents
 * - Network request auditing
 *
 * Token overhead: <1ms per request (logging only)
 */

import { writeFileSync, mkdirSync, existsSync, appendFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { defaultLogger as logger } from '../logger/index.js';

const execAsync = promisify(exec);

const POLICY_FILE = join(process.cwd(), '.planning', 'network-policies.json');
const LOG_FILE = join(process.cwd(), '.planning', 'network-audit.log');

// ============================================================================
// Type Definitions
// ============================================================================

export interface NetworkPolicy {
  agentType: string;
  mode: 'none' | 'bridge' | 'host';  // Docker network mode
  allow: string[];                    // Allowed hostnames/URLs
  deny: string[];                     // Denied hostnames/URLs
  logAll: boolean;                    // Log all requests
  maxConnections?: number;            // Max concurrent connections
  timeout?: number;                   // Connection timeout (ms)
}

export interface NetworkRequest {
  taskId: string;
  agentType: string;
  url: string;
  method: string;
  allowed: boolean;
  timestamp: number;
  latency?: number;
  bytesTransferred?: number;
  connectionId?: string;
}

export interface NetworkStats {
  totalRequests: number;
  allowedRequests: number;
  deniedRequests: number;
  uniqueHosts: Set<string>;
  topHosts: Array<{ host: string; count: number }>;
  avgLatency: number;
  totalBytesTransferred: number;
}

export interface DockerNetworkConfig {
  name: string;
  driver: 'bridge' | 'host' | 'none' | 'overlay';
  subnet?: string;
  gateway?: string;
  internal?: boolean;  // No external connectivity
  options?: Record<string, string>;
}

// ============================================================================
// Default Network Policies
// ============================================================================

/**
 * Get default network policy for agent type
 */
export function getDefaultPolicy(agentType: string): NetworkPolicy {
  const policies: Record<string, NetworkPolicy> = {
    'planner': {
      agentType: 'planner',
      mode: 'none',
      allow: [],
      deny: ['all'],
      logAll: false,
      maxConnections: 0,
      timeout: 0
    },
    'executor': {
      agentType: 'executor',
      mode: 'none',
      allow: [],
      deny: ['all'],
      logAll: false,
      maxConnections: 0,
      timeout: 0
    },
    'verifier': {
      agentType: 'verifier',
      mode: 'none',
      allow: [],
      deny: ['all'],
      logAll: false,
      maxConnections: 0,
      timeout: 0
    },
    'researcher': {
      agentType: 'researcher',
      mode: 'bridge',
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
      logAll: true,
      maxConnections: 10,
      timeout: 30000
    }
  };

  return policies[agentType] || {
    agentType,
    mode: 'none',
    allow: [],
    deny: ['all'],
    logAll: true,
    maxConnections: 5,
    timeout: 10000
  };
}

// ============================================================================
// Policy Management
// ============================================================================

/**
 * Load network policies from file
 */
export function loadPolicies(): Record<string, NetworkPolicy> {
  try {
    if (existsSync(POLICY_FILE)) {
      const content = readFileSync(POLICY_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    logger.warn('Failed to load network policies', { error: (err as Error).message });
  }

  // Return default policies
  return {
    'planner': getDefaultPolicy('planner'),
    'executor': getDefaultPolicy('executor'),
    'verifier': getDefaultPolicy('verifier'),
    'researcher': getDefaultPolicy('researcher')
  };
}

/**
 * Save network policies to file
 */
export function savePolicies(policies: Record<string, NetworkPolicy>): void {
  try {
    const dir = join(process.cwd(), '.planning');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(POLICY_FILE, JSON.stringify(policies, null, 2), 'utf8');
    logger.debug('Network policies saved', { path: POLICY_FILE });
  } catch (err) {
    logger.error('Failed to save network policies', { error: (err as Error).message });
  }
}

/**
 * Check if URL is allowed for agent type
 */
export function isUrlAllowed(agentType: string, url: string): boolean {
  const policy = getDefaultPolicy(agentType);

  // Parse URL
  let hostname: string;
  try {
    const urlObj = new URL(url);
    hostname = urlObj.hostname;
  } catch (err) {
    // Invalid URL, deny
    return false;
  }

  // Check deny list first (default-deny)
  if (policy.deny.includes('all')) {
    // Default deny - check allow list
    return policy.allow.some(allowed => hostname.endsWith(allowed) || hostname === allowed);
  }

  // Check explicit deny
  if (policy.deny.some(denied => hostname.endsWith(denied) || hostname === denied)) {
    return false;
  }

  // Default allow (if not in deny list)
  return true;
}

// ============================================================================
// Network Request Logging
// ============================================================================

/**
 * Log network request
 */
export function logNetworkRequest(request: NetworkRequest): void {
  try {
    const dir = join(process.cwd(), '.planning');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const timestamp = new Date(request.timestamp).toISOString();
    const status = request.allowed ? 'ALLOW' : 'DENY';
    const latency = request.latency ? `${request.latency}ms` : 'N/A';
    const bytes = request.bytesTransferred ? `${request.bytesTransferred}B` : 'N/A';

    const logEntry = `[${timestamp}] ${status} ${request.agentType} ${request.method} ${request.url} (${latency}, ${bytes})\n`;

    appendFileSync(LOG_FILE, logEntry, 'utf8');

    if (!request.allowed) {
      logger.warn('Network request denied', {
        taskId: request.taskId,
        agentType: request.agentType,
        url: request.url,
        method: request.method
      });
    } else if (request.latency) {
      logger.debug('Network request', {
        taskId: request.taskId,
        agentType: request.agentType,
        url: request.url,
        method: request.method,
        latency: request.latency
      });
    }
  } catch (err) {
    logger.debug('Failed to log network request', { error: (err as Error).message });
  }
}

/**
 * Get network audit log
 */
export function getNetworkAuditLog(lines: number = 100): string {
  try {
    if (!existsSync(LOG_FILE)) {
      return 'No audit log available';
    }

    const content = readFileSync(LOG_FILE, 'utf8');
    const allLines = content.split('\n').filter(l => l.trim().length > 0);

    return allLines.slice(-lines).join('\n');
  } catch (err) {
    return `Failed to read audit log: ${(err as Error).message}`;
  }
}

// ============================================================================
// Fetch Wrapper for Network Policy Enforcement
// ============================================================================

/**
 * Create network request wrapper for fetch
 */
export function createFetchWrapper(
  agentType: string,
  taskId: string,
  originalFetch: typeof fetch
): typeof fetch {
  return async function wrappedFetch(
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';
    const startTime = Date.now();

    // Check if URL is allowed
    const allowed = isUrlAllowed(agentType, url);

    // Log request
    logNetworkRequest({
      taskId,
      agentType,
      url,
      method,
      allowed,
      timestamp: Date.now()
    });

    if (!allowed) {
      throw new Error(`Network access denied for ${agentType}: ${url}`);
    }

    // Execute fetch
    try {
      const response = await originalFetch(input, init);
      const latency = Date.now() - startTime;

      // Log response
      logNetworkRequest({
        taskId,
        agentType,
        url,
        method,
        allowed: true,
        timestamp: Date.now(),
        latency
      });

      return response;
    } catch (err) {
      const latency = Date.now() - startTime;

      logNetworkRequest({
        taskId,
        agentType,
        url,
        method,
        allowed: true,
        timestamp: Date.now(),
        latency
      });

      throw err;
    }
  };
}

// ============================================================================
// Docker Network Management
// ============================================================================

/**
 * Create Docker network for sandboxed execution
 */
export async function createDockerNetwork(config: DockerNetworkConfig): Promise<string> {
  try {
    const args: string[] = [
      'docker network create',
      `--driver ${config.driver}`
    ];

    // Add subnet if specified
    if (config.subnet) {
      args.push(`--subnet ${config.subnet}`);
    }

    // Add gateway if specified
    if (config.gateway) {
      args.push(`--gateway ${config.gateway}`);
    }

    // Internal network (no external connectivity)
    if (config.internal) {
      args.push('--internal');
    }

    // Add driver options
    if (config.options) {
      for (const [key, value] of Object.entries(config.options)) {
        args.push(`--opt ${key}=${value}`);
      }
    }

    args.push(config.name);

    const { stdout } = await execAsync(args.join(' '));
    logger.info('Docker network created', { name: config.name, id: stdout.trim() });
    return stdout.trim();
  } catch (err) {
    // Network might already exist
    logger.debug('Network creation result', {
      name: config.name,
      error: (err as Error).message
    });
    return config.name;
  }
}

/**
 * Remove Docker network
 */
export async function removeDockerNetwork(networkName: string): Promise<boolean> {
  try {
    await execAsync(`docker network rm ${networkName}`);
    logger.info('Docker network removed', { name: networkName });
    return true;
  } catch (err) {
    logger.warn('Failed to remove Docker network', {
      name: networkName,
      error: (err as Error).message
    });
    return false;
  }
}

/**
 * List Docker networks
 */
export async function listDockerNetworks(): Promise<Array<{
  name: string;
  id: string;
  driver: string;
  scope: string;
}>> {
  try {
    const { stdout } = await execAsync(
      `docker network ls --format '{{.Name}}|{{.ID}}|{{.Driver}}|{{.Scope}}'`
    );

    return stdout.trim().split('\n').filter(l => l.length > 0).map(line => {
      const [name, id, driver, scope] = line.split('|');
      return { name, id, driver, scope };
    });
  } catch (err) {
    logger.warn('Failed to list Docker networks', { error: (err as Error).message });
    return [];
  }
}

/**
 * Get Docker network details
 */
export async function getDockerNetworkDetails(networkName: string): Promise<{
  name: string;
  id: string;
  driver: string;
  subnet?: string;
  gateway?: string;
  containers: string[];
} | null> {
  try {
    const { stdout } = await execAsync(
      `docker network inspect ${networkName} --format '{{.Name}}|{{.Id}}|{{.Driver}}|{{range .IPAM.Config}}{{.Subnet}}|{{.Gateway}}{{end}}'`
    );

    const parts = stdout.trim().split('|');
    const [name, id, driver, subnet, gateway] = parts;

    // Get connected containers
    const { stdout: containersOutput } = await execAsync(
      `docker network inspect ${networkName} --format '{{range .Containers}}{{.Name}}|{{end}}'`
    );

    const containers = containersOutput.trim().split('|').filter(c => c.length > 0);

    return { name, id, driver, subnet, gateway, containers };
  } catch (err) {
    logger.warn('Failed to get Docker network details', {
      name: networkName,
      error: (err as Error).message
    });
    return null;
  }
}

/**
 * Connect container to network
 */
export async function connectContainerToNetwork(
  networkName: string,
  containerId: string,
  ipAddress?: string
): Promise<boolean> {
  try {
    const args = [`docker network connect ${networkName} ${containerId}`];
    if (ipAddress) {
      args.push(`--ip ${ipAddress}`);
    }

    await execAsync(args.join(' '));
    logger.debug('Container connected to network', {
      container: containerId,
      network: networkName,
      ip: ipAddress
    });
    return true;
  } catch (err) {
    logger.warn('Failed to connect container to network', {
      container: containerId,
      network: networkName,
      error: (err as Error).message
    });
    return false;
  }
}

/**
 * Disconnect container from network
 */
export async function disconnectContainerFromNetwork(
  networkName: string,
  containerId: string
): Promise<boolean> {
  try {
    await execAsync(`docker network disconnect ${networkName} ${containerId}`);
    logger.debug('Container disconnected from network', {
      container: containerId,
      network: networkName
    });
    return true;
  } catch (err) {
    logger.warn('Failed to disconnect container from network', {
      container: containerId,
      network: networkName,
      error: (err as Error).message
    });
    return false;
  }
}

// ============================================================================
// Network Policy Initialization
// ============================================================================

/**
 * Initialize network policy enforcement
 */
export function initNetworkPolicy(agentType: string, taskId: string): void {
  const policy = getDefaultPolicy(agentType);

  logger.info('Network policy initialized', {
    agentType,
    taskId,
    mode: policy.mode,
    allowCount: policy.allow.length,
    denyCount: policy.deny.length,
    logAll: policy.logAll
  });

  // Save policies
  const policies = loadPolicies();
  policies[agentType] = policy;
  savePolicies(policies);
}

/**
 * Get network policy summary
 */
export function getPolicySummary(agentType: string): string {
  const policy = getDefaultPolicy(agentType);

  const lines = [
    `Network Policy: ${agentType}`,
    `  Mode: ${policy.mode}`,
    `  Allow: ${policy.allow.length > 0 ? policy.allow.join(', ') : 'none'}`,
    `  Deny: ${policy.deny.join(', ')}`,
    `  Log All: ${policy.logAll}`,
    `  Max Connections: ${policy.maxConnections || 'unlimited'}`,
    `  Timeout: ${policy.timeout || 'default'}ms`
  ];

  return lines.join('\n');
}

/**
 * Get all policies summary
 */
export function getAllPoliciesSummary(): string {
  const agentTypes = ['planner', 'executor', 'verifier', 'researcher'];
  return agentTypes.map(type => getPolicySummary(type)).join('\n\n');
}

// ============================================================================
// Network Statistics
// ============================================================================

/**
 * Calculate network statistics from audit log
 */
export function getNetworkStats(timeRangeMs: number = 86400000): NetworkStats {
  const now = Date.now();
  const cutoff = now - timeRangeMs;

  const stats: NetworkStats = {
    totalRequests: 0,
    allowedRequests: 0,
    deniedRequests: 0,
    uniqueHosts: new Set(),
    topHosts: [],
    avgLatency: 0,
    totalBytesTransferred: 0
  };

  try {
    if (!existsSync(LOG_FILE)) {
      return stats;
    }

    const content = readFileSync(LOG_FILE, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const hostCounts = new Map<string, number>();
    let totalLatency = 0;
    let latencyCount = 0;

    for (const line of lines) {
      // Parse log line: [timestamp] STATUS agentType METHOD url (latency, bytes)
      const match = line.match(/\[(.*?)\]\s+(ALLOW|DENY)\s+(\w+)\s+(\w+)\s+(.*?)\s+\(([^,]+),\s*([^)]+)\)/);
      if (!match) continue;

      const [, timestampStr, status, agentType, method, url, latencyStr, bytesStr] = match;
      const timestamp = new Date(timestampStr).getTime();

      if (timestamp < cutoff) continue;

      stats.totalRequests++;

      if (status === 'ALLOW') {
        stats.allowedRequests++;
      } else {
        stats.deniedRequests++;
      }

      // Extract hostname
      try {
        const urlObj = new URL(url);
        stats.uniqueHosts.add(urlObj.hostname);
        hostCounts.set(urlObj.hostname, (hostCounts.get(urlObj.hostname) || 0) + 1);
      } catch (err) {
        // Invalid URL
      }

      // Parse latency
      if (latencyStr !== 'N/A') {
        const latency = parseFloat(latencyStr.replace('ms', ''));
        if (!isNaN(latency)) {
          totalLatency += latency;
          latencyCount++;
        }
      }

      // Parse bytes
      if (bytesStr !== 'N/A') {
        const bytes = parseInt(bytesStr.replace('B', ''));
        if (!isNaN(bytes)) {
          stats.totalBytesTransferred += bytes;
        }
      }
    }

    // Calculate average latency
    if (latencyCount > 0) {
      stats.avgLatency = totalLatency / latencyCount;
    }

    // Get top hosts
    const sortedHosts = Array.from(hostCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    stats.topHosts = sortedHosts.map(([host, count]) => ({ host, count }));

  } catch (err) {
    logger.warn('Failed to calculate network stats', { error: (err as Error).message });
  }

  return stats;
}

/**
 * Clear network audit log
 */
export function clearAuditLog(): void {
  try {
    if (existsSync(LOG_FILE)) {
      writeFileSync(LOG_FILE, '', 'utf8');
      logger.info('Network audit log cleared');
    }
  } catch (err) {
    logger.warn('Failed to clear audit log', { error: (err as Error).message });
  }
}

// ============================================================================
// Docker Network Mode Helper
// ============================================================================

/**
 * Get Docker network mode for agent type
 */
export function getDockerNetworkMode(agentType: string): string {
  const policy = getDefaultPolicy(agentType);
  return policy.mode;
}

/**
 * Build Docker network arguments for agent type
 */
export function buildDockerNetworkArgs(agentType: string): string[] {
  const policy = getDefaultPolicy(agentType);
  const args: string[] = [];

  // Network mode
  args.push(`--network=${policy.mode}`);

  // For bridge mode with allowlist, we would need a custom network
  // This is a simplified version - in production, use iptables or a proxy
  if (policy.mode === 'bridge' && policy.allow.length > 0) {
    logger.debug('Bridge mode with allowlist', {
      agentType,
      allowedHosts: policy.allow
    });
  }

  return args;
}
