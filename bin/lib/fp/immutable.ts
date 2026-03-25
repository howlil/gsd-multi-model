/**
 * FP Immutable — Immutable data operation helpers
 *
 * Utilities for working with immutable data structures.
 * All functions return new objects/arrays without mutating inputs.
 */

// ─── Type Definitions ────────────────────────────────────────────────────────

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ImmutableUpdate<T extends object> = {
  [K in keyof T]?: T[K] extends object ? ImmutableUpdate<T[K]> : T[K];
};

// ─── Object Update Functions ─────────────────────────────────────────────────

/**
 * Create a new object with shallow updates
 * 
 * Example:
 * ```typescript
 * const user = { name: 'Alice', age: 30 };
 * const updated = update(user, { age: 31 });
 * // updated = { name: 'Alice', age: 31 }
 * // user !== updated
 * ```
 * 
 * @param obj - Original object
 * @param updates - Properties to update
 * @returns New object with updates
 */
export function update<T extends object>(obj: T, updates: Partial<T>): T {
  return { ...obj, ...updates };
}

/**
 * Create a new object with deep updates
 * 
 * Example:
 * ```typescript
 * const state = { user: { profile: { name: 'Alice' } } };
 * const updated = updateDeep(state, { user: { profile: { name: 'Bob' } } });
 * ```
 * 
 * @param obj - Original object
 * @param updates - Deep properties to update
 * @returns New object with deep updates
 */
export function updateDeep<T extends object>(obj: T, updates: DeepPartial<T>): T {
  const result = { ...obj };
  
  for (const key in updates) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      const updateValue = updates[key];
      const originalValue = obj[key];
      
      if (
        updateValue !== undefined &&
        typeof updateValue === 'object' &&
        updateValue !== null &&
        typeof originalValue === 'object' &&
        originalValue !== null &&
        !Array.isArray(updateValue)
      ) {
        result[key] = updateDeep(originalValue as any, updateValue as any);
      } else if (updateValue !== undefined) {
        result[key] = updateValue as any;
      }
    }
  }
  
  return result;
}

/**
 * Merge multiple objects immutably
 * 
 * Example:
 * ```typescript
 * const base = { a: 1, b: 2 };
 * const extra = { b: 3, c: 4 };
 * const merged = merge(base, extra);
 * // merged = { a: 1, b: 3, c: 4 }
 * ```
 * 
 * @param obj - Base object
 * @param updates - Objects to merge
 * @returns Merged object
 */
export function merge<T extends object>(obj: T, ...updates: Array<Partial<T>>): T {
  return Object.assign({}, obj, ...updates);
}

/**
 * Deep merge multiple objects
 * 
 * @param obj - Base object
 * @param updates - Objects to deep merge
 * @returns Deep merged object
 */
export function mergeDeep<T extends object>(obj: T, ...updates: Array<DeepPartial<T>>): T {
  return updates.reduce((acc, update) => updateDeep(acc, update), obj);
}

/**
 * Omit properties from object
 * 
 * Example:
 * ```typescript
 * const user = { name: 'Alice', age: 30, password: 'secret' };
 * const safe = omit(user, ['password']);
 * // safe = { name: 'Alice', age: 30 }
 * ```
 * 
 * @param obj - Original object
 * @param keys - Keys to omit
 * @returns Object without omitted keys
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * Pick properties from object
 * 
 * Example:
 * ```typescript
 * const user = { name: 'Alice', age: 30, password: 'secret' };
 * const nameOnly = pick(user, ['name']);
 * // nameOnly = { name: 'Alice' }
 * ```
 * 
 * @param obj - Original object
 * @param keys - Keys to pick
 * @returns Object with only picked keys
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result: Partial<T> = {};
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result as Pick<T, K>;
}

// ─── Array Update Functions ──────────────────────────────────────────────────

/**
 * Append item to array immutably
 * 
 * Example:
 * ```typescript
 * const items = [1, 2, 3];
 * const extended = append(items, 4);
 * // extended = [1, 2, 3, 4]
 * // items !== extended
 * ```
 * 
 * @param arr - Original array
 * @param item - Item to append
 * @returns New array with appended item
 */
export function append<T>(arr: T[], item: T): T[] {
  return [...arr, item];
}

