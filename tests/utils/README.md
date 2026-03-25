# Test Utilities Documentation

This directory contains test utilities for the ez-agents project.

## Available Utilities

### TestConfig

Singleton configuration management for tests.

```typescript
import { TestConfig } from '../utils/TestConfig';

const config = TestConfig.getInstance();
config.load('./test-config.json');
const value = config.get<string>('apiKey');
config.reset();
```

**Location:** `tests/utils/TestConfig.ts`

### TestRunner

Chainable test execution utility.

```typescript
import { TestRunner } from '../utils/TestRunner';

const runner = new TestRunner();
const result = await runner
  .setup(() => initialize())
  .teardown(() => cleanup())
  .timeout(5000)
  .runTest('should work', async () => {
    // test logic
  });
```

**Location:** `tests/utils/TestRunner.ts`

## Helper Classes (in tests/helpers/)

### TestFixture

Abstract base class for test setup/teardown.

```typescript
import { TestFixture } from '../helpers';

class MyTestFixture extends TestFixture<{ db: Database }> {
  async setUp() {
    this.context.db = await createTestDatabase();
  }

  async tearDown() {
    await this.context.db.destroy();
  }
}
```

**Location:** `tests/helpers/Fixture.ts`

### TestContext

Shared state management with snapshot/restore.

```typescript
import { TestContext } from '../helpers';

const ctx = new TestContext();
ctx.set('userId', '123');
ctx.snapshot('before-change');
ctx.set('userId', '456');
ctx.restore('before-change');
```

**Location:** `tests/helpers/TestContext.ts`

### MockFactory

Standardized mock object creation.

```typescript
import { MockFactory } from '../helpers';

const agent = MockFactory.createAgent({ id: 'custom-id' });
const phase = MockFactory.createPhase({ status: 'in-progress' });
```

**Location:** `tests/helpers/MockFactory.ts`

### TestDataBuilder

Fluent builders for test data.

```typescript
import { AgentBuilder, PhaseBuilder } from '../helpers';

const agent = new AgentBuilder()
  .withId('agent-123')
  .withName('Test Agent')
  .withSkill('research')
  .build();

const phase = new PhaseBuilder()
  .withStatus('in-progress')
  .build();
```

**Location:** `tests/helpers/TestDataBuilder.ts`

### AssertionHelper

Reusable assertion patterns.

```typescript
import { AssertionHelper } from '../helpers';

AssertionHelper.expectToHaveProperties(user, ['id', 'name', 'email']);
AssertionHelper.expectToCompleteInTime(() => operation(), 1000);
AssertionHelper.expectToThrow(() => invalidOp(), 'Expected error');
```

**Location:** `tests/helpers/AssertionHelper.ts`

### TestHelpers

Utility functions for test operations.

```typescript
import {
  createTestFile,
  createTestDirectory,
  assertFileExists,
  assertFileContains,
  runCommand
} from '../helpers';

const filePath = createTestFile('test.txt', 'content');
assertFileExists(filePath);
assertFileContains(filePath, 'content');
```

**Location:** `tests/helpers/TestHelpers.ts`

## Import Shortcuts

All helpers can be imported from a single location:

```typescript
import {
  TestFixture,
  TestContext,
  MockFactory,
  AgentBuilder,
  PhaseBuilder,
  SkillBuilder,
  SessionBuilder,
  AssertionHelper,
  createTestFile,
  createTestDirectory,
  assertFileExists,
  assertFileContains
} from '../helpers';
```

## Best Practices

1. **Use builders for complex objects**: TestDataBuilder provides clear, readable test data construction
2. **Use MockFactory for simple mocks**: Quick mock creation with sensible defaults
3. **Use AssertionHelper for common assertions**: Reduces duplication and improves readability
4. **Use TestContext for state management**: Especially useful when tests need snapshot/restore
5. **Use TestFixture for lifecycle management**: Consistent setup/teardown pattern across tests

## When to Use Each Utility

| Utility | Use When |
|---------|----------|
| TestFixture | You need consistent setup/teardown across multiple tests |
| TestContext | Tests need shared state with snapshot/restore capability |
| MockFactory | You need quick mock objects with default values |
| TestDataBuilder | You need to build complex objects with fluent API |
| AssertionHelper | You need common assertion patterns |
| TestHelpers | You need file/command utilities for tests |
| TestConfig | You need to manage test configuration |
| TestRunner | You need programmatic test execution |
