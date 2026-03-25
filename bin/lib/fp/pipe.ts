/**
 * FP Pipe — Function composition utilities
 *
 * Utilities for composing functions into pipelines.
 * Enables clean, readable function chaining.
 */

// ─── Type Definitions ────────────────────────────────────────────────────────

export type UnaryFunction<T, R> = (arg: T) => R;
export type AnyFunction = (...args: any[]) => any;

// ─── Pipe Function ───────────────────────────────────────────────────────────

/**
 * Compose functions left-to-right (pipe)
 * 
 * Example:
 * ```typescript
 * const process = pipe(
 *   (x: number) => x + 1,
 *   (x: number) => x * 2,
 *   (x: number) => x.toString()
 * );
 * process(5); // "12"
 * ```
 * 
 * @param fns - Functions to compose
 * @returns Composed function
 */
export function pipe<T>(...fns: Array<UnaryFunction<T, T>>): UnaryFunction<T, T>;
export function pipe<T, A>(...fns: [UnaryFunction<T, A>]): UnaryFunction<T, A>;
export function pipe<T, A, B>(
  ...fns: [UnaryFunction<T, A>, UnaryFunction<A, B>]
): UnaryFunction<T, B>;
export function pipe<T, A, B, C>(
  ...fns: [UnaryFunction<T, A>, UnaryFunction<A, B>, UnaryFunction<B, C>]
): UnaryFunction<T, C>;
export function pipe<T, A, B, C, D>(
  ...fns: [
    UnaryFunction<T, A>,
    UnaryFunction<A, B>,
    UnaryFunction<B, C>,
    UnaryFunction<C, D>
  ]
): UnaryFunction<T, D>;
export function pipe<T, A, B, C, D, E>(
  ...fns: [
    UnaryFunction<T, A>,
    UnaryFunction<A, B>,
    UnaryFunction<B, C>,
    UnaryFunction<C, D>,
    UnaryFunction<D, E>
  ]
): UnaryFunction<T, E>;
export function pipe(...fns: AnyFunction[]): AnyFunction {
  return function piped(value: any): any {
    return fns.reduce((result, fn) => fn(result), value);
  };
}

// ─── Compose Function ────────────────────────────────────────────────────────

/**
 * Compose functions right-to-left (compose)
 * 
 * Example:
 * ```typescript
 * const process = compose(
 *   (x: number) => x.toString(),
 *   (x: number) => x * 2,
 *   (x: number) => x + 1
 * );
 * process(5); // "12"
 * ```
 * 
 * @param fns - Functions to compose
 * @returns Composed function
 */
export function compose<T>(...fns: Array<UnaryFunction<T, T>>): UnaryFunction<T, T>;
export function compose<T, A>(...fns: [UnaryFunction<A, T>]): UnaryFunction<T, A>;
export function compose<T, A, B>(
  ...fns: [UnaryFunction<B, T>, UnaryFunction<A, B>]
): UnaryFunction<T, A>;
export function compose<T, A, B, C>(
  ...fns: [UnaryFunction<C, T>, UnaryFunction<B, C>, UnaryFunction<A, B>]
): UnaryFunction<T, A>;
export function compose(...fns: AnyFunction[]): AnyFunction {
  return function composed(value: any): any {
    return fns.reduceRight((result, fn) => fn(result), value);
  };
}

// ─── Tap Function ────────────────────────────────────────────────────────────

/**
 * Tap into a pipeline for side effects without changing the value
 * 
 * Example:
 * ```typescript
 * const process = pipe(
 *   (x: number) => x + 1,
 *   tap(x => console.log('After add:', x)),
 *   (x: number) => x * 2
 * );
 * ```
 * 
 * @param fn - Side effect function
 * @returns Identity function with side effect
 */
export function tap<T>(fn: UnaryFunction<T, void>): UnaryFunction<T, T> {
  return function tapped(value: T): T {
    fn(value);
    return value;
  };
}

// ─── Curry Function ──────────────────────────────────────────────────────────

/**
 * Curry a function of multiple arguments into nested unary functions
 * 
 * Example:
 * ```typescript
 * const add = (a: number, b: number) => a + b;
 * const curriedAdd = curry(add);
 * curriedAdd(1)(2); // 3
 * ```
 * 
 * @param fn - Function to curry
 * @returns Curried function
 */
export function curry<T extends AnyFunction>(fn: T): CurriedFunction<T> {
  return function curried(...args: any[]): any {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function (...moreArgs: any[]) {
      return curried.apply(this, [...args, ...moreArgs]);
    };
  };
}

type CurriedFunction<T extends AnyFunction> = T extends (
  ...args: infer A
) => infer R
  ? A extends [infer First, ...infer Rest]
    ? Rest extends []
      ? T
      : (arg: First) => CurriedFunction<(...args: Rest) => R>
    : T
  : never;

// ─── Partial Application ─────────────────────────────────────────────────────

/**
 * Partially apply arguments to a function
 * 
 * Example:
 * ```typescript
 * const greet = (greeting: string, name: string) => `${greeting}, ${name}!`;
 * const sayHello = partial(greet, 'Hello');
 * sayHello('World'); // "Hello, World!"
 * ```
 * 
 * @param fn - Function to partially apply
 * @param args - Arguments to pre-apply
 * @returns Function with pre-applied arguments
 */
export function partial<T extends AnyFunction, A extends Partial<Parameters<T>>>(
  fn: T,
  ...args: A
): (...rest: Parameters<T>[A['length'] & number][]) => ReturnType<T> {
  return function (...rest: any[]): any {
    return fn.apply(this, [...args, ...rest]);
  };
}

// Default export for backward compatibility
export default {
  pipe,
  compose,
  tap,
  curry,
  partial
};