/**
 * Prepend item to array immutably
 * 
 * @param arr - Original array
 * @param item - Item to prepend
 * @returns New array with prepended item
 */
export function prepend<T>(arr: T[], item: T): T[] {
  return [item, ...arr];
}

/**
 * Remove item from array by index immutably
 * 
 * Example:
 * ```typescript
 * const items = [1, 2, 3, 4];
 * const removed = remove(items, 2);
 * // removed = [1, 2, 4]
 * ```
 * 
 * @param arr - Original array
 * @param index - Index to remove
 * @returns New array without item at index
 */
export function remove<T>(arr: T[], index: number): T[] {
  return [...arr.slice(0, index), ...arr.slice(index + 1)];
}

/**
 * Set item at index immutably
 * 
 * Example:
 * ```typescript
 * const items = [1, 2, 3];
 * const updated = set(items, 1, 20);
 * // updated = [1, 20, 3]
 * ```
 * 
 * @param arr - Original array
 * @param index - Index to update
 * @param value - New value
 * @returns New array with updated value
 */
export function set<T>(arr: T[], index: number, value: T): T[] {
  return [...arr.slice(0, index), value, ...arr.slice(index + 1)];
}

/**
 * Insert item at index immutably
 * 
 * @param arr - Original array
 * @param index - Index to insert at
 * @param item - Item to insert
 * @returns New array with inserted item
 */
export function insert<T>(arr: T[], index: number, item: T): T[] {
  return [...arr.slice(0, index), item, ...arr.slice(index)];
}

/**
 * Replace item in array immutably
 * 
 * @param arr - Original array
 * @param predicate - Function to find item to replace
 * @param newValue - New value
 * @returns New array with replaced item
 */
export function replace<T>(arr: T[], predicate: (item: T) => boolean, newValue: T): T[] {
  return arr.map(item => (predicate(item) ? newValue : item));
}

/**
 * Sort array immutably
 * 
 * @param arr - Original array
 * @param compareFn - Compare function
 * @returns New sorted array
 */
export function sort<T>(arr: T[], compareFn?: (a: T, b: T) => number): T[] {
  return [...arr].sort(compareFn);
}

/**
 * Reverse array immutably
 * 
 * @param arr - Original array
 * @returns New reversed array
 */
export function reverse<T>(arr: T[]): T[] {
  return [...arr].reverse();
}

// ─── Lens Functions (Advanced) ───────────────────────────────────────────────

/**
 * Create a lens for focusing on nested properties
 * 
 * Example:
 * ```typescript
 * const userLens = lens<User, string>(
 *   (user) => user.profile.name,
 *   (user, name) => ({ ...user, profile: { ...user.profile, name } })
 * );
 * const updated = over(userLens, (name) => name.toUpperCase(), user);
 * ```
 * 
 * @param get - Getter function
 * @param set - Setter function
 * @returns Lens object
 */
export function lens<T, V>(
  get: (obj: T) => V,
  set: (obj: T, value: V) => T
): {
  get: (obj: T) => V;
  set: (obj: T, value: V) => T;
  over: (fn: (value: V) => V, obj: T) => T;
} {
  return {
    get,
    set,
    over: (fn: (value: V) => V, obj: T) => set(obj, fn(get(obj)))
  };
}

/**
 * Apply a function to a focused value using a lens
 * 
 * @param lens - Lens to use
 * @param fn - Function to apply
 * @param obj - Object to update
 * @returns Updated object
 */
export function over<T, V>(
  lens: { get: (obj: T) => V; set: (obj: T, value: V) => T },
  fn: (value: V) => V,
  obj: T
): T {
  return lens.set(obj, fn(lens.get(obj)));
}

/**
 * View a focused value using a lens
 * 
 * @param lens - Lens to use
 * @param obj - Object to view
 * @returns Focused value
 */
export function view<T, V>(lens: { get: (obj: T) => V }, obj: T): V {
  return lens.get(obj);
}

// Default export for backward compatibility
export default {
  update,
  updateDeep,
  merge,
  mergeDeep,
  omit,
  pick,
  append,
  prepend,
  remove,
  set,
  insert,
  replace,
  sort,
  reverse,
  lens,
  over,
  view
};
