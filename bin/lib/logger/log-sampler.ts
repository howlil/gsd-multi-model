/**
 * Log Sampler — Intelligent log sampling
 *
 * LOG-04: Log level optimization
 * LOG-06: Log sampling
 *
 * Features:
 * - Adaptive sampling rates
 * - Error rate-based sampling
 * - Module-specific sampling
 * - Trace-based sampling
 *
 * Target Metrics:
 * - Log volume reduction: 60-80%
 * - Error capture rate: 100%
 * - Sampling overhead: <1%
 */

/**
 * Sampling configuration
 */
export interface SamplingConfig {
  /** Base sampling rate (0-1, default: 0.1 = 10%) */
  baseRate?: number;
  /** Error sampling rate (0-1, default: 1.0 = 100%) */
  errorRate?: number;
  /** Warn sampling rate (0-1, default: 0.5 = 50%) */
  warnRate?: number;
  /** Info sampling rate (0-1, default: 0.1 = 10%) */
  infoRate?: number;
  /** Debug sampling rate (0-1, default: 0.01 = 1%) */
  debugRate?: number;
  /** Module-specific overrides */
  moduleRates?: Record<string, number>;
  /** Enable adaptive sampling (default: true) */
  adaptive?: boolean;
  /** Target error capture rate (default: 1.0 = 100%) */
  targetErrorRate?: number;
}

/**
 * Sampling statistics
 */
export interface SamplingStats {
  totalLogs: number;
  sampledLogs: number;
  samplingRate: number;
  logsByLevel: Record<string, { total: number; sampled: number }>;
  logsByModule: Record<string, { total: number; sampled: number }>;
  adaptiveAdjustments: number;
}

/**
 * Log Sampler class
 *
 * Implements intelligent log sampling:
 * - Level-based sampling rates
 * - Module-specific overrides
 * - Adaptive rate adjustment
 * - Trace-based consistent sampling
 */
export class LogSampler {
  private readonly config: Required<SamplingConfig>;
  private readonly traceCache: Map<string, boolean>;
  private errorRate: number;
  private stats: {
    totalLogs: number;
    sampledLogs: number;
    logsByLevel: Record<string, { total: number; sampled: number }>;
    logsByModule: Record<string, { total: number; sampled: number }>;
    adaptiveAdjustments: number;
  };

  constructor(config: SamplingConfig = {}) {
    this.config = {
      baseRate: config.baseRate || 0.1,
      errorRate: config.errorRate || 1.0,
      warnRate: config.warnRate || 0.5,
      infoRate: config.infoRate || 0.1,
      debugRate: config.debugRate || 0.01,
      moduleRates: config.moduleRates || {},
      adaptive: config.adaptive !== false,
      targetErrorRate: config.targetErrorRate || 1.0
    };
    this.traceCache = new Map();
    this.errorRate = 0;
    this.stats = {
      totalLogs: 0,
      sampledLogs: 0,
      logsByLevel: {},
      logsByModule: {},
      adaptiveAdjustments: 0
    };
  }

  /**
   * Check if a log entry should be sampled
   * @param level - Log level
   * @param module - Module name
   * @param traceId - Optional trace ID for consistent sampling
   * @returns True if should be logged
   */
  shouldSample(level: string, module?: string, traceId?: string): boolean {
    this.stats.totalLogs++;

    // Initialize level stats
    if (!this.stats.logsByLevel[level]) {
      this.stats.logsByLevel[level] = { total: 0, sampled: 0 };
    }
    this.stats.logsByLevel[level].total++;

    // Initialize module stats
    if (module) {
      if (!this.stats.logsByModule[module]) {
        this.stats.logsByModule[module] = { total: 0, sampled: 0 };
      }
      this.stats.logsByModule[module].total++;
    }

    // Check trace-based sampling (consistent sampling for same trace)
    if (traceId) {
      const cached = this.traceCache.get(traceId);
      if (cached !== undefined) {
        if (cached) {
          this.recordSampled(level, module);
        }
        return cached;
      }
    }

    // Get sampling rate for this level
    let rate = this.getRateForLevel(level);

    // Apply module-specific override
    if (module && this.config.moduleRates[module]) {
      rate = this.config.moduleRates[module];
    }

    // Determine if should sample
    const shouldLog = Math.random() < rate;

    // Cache trace decision
    if (traceId) {
      this.traceCache.set(traceId, shouldLog);
      // Limit cache size
      if (this.traceCache.size > 10000) {
        const oldestKey = this.traceCache.keys().next().value;
        if (oldestKey) {
          this.traceCache.delete(oldestKey);
        }
      }
    }

    // Record stats
    if (shouldLog) {
      this.recordSampled(level, module);
    }

    return shouldLog;
  }

  /**
   * Get sampling rate for a log level
   * @param level - Log level
   * @returns Sampling rate (0-1)
   */
  private getRateForLevel(level: string): number {
    switch (level.toLowerCase()) {
      case 'error':
        return this.config.errorRate;
      case 'warn':
        return this.config.warnRate;
      case 'info':
        return this.config.infoRate;
      case 'debug':
        return this.config.debugRate;
      default:
        return this.config.baseRate;
    }
  }

  /**
   * Record a sampled log entry
   * @param level - Log level
   * @param module - Module name
   */
  private recordSampled(level: string, module?: string): void {
    this.stats.sampledLogs++;
    this.stats.logsByLevel[level].sampled++;
    if (module && this.stats.logsByModule[module]) {
      this.stats.logsByModule[module].sampled++;
    }
  }

  /**
   * Adjust sampling rate based on error rate (adaptive sampling)
   * @param currentErrorRate - Current error rate (errors/total)
   */
  adjustForErrorRate(currentErrorRate: number): void {
    if (!this.config.adaptive) {
      return;
    }

    this.errorRate = currentErrorRate;
    this.stats.adaptiveAdjustments++;

    // If error rate is high, reduce info/debug sampling
    if (currentErrorRate > 0.1) {
      // High error rate: sample less info/debug to reduce noise
      this.config.infoRate = Math.max(0.01, this.config.infoRate * 0.8);
      this.config.debugRate = Math.max(0.001, this.config.debugRate * 0.5);
    } else if (currentErrorRate < 0.01) {
      // Low error rate: can sample more info/debug
      this.config.infoRate = Math.min(0.5, this.config.infoRate * 1.1);
      this.config.debugRate = Math.min(0.1, this.config.debugRate * 1.2);
    }
  }

  /**
   * Set module-specific sampling rate
   * @param module - Module name
   * @param rate - Sampling rate (0-1)
   */
  setModuleRate(module: string, rate: number): void {
    this.config.moduleRates[module] = rate;
  }

  /**
   * Get current sampling statistics
   * @returns Sampling statistics
   */
  getStats(): SamplingStats {
    return {
      totalLogs: this.stats.totalLogs,
      sampledLogs: this.stats.sampledLogs,
      samplingRate: this.stats.totalLogs > 0 
        ? this.stats.sampledLogs / this.stats.totalLogs 
        : 0,
      logsByLevel: { ...this.stats.logsByLevel },
      logsByModule: { ...this.stats.logsByModule },
      adaptiveAdjustments: this.stats.adaptiveAdjustments
    };
  }

  /**
   * Clear sampling statistics
   */
  clearStats(): void {
    this.stats = {
      totalLogs: 0,
      sampledLogs: 0,
      logsByLevel: {},
      logsByModule: {},
      adaptiveAdjustments: 0
    };
  }

  /**
   * Clear trace cache
   */
  clearTraceCache(): void {
    this.traceCache.clear();
  }
}

export default LogSampler;
