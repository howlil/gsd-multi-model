/**
 * Type-level tests for type guards and narrowing
 *
 * Tests that type guards correctly narrow types.
 */

import { expectTypeOf } from 'expect-type';
import { describe, it } from 'vitest';

describe('Type Guards and Narrowing', () => {
  it('narrows union types with typeof guard', () => {
    function process(value: string | number) {
      if (typeof value === 'string') {
        expectTypeOf(value).toEqualTypeOf<string>();
      } else {
        expectTypeOf(value).toEqualTypeOf<number>();
      }
    }
  });

  it('narrows with instanceof guard', () => {
    class MyClass {}
    class OtherClass {}

    function process(value: MyClass | OtherClass) {
      if (value instanceof MyClass) {
        expectTypeOf(value).toEqualTypeOf<MyClass>();
      } else {
        expectTypeOf(value).toEqualTypeOf<OtherClass>();
      }
    }
  });

  it('narrows with discriminated unions', () => {
    type Circle = { kind: 'circle'; radius: number };
    type Square = { kind: 'square'; size: number };
    type Shape = Circle | Square;

    function getArea(shape: Shape): number {
      if (shape.kind === 'circle') {
        expectTypeOf(shape).toEqualTypeOf<Circle>();
        return Math.PI * shape.radius ** 2;
      } else {
        expectTypeOf(shape).toEqualTypeOf<Square>();
        return shape.size ** 2;
      }
    }
  });

  it('narrows with custom type predicate', () => {
    interface Fish {
      swim(): void;
    }

    interface Bird {
      fly(): void;
    }

    function isFish(pet: Fish | Bird): pet is Fish {
      return 'swim' in pet;
    }

    function process(pet: Fish | Bird) {
      if (isFish(pet)) {
        expectTypeOf(pet).toEqualTypeOf<Fish>();
        expectTypeOf(pet.swim).toBeFunction();
      } else {
        expectTypeOf(pet).toEqualTypeOf<Bird>();
        expectTypeOf(pet.fly).toBeFunction();
      }
    }
  });

  it('narrows with in operator', () => {
    type A = { a: string; x: number };
    type B = { b: string; x: number };

    function process(value: A | B) {
      if ('a' in value) {
        expectTypeOf(value).toEqualTypeOf<A>();
        expectTypeOf(value.a).toBeString();
      } else {
        expectTypeOf(value).toEqualTypeOf<B>();
        expectTypeOf(value.b).toBeString();
      }
    }
  });

  it('narrows with Array.isArray', () => {
    function process(value: string | string[]) {
      if (Array.isArray(value)) {
        expectTypeOf(value).toEqualTypeOf<string[]>();
      } else {
        expectTypeOf(value).toEqualTypeOf<string>();
      }
    }
  });

  it('narrows with equality check', () => {
    type Success = { status: 'success'; data: string };
    type Error = { status: 'error'; message: string };
    type Result = Success | Error;

    function process(result: Result) {
      if (result.status === 'success') {
        expectTypeOf(result).toEqualTypeOf<Success>();
        expectTypeOf(result.data).toBeString();
      } else {
        expectTypeOf(result).toEqualTypeOf<Error>();
        expectTypeOf(result.message).toBeString();
      }
    }
  });

  it('narrows with boolean cast', () => {
    function truthy(value: string | null): value is string {
      return value !== null;
    }

    function process(value: string | null) {
      if (truthy(value)) {
        expectTypeOf(value).toEqualTypeOf<string>();
        expectTypeOf(value.length).toBeNumber();
      }
    }
  });

  it('narrows with multiple type guards', () => {
    type Cat = { type: 'cat'; meow: () => void };
    type Dog = { type: 'dog'; bark: () => void };
    type Bird = { type: 'bird'; fly: () => void };
    type Animal = Cat | Dog | Bird;

    function isCat(animal: Animal): animal is Cat {
      return animal.type === 'cat';
    }

    function isDog(animal: Animal): animal is Dog {
      return animal.type === 'dog';
    }

    function process(animal: Animal) {
      if (isCat(animal)) {
        expectTypeOf(animal).toEqualTypeOf<Cat>();
        expectTypeOf(animal.meow).toBeFunction();
      } else if (isDog(animal)) {
        expectTypeOf(animal).toEqualTypeOf<Dog>();
        expectTypeOf(animal.bark).toBeFunction();
      } else {
        expectTypeOf(animal).toEqualTypeOf<Bird>();
        expectTypeOf(animal.fly).toBeFunction();
      }
    }
  });

  it('narrows with switch statement', () => {
    type Event =
      | { type: 'click'; x: number; y: number }
      | { type: 'keydown'; key: string }
      | { type: 'resize'; width: number; height: number };

    function handleEvent(event: Event) {
      switch (event.type) {
        case 'click':
          expectTypeOf(event).toEqualTypeOf<{ type: 'click'; x: number; y: number }>();
          break;
        case 'keydown':
          expectTypeOf(event).toEqualTypeOf<{ type: 'keydown'; key: string }>();
          break;
        case 'resize':
          expectTypeOf(event).toEqualTypeOf<{ type: 'resize'; width: number; height: number }>();
          break;
      }
    }
  });
});
