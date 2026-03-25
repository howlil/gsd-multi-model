/**
 * Type-level tests for generic type inference
 *
 * Tests that generic types are inferred correctly across the codebase.
 */

import { expectTypeOf } from 'expect-type';
import { describe, it } from 'vitest';

// Type utilities for testing
type IsExact<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;
type AssertTrue<T extends true> = T;

describe('Generic Type Inference', () => {
  it('infers generic function return types correctly', () => {
    // Test basic generic inference
    function identity<T>(value: T): T {
      return value;
    }

    const stringResult = identity('hello');
    const numberResult = identity(42);

    expectTypeOf(stringResult).toEqualTypeOf<string>();
    expectTypeOf(numberResult).toEqualTypeOf<number>();
  });

  it('infers array generic types correctly', () => {
    function wrapInArray<T>(value: T): T[] {
      return [value];
    }

    const stringArray = wrapInArray('hello');
    const numberArray = wrapInArray(42);

    expectTypeOf(stringArray).toEqualTypeOf<string[]>();
    expectTypeOf(numberArray).toEqualTypeOf<number[]>();
  });

  it('infers promise generic types correctly', () => {
    async function asyncValue<T>(value: T): Promise<T> {
      return value;
    }

    expectTypeOf(asyncValue('hello')).toEqualTypeOf<Promise<string>>();
    expectTypeOf(asyncValue(42)).toEqualTypeOf<Promise<number>>();
  });

  it('infers callback generic types correctly', () => {
    function mapArray<T, U>(array: T[], fn: (item: T) => U): U[] {
      return array.map(fn);
    }

    const result = mapArray([1, 2, 3], (n) => String(n));
    expectTypeOf(result).toEqualTypeOf<string[]>();
  });

  it('infers constrained generic types correctly', () => {
    interface HasId {
      id: string;
    }

    function getId<T extends HasId>(item: T): string {
      return item.id;
    }

    const item = { id: '123', name: 'Test' };
    const result = getId(item);

    expectTypeOf(result).toEqualTypeOf<string>();
  });

  it('narrows types correctly with type guards', () => {
    function isString(value: unknown): value is string {
      return typeof value === 'string';
    }

    const value: string | number = 'hello';

    if (isString(value)) {
      expectTypeOf(value).toEqualTypeOf<string>();
    }
  });

  it('infers conditional types correctly', () => {
    type IsArray<T> = T extends any[] ? true : false;

    expectTypeOf<IsArray<string[]>>().toEqualTypeOf<true>();
    expectTypeOf<IsArray<string>>().toEqualTypeOf<false>();
  });

  it('infers mapped types correctly', () => {
    type Readonly<T> = {
      readonly [P in keyof T]: T[P];
    };

    interface User {
      id: string;
      name: string;
    }

    expectTypeOf<Readonly<User>>().toMatchTypeOf<{ readonly id: string; readonly name: string }>();
  });

  it('infers utility types correctly', () => {
    interface User {
      id: string;
      name: string;
      email: string;
    }

    type PartialUser = Partial<User>;
    type RequiredUser = Required<PartialUser>;

    expectTypeOf<PartialUser>().toMatchTypeOf<{ id?: string; name?: string; email?: string }>();
    expectTypeOf<RequiredUser>().toMatchTypeOf<{ id: string; name: string; email: string }>();
  });

  it('infers function overload types correctly', () => {
    function overload(x: string): string;
    function overload(x: number): number;
    function overload(x: string | number): string | number {
      return x;
    }

    expectTypeOf(overload('hello')).toEqualTypeOf<string>();
    expectTypeOf(overload(42)).toEqualTypeOf<number>();
  });
});
