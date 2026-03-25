/**
 * FP Transform — Data transformation utilities
 *
 * Functional programming utilities for common data transformations.
 * All functions are pure and immutable.
 */

// ─── Type Definitions ────────────────────────────────────────────────────────

export type Predicate<T> = (item: T) => boolean;
export type Transform<T, U> = (item: T) => U;
export type Reducer<T, R> = (acc: R, item: T, index: number) => R;

// ─── Map Functions ───────────────────────────────────────────────────────────

/**
 * Map array elements through a transform function
 * @param arr - Input array
 * @param fn - Transform function
 * @returns Transformed array
 */
export function map<T, U>(arr: T[], fn: Transform<T, U>): U[] {
  return arr.map(fn);
}

/**
 * Flat map - map then flatten one level
 * @param arr - Input array
 * @param fn - Transform function returning arrays
 * @returns Flattened transformed array
 */
export function flatMap<T, U>(arr: T[], fn: Transform<T, U[]>): U[] {
  return arr.flatMap(fn);
}

/**
 * Map object entries to array
 * @param obj - Input object
 * @param fn - Transform function for entries
 * @returns Transformed array
 */
export function mapObject<T, K extends string, U>(
  obj: Record<K, T>,
  fn: Transform<[K, T], U>
): U[] {
  return Object.entries(obj).map(([key, value]) => fn([key as K, value]));
}

// ─── Filter Functions ────────────────────────────────────────────────────────

/**
 * Filter array elements by predicate
 * @param arr - Input array
 * @param predicate - Filter predicate
 * @returns Filtered array
 */
export function filter<T>(arr: T[], predicate: Predicate<T>): T[] {
  return arr.filter(predicate);
}

/**
 * Filter object entries by predicate
 * @param obj - Input object
 * @param predicate - Filter predicate for entries
 * @returns Filtered object
 */
export function filterObject<T, K extends string>(
  obj: Record<K, T>,
  predicate: (key: K, value: T) => boolean
): Record<K, T> {
  const result: Partial<Record<K, T>> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (predicate(key as K, value)) {
      result[key as K] = value;
    }
  }
  return result as Record<K, T>;
}

/**
 * Remove null and undefined values from array
 * @param arr - Input array with possible nulls/undefineds
 * @returns Array with only defined values
 */
export function compact<T>(arr: (T | null | undefined)[]): T[] {
  return arr.filter((item): item is T => item !== null && item !== undefined);
}

/**
 * Remove duplicate values from array
 * @param arr - Input array
 * @returns Array with unique values
 */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Remove duplicate values from array using key function
 * @param arr - Input array
 * @param keyFn - Function to extract key from item
 * @returns Array with unique values by key
 */
export function uniqueBy<T, K>(arr: T[], keyFn: Transform<T, K>): T[] {
  const seen = new Set<K>();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// ─── Reduce Functions ────────────────────────────────────────────────────────

/**
 * Reduce array to single value
 * @param arr - Input array
 * @param fn - Reducer function
 * @param initial - Initial accumulator value
 * @returns Reduced value
 */
export function reduce<T, R>(arr: T[], fn: Reducer<T, R>, initial: R): R {
  return arr.reduce(fn, initial);
}

/**
 * Reduce array to single value (right-to-left)
 * @param arr - Input array
 * @param fn - Reducer function
 * @param initial - Initial accumulator value
 * @returns Reduced value
 */
export function reduceRight<T, R>(arr: T[], fn: Reducer<T, R>, initial: R): R {
  return arr.reduceRight(fn, initial);
}

/**
 * Reduce object to single value
 * @param obj - Input object
 * @param fn - Reducer function for entries
 * @param initial - Initial accumulator value
 * @returns Reduced value
 */
export function reduceObject<T, R, K extends string>(
  obj: Record<K, T>,
  fn: (acc: R, key: K, value: T) => R,
  initial: R
): R {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => fn(acc, key as K, value),
    initial
  );
}

// ─── Array Utilities ─────────────────────────────────────────────────────────

/**
 * Get first N elements from array
 * @param arr - Input array
 * @param n - Number of elements
 * @returns First N elements
 */
export function take<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

/**
 * Drop first N elements from array
 * @param arr - Input array
 * @param n - Number of elements to drop
 * @returns Remaining elements
 */
export function drop<T>(arr: T[], n: number): T[] {
  return arr.slice(n);
}

/**
 * Take elements while predicate is true
 * @param arr - Input array
 * @param predicate - Take predicate
 * @returns Taken elements
 */
export function takeWhile<T>(arr: T[], predicate: Predicate<T>): T[] {
  const result: T[] = [];
  for (const item of arr) {
    if (!predicate(item)) break;
    result.push(item);
  }
  return result;
}

/**
 * Drop elements while predicate is true
 * @param arr - Input array
 * @param predicate - Drop predicate
 * @returns Remaining elements
 */
export function dropWhile<T>(arr: T[], predicate: Predicate<T>): T[] {
  let i = 0;
  while (i < arr.length && predicate(arr[i])) {
    i++;
  }
  return arr.slice(i);
}

/**
 * Chunk array into arrays of size n
 * @param arr - Input array
 * @param size - Chunk size
 * @returns Array of chunks
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Flatten nested array
 * @param arr - Nested array
 * @param depth - Depth to flatten (default: 1)
 * @returns Flattened array
 */
export function flatten<T>(arr: any[], depth: number = 1): T[] {
  return arr.flat(depth);
}

/**
 * Zip multiple arrays together
 * @param arrs - Arrays to zip
 * @returns Zipped array of tuples
 */
export function zip<T>(...arrs: T[][]): T[][] {
  const minLength = Math.min(...arrs.map(arr => arr.length));
  const result: T[][] = [];
  for (let i = 0; i < minLength; i++) {
    result.push(arrs.map(arr => arr[i]));
  }
  return result;
}

// Default export for backward compatibility
export default {
  map,
  flatMap,
  mapObject,
  filter,
  filterObject,
  compact,
  unique,
  uniqueBy,
  reduce,
  reduceRight,
  reduceObject,
  take,
  drop,
  takeWhile,
  dropWhile,
  chunk,
  flatten,
  zip
};
