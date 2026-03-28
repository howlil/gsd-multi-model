/**
 * Prompt Cache — Intelligent prompt caching
 *
 * COMP-04: Prompt caching with LRU eviction
 * COMP-05: Dynamic prompt assembly
 *
 * Features:
 * - LRU cache with TTL
 * - Prompt template caching
 * - Dynamic assembly from components
 * - Cache hit/miss statistics
 *
 * Target Metrics:
 * - Cache hit rate: 70%+
 * - Assembly time: <5ms
 * - Memory efficiency: 90%+
 */

import { createHash } from 'crypto';

/**
 * Cached prompt entry
 */
interface CachedPrompt {
  prompt: string;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  hash: string;
  metadata?: Record<string, unknown>;
}

/**
 * Prompt component for dynamic assembly
 */
export interface PromptComponent {
  /** Component name */
  name: string;
  /** Component content */
  content: string;
  /** Component priority (for ordering) */
  priority: number;
  /** Required variables */
  variables?: string[];
}

/**
 * Cache statistics
 */
export interface PromptCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  evictions: number;
  averageAccessTime: number;
}

/**
 * Assembled prompt result
 */
export interface AssembledPrompt {
  prompt: string;
  components: string[];
  tokenCount: number;
  assemblyTime: number;
}

/**
 * Prompt Cache class
 *
 * Implements intelligent prompt caching:
 * - LRU eviction policy
 * - TTL-based expiry
 * - Dynamic assembly from components
 * - Statistics tracking
 */
export class PromptCache {
  private readonly cache: Map<string, CachedPrompt>;
  private readonly components: Map<string, PromptComponent>;
  private readonly maxSize: number;
  private readonly ttl: number;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
    accessTimes: number[];
  };

  constructor(options: { maxSize?: number; ttl?: number } = {}) {
    this.cache = new Map();
    this.components = new Map();
    this.maxSize = options.maxSize || 500;
    this.ttl = options.ttl || 600000; // 10 minutes
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      accessTimes: []
    };
  }

  /**
   * Get prompt from cache
   * @param key - Cache key (prompt hash or custom key)
   * @returns Cached prompt or null
   */
  get(key: string): string | null {
    const startTime = Date.now();
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Update access metadata
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.stats.hits++;
    
    const accessTime = Date.now() - startTime;
    this.stats.accessTimes.push(accessTime);
    
    return entry.prompt;
  }

  /**
   * Set prompt in cache
   * @param key - Cache key
   * @param prompt - Prompt to cache
   * @param metadata - Optional metadata
   */
  set(key: string, prompt: string, metadata?: Record<string, unknown>): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    const hash = this.generateHash(prompt);
    
    this.cache.set(key, {
      prompt,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccess: Date.now(),
      hash,
      metadata
    });
  }

  /**
   * Check if prompt exists in cache
   * @param prompt - Prompt to check
   * @returns True if cached
   */
  has(prompt: string): boolean {
    const hash = this.generateHash(prompt);
    
    for (const entry of this.cache.values()) {
      if (entry.hash === hash && Date.now() - entry.timestamp <= this.ttl) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Register a prompt component
   * @param component - Component to register
   */
  registerComponent(component: PromptComponent): void {
    this.components.set(component.name, component);
  }

  /**
   * Get a registered component
   * @param name - Component name
   * @returns Component or undefined
   */
  getComponent(name: string): PromptComponent | undefined {
    return this.components.get(name);
  }

  /**
   * Assemble prompt from components dynamically
   * @param componentNames - Names of components to assemble
   * @param variables - Variable values for substitution
   * @returns Assembled prompt
   */
  assemble(componentNames: string[], variables: Record<string, string> = {}): AssembledPrompt {
    const startTime = Date.now();
    const components: string[] = [];
    
    // Get and sort components by priority
    const sortedComponents = componentNames
      .map(name => this.components.get(name))
      .filter((c): c is PromptComponent => c !== undefined)
      .sort((a, b) => a.priority - b.priority);
    
    // Assemble components
    for (const component of sortedComponents) {
      let content = component.content;
      
      // Substitute variables
      for (const [key, value] of Object.entries(variables)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
      
      components.push(content);
    }
    
    const prompt = components.join('\n\n');
    const assemblyTime = Date.now() - startTime;
    
    return {
      prompt,
      components: componentNames,
      tokenCount: Math.ceil(prompt.length / 4),
      assemblyTime
    };
  }

  /**
   * Get or assemble prompt (with caching)
   * @param componentNames - Names of components
   * @param variables - Variable values
   * @returns Assembled prompt with cache info
   */
  getOrAssemble(
    componentNames: string[],
    variables: Record<string, string> = {}
  ): AssembledPrompt & { fromCache: boolean } {
    // Generate cache key from components and variables
    const cacheKey = this.generateAssemblyKey(componentNames, variables);
    
    // Check cache
    const cached = this.get(cacheKey);
    if (cached) {
      return {
        prompt: cached,
        components: componentNames,
        tokenCount: Math.ceil(cached.length / 4),
        assemblyTime: 0,
        fromCache: true
      };
    }
    
    // Assemble and cache
    const assembled = this.assemble(componentNames, variables);
    this.set(cacheKey, assembled.prompt, { components: componentNames, variables });
    
    return {
      ...assembled,
      fromCache: false
    };
  }

  /**
   * Remove prompt from cache
   * @param key - Cache key
   * @returns True if removed
   */
  remove(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached prompts
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      accessTimes: []
    };
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats(): PromptCacheStats {
    const avgAccessTime = this.stats.accessTimes.length > 0
      ? this.stats.accessTimes.reduce((a, b) => a + b, 0) / this.stats.accessTimes.length
      : 0;
    
    const total = this.stats.hits + this.stats.misses;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.cache.size,
      maxSize: this.maxSize,
      evictions: this.stats.evictions,
      averageAccessTime: avgAccessTime
    };
  }

  /**
   * Get frequently accessed prompts
   * @returns Array of prompts sorted by access count
   */
  getFrequentPrompts(): Array<{ key: string; prompt: string; accessCount: number }> {
    return Array.from(this.cache.entries())
      .sort((a, b) => b[1].accessCount - a[1].accessCount)
      .slice(0, 10)
      .map(([key, entry]) => ({ key, prompt: entry.prompt, accessCount: entry.accessCount }));
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestScore = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      // LRU score considers both time and access count
      const score = entry.lastAccess - (entry.accessCount * 10000);
      if (score < oldestScore) {
        oldestScore = score;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Generate hash for content
   * @param content - Content to hash
   * @returns SHA-256 hash
   */
  private generateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate cache key for assembly
   * @param components - Component names
   * @param variables - Variables
   * @returns Cache key
   */
  private generateAssemblyKey(components: string[], variables: Record<string, string>): string {
    const keyData = JSON.stringify({
      components: components.sort(),
      variables: Object.entries(variables).sort()
    });
    return `assembly:${this.generateHash(keyData)}`;
  }
}

export default PromptCache;
