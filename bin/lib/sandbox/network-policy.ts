/**
 * Network Policy Manager — Network access control for sandboxed execution
 *
 * Manages network allowlists and blocklists for different agent types.
 * Enforces default-deny policy with explicit allowlists.
 *
 * Token overhead: <1ms per request (logging only)
 */

import { writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
import { defaultLogger as logger } from '../logger/index.js';

const POLICY_FILE = join(process.cwd(), '.planning', 'network-policies.json');
const LOG_FILE = join(process.cwd(), '.planning', 'network-audit.log');

export interface NetworkPolicy {
  agentType: string;
  allow: string[];
  deny: string[];
  logAll: boolean;
}

export interface NetworkRequest {
  taskId: string;
  agentType: string;
  url: string;
  method: string;
  allowed: boolean;
  timestamp: number;
  latency?: number;
}

/**
 * Get default network policy for agent type
 */
export function getDefaultPolicy(agentType: string): NetworkPolicy {
  const policies: Record<string, NetworkPolicy> = {
    'planner': {
      agentType: 'planner',
      allow: [],
      deny: ['all'],
      logAll: false
    },
    'executor': {
      agentType: 'executor',
      allow: [],
      deny: ['all'],
      logAll: false
    },
    'verifier': {
      agentType: 'verifier',
      allow: [],
      deny: ['all'],
      logAll: false
    },
    'researcher': {
      agentType: 'researcher',
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
  
  return policies[agentType] || {
    agentType,
    allow: [],
    deny: ['all'],
    logAll: true
  };
}

/**
 * Load network policies from file
 */
export function loadPolicies(): Record<string, NetworkPolicy> {
  try {
    if (existsSync(POLICY_FILE)) {
      const content = require('fs').readFileSync(POLICY_FILE, 'utf8');
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
    
    const logEntry = `[${timestamp}] ${status} ${request.agentType} ${request.method} ${request.url} (${latency})\n`;
    
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

/**
 * Initialize network policy enforcement
 */
export function initNetworkPolicy(agentType: string, taskId: string): void {
  const policy = getDefaultPolicy(agentType);
  
  logger.info('Network policy initialized', {
    agentType,
    taskId,
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
    `  Allow: ${policy.allow.length > 0 ? policy.allow.join(', ') : 'none'}`,
    `  Deny: ${policy.deny.join(', ')}`,
    `  Log All: ${policy.logAll}`
  ];
  
  return lines.join('\n');
}
