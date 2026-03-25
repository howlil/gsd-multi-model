/**
 * Type-level test utilities
 *
 * Provides type helpers and utilities for type-level testing.
 */

import { expectTypeOf } from 'expect-type';

/**
 * Type helper: Check if two types are exactly equal
 * @example
 * type Test = IsExact<string, string>; // true
 * type Test2 = IsExact<string, number>; // false
 */
export type IsExact<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;

/**
 * Type helper: Assert that a type is true (compile-time assertion)
 * @example
 * type Test = AssertTrue<IsExact<string, string>>; // compiles
 * type Test2 = AssertTrue<IsExact<string, number>>; // error
 */
export type AssertTrue<T extends true> = T;

/**
 * Type helper: Assert that a type is false (compile-time assertion)
 * @example
 * type Test = AssertFalse<IsExact<string, number>>; // compiles
 * type Test2 = AssertFalse<IsExact<string, string>>; // error
 */
export type AssertFalse<T extends false> = T;

/**
 * Compile-time type assertion function
 * Use this to assert types at compile time without runtime overhead
 *
 * @example
 * assertType<string>('hello'); // compiles
 * assertType<string>(42); // error
 */
export function assertType<T>(_value: T): void {
  // This function exists only for type checking
  // It has no runtime behavior
}

/**
 * Assert that a value has a specific type
 *
 * @example
 * const value = 'hello';
 * expectType(value).toBeString();
 */
export function expectType<T>(value: T) {
  return expectTypeOf(value);
}

/**
 * Type helper: Make all properties in T optional
 */
export type Optional<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Type helper: Make all properties in T required
 */
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

/**
 * Type helper: Make all properties in T readonly
 */
export type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

/**
 * Type helper: Pick specific properties from T
 */
export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

/**
 * Type helper: Omit specific properties from T
 */
export type Omit<T, K extends keyof T> = {
  [P in Exclude<keyof T, K>]: T[P];
};

/**
 * Type helper: Extract types that match U from T
 */
export type Extract<T, U> = T extends U ? T : never;

/**
 * Type helper: Exclude types that match U from T
 */
export type Exclude<T, U> = T extends U ? never : T;

/**
 * Type helper: Get the return type of a function
 */
export type ReturnType<T extends (...args: any[]) => any> = T extends (...args: any[]) => infer R
  ? R
  : any;

/**
 * Type helper: Get the parameter types of a function
 */
export type Parameters<T extends (...args: any[]) => any> = T extends (...args: infer P) => any
  ? P
  : never;

/**
 * Type helper: Get the first parameter type of a function
 */
export type FirstParameter<T extends (...args: any[]) => any> = Parameters<T>[0];

/**
 * Type helper: Make a function async
 */
export type Async<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => Promise<ReturnType<T>>;

/**
 * Type helper: Get the element type of an array
 */
export type ArrayElement<T extends any[]> = T extends (infer U)[] ? U : never;

/**
 * Type helper: Create a union from object values
 */
export type ValueOf<T> = T[keyof T];

/**
 * Type helper: Create a union from object keys
 */
export type KeyOf<T> = keyof T;

/**
 * Type helper: Deep partial - make all nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Type helper: Deep readonly - make all nested properties readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Assert that two types are equal (compile-time)
 * This will cause a compile error if types don't match
 */
export type AssertEqual<T, U> = AssertTrue<IsExact<T, U>>;

/**
 * Assert that a type extends another (compile-time)
 */
export type AssertExtends<T, U extends T> = U;
