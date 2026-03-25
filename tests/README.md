# Test Files Documentation

This document describes the test directory structure, naming conventions, and organization patterns for the ez-agents project.

## Directory Structure

```
tests/
├── README.md                 # This file - test documentation
├── helpers.ts                # Legacy helpers (deprecated, use helpers/ directory)
├── test-utils.ts             # Test utilities
├── unit/                     # Unit tests
│   ├── *.test.ts            # Unit test files
│   └── ...
├── integration/              # Integration tests
│   ├── *.test.ts            # Integration test files
│   └── *.integration.test.ts # Explicitly marked integration tests
├── types/                    # Type-level tests
│   └── *.types.test.ts      # Type test files
├── helpers/                  # Test helper classes and utilities
│   ├── index.ts             # Barrel export for all helpers
│   ├── TestFixture.ts       # Abstract base class for test fixtures
│   ├── TestContext.ts       # Shared state management
│   ├── MockFactory.ts       # Standardized mock creation
│   ├── TestDataBuilder.ts   # Fluent test data builders
│   ├── AssertionHelper.ts   # Reusable assertion patterns
│   └── TestHelpers.ts       # Utility functions
├── utils/                    # Test utilities
│   ├── README.md            # Utilities documentation
│   ├── TestConfig.ts        # Test configuration management
│   └── TestRunner.ts        # Test execution utilities
└── fixtures/                 # Test data files
    ├── sample-roadmap.md     # Sample roadmap for parsing tests
    ├── sample-requirements.md # Sample requirements for parsing tests
    ├── sample-plan.md        # Sample plan for parsing tests
    ├── sample-summary.md     # Sample summary for parsing tests
    ├── valid-config.json     # Valid configuration for config tests
    └── invalid-config.json   # Invalid configuration for validation tests
```

## Naming Conventions

### Test File Types

| Pattern | Purpose | Example |
|---------|---------|---------|
| `*.test.ts` | Unit tests | `tests/unit/context-manager.test.ts` |
| `*.test.ts` | Integration tests | `tests/integration/circuit-breaker.test.ts` |
| `*.integration.test.ts` | Explicitly marked integration tests | `tests/integration/api.integration.test.ts` |
| `*.types.test.ts` | Type-level tests | `tests/types/agent.types.test.ts` |

### Test File Organization

- **Unit tests**: Tests that verify individual functions, classes, or modules in isolation
  - Location: `tests/unit/`
  - Named after the module being tested: `<module>.test.ts`

- **Integration tests**: Tests that verify interactions between multiple modules
  - Location: `tests/integration/`
  - Named after the integration being tested: `<integration>.test.ts`

- **Type tests**: Tests that verify TypeScript type correctness
  - Location: `tests/types/`
  - Named with `.types.test.ts` suffix: `<feature>.types.test.ts`

## Test File Structure

All test files should follow a consistent structure using `describe` and `test` blocks:

```typescript
/**
 * <Module Name> Tests
 */

import { test, describe, beforeEach, afterEach } from 'vitest';
import assert from 'node:assert';
// Import helpers as needed
import { MockFactory, TestFixture } from '../helpers';

describe('<module or feature name>', () => {
  // Optional setup
  let context: any;

  beforeEach(() => {
    // Common setup for all tests
    context = {};
  });

  afterEach(() => {
    // Common cleanup for all tests
    context = null;
  });

  describe('<sub-feature or method name>', () => {
    test('should [expected behavior] when [condition]', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionUnderTest(input);

      // Assert
      assert.strictEqual(result, expected);
    });

    test('should [handle edge case] when [boundary condition]', () => {
      // Test implementation
    });
  });
});
```

### Test Naming Pattern

Test names should follow the pattern:
```
should [expected behavior] when [condition]
```

Examples:
- `should return true when input is valid`
- `should throw error when required parameter is missing`
- `should cache result when same input provided twice`

### Test Case Length

- **Maximum**: 100 lines per `test()` block
- **Target**: < 50 lines per `test()` block
- Each test should verify **ONE** behavior only
- If a test exceeds 100 lines, split into multiple focused tests

## Import Patterns

### Importing Helpers

Use the barrel export from `tests/helpers`:

```typescript
import {
  TestFixture,
  TestContext,
  MockFactory,
  TestDataBuilder,
  AssertionHelper,
  TestHelpers
} from '../helpers';
```

### Importing Fixtures

Reference fixtures from `tests/fixtures/`:

```typescript
import { readFileSync } from 'fs';
import path from 'path';

const fixturePath = path.join(__dirname, '..', 'fixtures', 'sample-plan.md');
const fixtureContent = readFileSync(fixturePath, 'utf-8');
```

## Helper Classes

### TestFixture

Abstract base class for test setup/teardown:

```typescript
abstract class TestFixture<TContext = any> {
  protected context: TContext;

  abstract setUp(): Promise<void> | void;
  abstract tearDown(): Promise<void> | void;

  protected beforeEach(): void;
  protected afterEach(): void;
}
```

### TestContext

Shared state management across tests:

```typescript
class TestContext {
  set<T>(key: string, value: T): void;
  get<T>(key: string): T | undefined;
  snapshot(key: string): void;
  restore(key: string): void;
  cleanup(): void;
}
```

### MockFactory

Standardized mock object creation:

```typescript
class MockFactory {
  static createAgent(overrides?: Partial<Agent>): Agent;
  static createPhase(overrides?: Partial<Phase>): Phase;
  static createSkill(overrides?: Partial<Skill>): Skill;
  static createSession(overrides?: Partial<Session>): Session;
  static createMock<T>(type: new (...args: any[]) => T, overrides?: Partial<T>): T;
}
```

### TestDataBuilder

Fluent builders for test data:

```typescript
class AgentBuilder {
  withId(id: string): this;
  withName(name: string): this;
  withModel(model: string): this;
  build(): Agent;
}
```

### AssertionHelper

Reusable assertion patterns:

```typescript
class AssertionHelper {
  static expectToHaveProperties<T>(obj: T, properties: (keyof T)[]): void;
  static expectToBeValidSchema(obj: any, schema: object): void;
  static expectToMatchSnapshot(obj: any, name?: string): void;
  static expectToCompleteInTime(fn: () => void, maxMs: number): void;
}
```

## Best Practices

1. **Keep tests focused**: Each test should verify one behavior
2. **Use helpers**: Leverage TestFixture, MockFactory, and TestDataBuilder to reduce duplication
3. **Clear naming**: Test names should clearly describe the expected behavior
4. **Arrange-Act-Assert**: Structure tests with clear AAA pattern
5. **No magic numbers**: Use named constants for test values
6. **Clean teardown**: Always clean up resources in afterEach
7. **Fast tests**: Unit tests should complete in < 100ms each
8. **Isolated tests**: Tests should not depend on execution order

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run tests/unit/context-manager.test.ts

# Run tests matching pattern
npx vitest run -t "should return true"

# Run type tests
npx tsc --noEmit tests/types/*.types.test.ts
```

## Coverage Requirements

- **Minimum coverage**: 70% line coverage
- **Target coverage**: 80%+ line coverage
- Coverage report generated in `coverage/` directory
- Coverage threshold enforced in CI/CD pipeline
