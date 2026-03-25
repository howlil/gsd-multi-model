/**
 * FP Memoize — Caching and memoization utilities
 *
 * Utilities for caching function results and memoizing expensive operations.
 */

// ─── Type Definitions ────────────────────────────────────────────────────────

export type AnyFunction = (...args: any[]) => any;

export interface CacheOptions {
  maxSize?: number;
  maxAge?: number; // milliseconds
}

export interface Cache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  size: number;
}

export interface MemoizedFunction<T extends AnyFunction> extends T {
  cache: Map<string, { value: ReturnType<T>; timestamp: number }>;
  clear(): void;
}

// ─── Cache Implementation ────────────────────────────────────────────────────

/**
 * Create a simple in-memory cache with optional size limit and TTL
 */
export function createCache<K = string, V = any>(options: CacheOptions = {}): Cache<K, V> {
  const { maxSize = 1000, maxAge } = options;
  const store = new Map<K, { value: V; timestamp: number }>();

  function cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (maxAge && now - entry.timestamp > maxAge) {
        store.delete(key);
      }
    }
  }

  function enforceSizeLimit(): void {
    while (store.size >= maxSize && store.size > 0) {
      const firstKey = store.keys().next().value;
      if (firstKey !== undefined) {
        store.delete(firstKey);
      }
    }
  }

  return {
    get(key: K): V | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      
      if (maxAge && Date.now() - entry.timestamp > maxAge) {
        store.delete(key);
        return undefined;
      }
      
      return entry.value;
    },

    set(key: K, value: V): void {
      enforceSizeLimit();
      store.set(key, { value, timestamp: Date.now() });
    },

    has(key: K): boolean {
      const entry = store.get(key);
      if (!entry) return false;
      
      if (maxAge && Date.now() - entry.timestamp > maxAge) {
        store.delete(key);
        return false;
      }
      
      return true;
    },

    delete(key: K): boolean {
      return store.delete(key);
    },

    clear(): void {
      store.clear();
    },

    get size(): number {
      return store.size;
    }
  };
}

// ─── Memoize Function ────────────────────────────────────────────────────────

/**
 * Memoize a function with caching
 * 
 * Example:
 * ```typescript
 * const expensive = memoize((n: number) => {
 *   // Expensive computation
 *   return n * 2;
 * }, { maxAge: 60000 }); // Cache for 1 minute
 * ```
 * 
 * @param fn - Function to memoize
 * @param options - Cache options
 * @returns Memoized function
 */
export function memoize<T extends AnyFunction>(
  fn: T,
  options: CacheOptions = {}
): MemoizedFunction<T> {
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();
  const { maxAge } = options;

  function serializeArgs(args: IArguments): string {
    return JSON.stringify(Array.from(args));
  }

  const memoized = function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = serializeArgs(args);
    const entry = cache.get(key);

    if (entry) {
      if (!maxAge || Date.now() - entry.timestamp < maxAge) {
        return entry.value;
      }
      cache.delete(key);
    }

    const value = fn.apply(this, args);
    cache.set(key, { value, timestamp: Date.now() });
    return value;
  } as MemoizedFunction<T>;

  memoized.cache = cache;
  memoized.clear = () => cache.clear();

  return memoized;
}

// ─── Memoize Async Function ─────────────────────────────────────────────────

/**
 * Memoize an async function with caching
 * 
 * Example:
 * ```typescript
 * const fetchUser = memoizeAsync(async (id: string) => {
 *   const response = await api.get(`/users/${id}`);
 *   return response.data;
 * }, { maxAge: 300000 }); // Cache for 5 minutes
 * ```
 * 
 * @param fn - Async function to memoize
 * @param options - Cache options
 * @returns Memoized async function
 */
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: CacheOptions = {}
): MemoizedFunction<T> {
  const cache = new Map<string, { value: Awaited<ReturnType<T>>; timestamp: number }>();
  const { maxAge } = options;

  function serializeArgs(args: IArguments): string {
    return JSON.stringify(Array.from(args));
  }

  const memoized = async function (this: any, ...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
    const key = serializeArgs(args);
    const entry = cache.get(key);

    if (entry) {
      if (!maxAge || Date.now() - entry.timestamp < maxAge) {
        return entry.value;
      }
      cache.delete(key);
    }

    const value = await fn.apply(this, args);
    cache.set(key, { value, timestamp: Date.now() });
    return value;
  } as MemoizedFunction<T>;

  memoized.cache = cache as any;
  memoized.clear = () => cache.clear();

  return memoized;
}

// ─── Debounce Function ───────────────────────────────────────────────────────

/**
 * Debounce a function (delay execution until after wait milliseconds)
 * 
 * Example:
 * ```typescript
 * const save = debounce((data: any) => {
 *   api.post('/save', data);
 * }, 300); // Wait 300ms after last call
 * ```
 * 
 * @param fn - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends AnyFunction>(fn: T, wait: number): T & { cancel(): void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = function (this: any, ...args: Parameters<T>): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, wait);
  } as T & { cancel(): void };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

// ─── Throttle Function ───────────────────────────────────────────────────────

/**
 * Throttle a function (limit execution to once per wait milliseconds)
 * 
 * Example:
 * ```typescript
 * const handleScroll = throttle(() => {
 *   updateScrollPosition();
 * }, 100); // Max once per 100ms
 * ```
 * 
 * @param fn - Function to throttle
 * @param wait - Wait time in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends AnyFunction>(fn: T, wait: number): T {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>): void {
    const now = Date.now();
    const remaining = wait - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn.apply(this, args);
      }, remaining);
    }
  } as T;
}

// Default export for backward compatibility
export default {
  createCache,
  memoize,
  memoizeAsync,
  debounce,
  throttle
};
