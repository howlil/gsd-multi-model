/**
 * Logger Module
 */

export { Logger, defaultLogger, adapterLogger, createTraceContext } from './logger.js';
export type { TraceContext } from './logger.js';
export { LogRotation } from './log-rotation.js';
export { LockLogger } from './lock-logger.js';

// Default export
import { Logger } from './logger.js';
export default Logger;

// Performance Optimizations (Phase 26)
// LOG-01, LOG-02: Async logging with compression
export { AsyncLogger } from './async-logger.js';
export type { LogEntry, AsyncLoggerConfig } from './async-logger.js';

// LOG-03, LOG-05: Structured logging with rotation
export { StructuredLogger } from './structured-logger.js';
export type { StructuredLogEntry, RotationConfig } from './structured-logger.js';

// LOG-04, LOG-06: Log sampling
export { LogSampler } from './log-sampler.js';
export type { SamplingConfig, SamplingStats } from './log-sampler.js';
