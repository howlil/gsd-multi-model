/**
 * Type-level tests for interface implementations
 *
 * Tests that classes correctly implement interfaces.
 */

import { expectTypeOf } from 'expect-type';
import { describe, it } from 'vitest';

// Define test interfaces
interface Identifiable {
  id: string;
  getId(): string;
}

interface Named {
  name: string;
  getName(): string;
}

interface Timestamped {
  createdAt: Date;
  getTimestamp(): number;
}

// Define test classes
class BaseEntity implements Identifiable {
  constructor(public id: string) {}

  getId(): string {
    return this.id;
  }
}

class NamedEntity extends BaseEntity implements Named {
  constructor(id: string, public name: string) {
    super(id);
  }

  getName(): string {
    return this.name;
  }
}

class AuditedEntity extends NamedEntity implements Timestamped {
  public createdAt: Date;

  constructor(id: string, name: string) {
    super(id, name);
    this.createdAt = new Date();
  }

  getTimestamp(): number {
    return this.createdAt.getTime();
  }
}

describe('Interface Implementations', () => {
  it('implements Identifiable interface correctly', () => {
    const entity = new BaseEntity('123');

    expectTypeOf(entity).toMatchTypeOf<Identifiable>();
    expectTypeOf(entity.id).toBeString();
    expectTypeOf(entity.getId()).toBeString();
  });

  it('implements multiple interfaces correctly', () => {
    const entity = new NamedEntity('123', 'Test');

    expectTypeOf(entity).toMatchTypeOf<Identifiable & Named>();
    expectTypeOf(entity).toMatchTypeOf<BaseEntity>();
    expectTypeOf(entity.id).toBeString();
    expectTypeOf(entity.name).toBeString();
    expectTypeOf(entity.getId()).toBeString();
    expectTypeOf(entity.getName()).toBeString();
  });

  it('implements three interfaces correctly', () => {
    const entity = new AuditedEntity('123', 'Test');

    expectTypeOf(entity).toMatchTypeOf<Identifiable & Named & Timestamped>();
    expectTypeOf(entity.id).toBeString();
    expectTypeOf(entity.name).toBeString();
    expectTypeOf(entity.createdAt).toEqualTypeOf<Date>();
    expectTypeOf(entity.getId()).toBeString();
    expectTypeOf(entity.getName()).toBeString();
    expectTypeOf(entity.getTimestamp()).toBeNumber();
  });

  it('structural typing matches interface', () => {
    const obj = {
      id: '123',
      getId() {
        return this.id;
      }
    };

    expectTypeOf(obj).toMatchTypeOf<Identifiable>();
  });

  it('class with generics implements interface', () => {
    interface Repository<T> {
      findById(id: string): T | null;
      save(entity: T): void;
    }

    class InMemoryRepository<T> implements Repository<T> {
      private items = new Map<string, T>();

      findById(id: string): T | null {
        return this.items.get(id) || null;
      }

      save(entity: T): void {
        const id = '123';
        this.items.set(id, entity);
      }
    }

    const repo = new InMemoryRepository<string>();
    expectTypeOf(repo).toMatchTypeOf<Repository<string>>();
    expectTypeOf(repo.findById('123')).toEqualTypeOf<string | null>();
    expectTypeOf(repo.save('test')).toBeVoid();
  });

  it('abstract class implements interface', () => {
    interface Shape {
      area(): number;
      perimeter(): number;
    }

    abstract class BaseShape implements Shape {
      abstract area(): number;
      abstract perimeter(): number;

      describe(): string {
        return `Area: ${this.area()}, Perimeter: ${this.perimeter()}`;
      }
    }

    class Rectangle extends BaseShape {
      constructor(private width: number, private height: number) {
        super();
      }

      area(): number {
        return this.width * this.height;
      }

      perimeter(): number {
        return 2 * (this.width + this.height);
      }
    }

    const rect = new Rectangle(10, 5);
    expectTypeOf(rect).toMatchTypeOf<Shape>();
    expectTypeOf(rect.area()).toBeNumber();
    expectTypeOf(rect.perimeter()).toBeNumber();
    expectTypeOf(rect.describe()).toBeString();
  });

  it('interface extension is type-safe', () => {
    interface Base {
      id: string;
    }

    interface Extended extends Base {
      name: string;
    }

    const base: Base = { id: '123' };
    const extended: Extended = { id: '123', name: 'Test' };

    expectTypeOf(base).toMatchTypeOf<Base>();
    expectTypeOf(extended).toMatchTypeOf<Base>();
    expectTypeOf(extended).toMatchTypeOf<Extended>();
  });

  it('interface with method signatures', () => {
    interface Calculator {
      add(a: number, b: number): number;
      subtract(a: number, b: number): number;
      multiply(a: number, b: number): number;
      divide(a: number, b: number): number;
    }

    class BasicCalculator implements Calculator {
      add(a: number, b: number): number {
        return a + b;
      }

      subtract(a: number, b: number): number {
        return a - b;
      }

      multiply(a: number, b: number): number {
        return a * b;
      }

      divide(a: number, b: number): number {
        return a / b;
      }
    }

    const calc = new BasicCalculator();
    expectTypeOf(calc).toMatchTypeOf<Calculator>();
    expectTypeOf(calc.add(1, 2)).toBeNumber();
  });

  it('interface with optional properties', () => {
    interface Config {
      required: string;
      optional?: number;
    }

    const minimal: Config = { required: 'value' };
    const full: Config = { required: 'value', optional: 42 };

    expectTypeOf(minimal).toMatchTypeOf<Config>();
    expectTypeOf(full).toMatchTypeOf<Config>();
  });

  it('interface with index signature', () => {
    interface Dictionary {
      [key: string]: number;
    }

    const dict: Dictionary = { a: 1, b: 2, c: 3 };

    expectTypeOf(dict).toMatchTypeOf<Dictionary>();
    expectTypeOf(dict['a']).toBeNumber();
  });
});
