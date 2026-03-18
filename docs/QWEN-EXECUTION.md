# Qwen Execution Workflow

**Manual Execution Guide for Qwen Provider**

This guide shows how to execute planned tasks using Qwen models in EZ Agents.

---

## Overview

The execution workflow transforms plans into working code using Qwen models optimized for implementation tasks.

### Execution Principles

1. **Follow the Plan** - Execute tasks as specified in planning documents
2. **Use Right Model** - qwen-plus for most tasks, qwen-max for complex logic
3. **Verify Continuously** - Test after each task
4. **Document Changes** - Update STATE.md and create SUMMARY.md

---

## Pre-Execution Checklist

Before starting execution:

```bash
# 1. Verify planning is complete
ez-agents validate-phase "1"

# 2. Check requirements traceability
cat .planning/REQUIREMENTS.md

# 3. Review architecture
cat docs/ARCHITECTURE.md

# 4. Check roadmap
cat .planning/ROADMAP.md

# 5. Ensure Qwen provider configured
node ez-agents/bin/ez-tools.cjs config get qwen
```

---

## Execution Steps

### Step 1: Create Execution Plan

Based on planning, create detailed execution plan:

`.planning/phases/02-foundation/01-PLAN.md`:

```markdown
---
phase: 02
plan: 01
type: execution
wave: 1
depends_on: ["01-01"]
files_modified:
  - src/index.js
  - src/config.js
  - package.json
autonomous: true
must_haves:
  artifacts:
    - path: src/index.js
      min_lines: 50
      exports: ["main", "init", "config"]
    - path: src/config.js
      min_lines: 30
      contains: "environment variables"
  key_links:
    - from: src/index.js
      to: docs/ARCHITECTURE.md
      via: "initialization"
---

# Phase 2: Foundation Implementation

## Objective

Implement project foundation following architecture specifications.

## Tasks

<task>
  <name>Initialize Project Structure</name>
  <action>
    Create project structure:
    1. Initialize package.json with dependencies
    2. Create src/ directory structure
    3. Set up build configuration
    4. Configure ESLint and Prettier
  </action>
  <verify>
    - npm install succeeds
    - npm run build succeeds
    - npm run lint passes with no errors
    - Directory structure matches architecture
  </verify>
  <done>
    Project builds and lints successfully
  </done>
  <files>
    - package.json
    - src/index.js
    - src/config/index.js
    - .eslintrc.js
    - .prettierrc
  </files>
  <model>qwen-plus</model>
  <temperature>0.3</temperature>
  <max_tokens>4096</max_tokens>
</task>

<task>
  <name>Implement Configuration Module</name>
  <action>
    Create configuration system:
    1. Environment variable loading
    2. Configuration validation
    3. Default values
    4. Environment-specific configs
  </action>
  <verify>
    - Config loads from .env file
    - Invalid config throws error
    - Defaults applied correctly
    - Unit tests pass
  </verify>
  <done>
    Configuration module complete and tested
  </done>
  <files>
    - src/config/index.js
    - src/config/validator.js
    - tests/config.test.js
  </files>
  <model>qwen-plus</model>
  <temperature>0.3</temperature>
  <max_tokens>4096</max_tokens>
</task>

<task>
  <name>Implement Main Entry Point</name>
  <action>
    Create main application entry:
    1. Import configuration
    2. Initialize logging
    3. Set up error handling
    4. Export main function
  </action>
  <verify>
    - Application starts without errors
    - Configuration loaded correctly
    - Logging configured
    - Error handlers registered
  </verify>
  <done>
    Main entry point functional
  </done>
  <files>
    - src/index.js
  </files>
  <model>qwen-plus</model>
  <temperature>0.3</temperature>
  <max_tokens>4096</max_tokens>
</task>

## Success Criteria

1. ✅ Project builds without errors
2. ✅ All tests pass
3. ✅ Linting passes
4. ✅ Configuration loads correctly

## Model Configuration

```json
{
  "provider": "qwen",
  "model": "qwen-plus",
  "temperature": 0.3,
  "max_tokens": 4096,
  "top_p": 0.8,
  "frequency_penalty": 0.1
}
```
```

### Step 2: Execute Tasks

#### Execute Task 1: Project Setup

```bash
# Run ez-agents for task execution
node ez-agents/bin/ez-tools.cjs init execute-phase "2"
```

**Expected Output:**

```
=== Executing Phase 2: Foundation ===
Task 1: Initialize Project Structure
  → Using Qwen-Plus (temperature: 0.3)
  → Generating package.json...
  → Creating src/ directory...
  → Setting up build config...
  ✓ Task complete

Task 2: Implement Configuration Module
  → Using Qwen-Plus (temperature: 0.3)
  → Generating config module...
  → Adding validation...
  → Writing tests...
  ✓ Task complete

Task 3: Implement Main Entry Point
  → Using Qwen-Plus (temperature: 0.3)
  → Creating index.js...
  → Adding error handling...
  ✓ Task complete

=== Execution Summary ===
Tasks completed: 3/3
Files created: 8
Tests written: 5
Build status: ✓ Passing
```

### Step 3: Verify Execution

After each task, verify the output:

```bash
# Run build
npm run build

# Run tests
npm test

# Run linter
npm run lint

# Check file structure
ls -la src/
```

### Step 4: Create Summary

Create `.planning/phases/02-foundation/01-SUMMARY.md`:

```markdown
# Summary 02-01: Foundation Implementation

## Completed Tasks

### Task 1: Initialize Project Structure
**Status:** ✅ Complete

**Files Created:**
- `package.json` - Project configuration with dependencies
- `src/index.js` - Main entry point
- `src/config/index.js` - Configuration module
- `.eslintrc.js` - ESLint configuration
- `.prettierrc` - Prettier configuration

**Implementation Details:**
- Set up Express.js with essential middleware
- Configured Babel for ES6+ transpilation
- Added Jest for testing
- Configured ESLint with Airbnb rules

**Commits:**
- `abc1234` - Initial project setup
- `def5678` - Add build configuration
- `ghi9012` - Configure linting and testing

### Task 2: Implement Configuration Module
**Status:** ✅ Complete

**Files Created:**
- `src/config/index.js` (85 lines)
- `src/config/validator.js` (62 lines)
- `tests/config.test.js` (120 lines)

**Implementation Details:**
- Environment variable loading with dotenv
- Schema-based validation
- Default values for all config options
- Environment-specific configurations

**Test Coverage:**
- 15 test cases
- 100% branch coverage
- All edge cases covered

**Commits:**
- `jkl3456` - Implement config loader
- `mno7890` - Add validation
- `pqr1234` - Write unit tests

### Task 3: Implement Main Entry Point
**Status:** ✅ Complete

**Files Created:**
- `src/index.js` (95 lines)

**Implementation Details:**
- Clean module exports
- Error handling with graceful degradation
- Logging integration
- Configuration initialization

**Commits:**
- `stu5678` - Create main entry point

## Build Status

```bash
$ npm run build
> Build successful
> Output: dist/index.js (45KB)

$ npm test
> 23 passing (1.2s)
> Coverage: 92%

$ npm run lint
> No linting errors
```

## Files Modified

| File | Lines | Status |
|------|-------|--------|
| package.json | 65 | Created |
| src/index.js | 95 | Created |
| src/config/index.js | 85 | Created |
| src/config/validator.js | 62 | Created |
| tests/config.test.js | 120 | Created |
| .eslintrc.js | 30 | Created |
| .prettierrc | 15 | Created |

**Total:** 472 lines across 7 files

## Self-Check

✅ All tasks completed
✅ All tests passing (23/23)
✅ Build successful
✅ No linting errors
✅ Code coverage > 90%
✅ Documentation updated

## Issues Encountered

None - all tasks completed successfully on first attempt.

## Next Steps

1. Phase 3: Implement core business logic
2. Phase 4: Add API endpoints
3. Phase 5: Database integration
```

### Step 5: Update State

Update `.planning/STATE.md`:

```markdown
# Session State

## Current Position

**Milestone:** v1.0 MVP
**Current phase:** 2 (Foundation)
**Status:** Complete

## Progress

- Phase 1 (Planning): ✅ Complete
- Phase 2 (Foundation): ✅ Complete
- Phase 3 (Core Features): ⏳ Next

## Metrics

| Phase | Plans | Completed | Files | Tests | Coverage |
|-------|-------|-----------|-------|-------|----------|
| 1 | 1 | 1 | 5 | 0 | N/A |
| 2 | 1 | 1 | 7 | 23 | 92% |

## Session Log

- 2026-03-18: Phase 2 execution complete
  - 3 tasks implemented
  - 472 lines of code
  - 23 tests passing
  - 92% coverage
```

---

## Advanced Execution Patterns

### Pattern 1: Parallel Execution

For independent tasks, use wave execution:

```markdown
---
wave: 2
depends_on: ["01-01"]
---

# Wave 2: Parallel Implementation

## Independent Tasks

<task wave="2">
  <name>User Model</name>
  <files>
    - src/models/user.js
  </files>
</task>

<task wave="2">
  <name>Product Model</name>
  <files>
    - src/models/product.js
  </files>
</task>

<task wave="2">
  <name>Order Model</name>
  <files>
    - src/models/order.js
  </files>
</task>
```

### Pattern 2: Checkpoint Tasks

For long-running executions, add checkpoints:

```markdown
<task type="checkpoint">
  <name>Models Complete</name>
  <verify>
    - User model implemented
    - Product model implemented
    - Order model implemented
    - All tests passing
  </verify>
</task>
```

### Pattern 3: Iterative Refinement

For complex tasks, use multiple iterations:

```markdown
<task iterations="3">
  <name>Authentication System</name>
  <iteration>
    <number>1</number>
    <focus>Basic JWT auth</focus>
  </iteration>
  <iteration>
    <number>2</number>
    <focus>Add refresh tokens</focus>
  </iteration>
  <iteration>
    <number>3</number>
    <focus>Add OAuth providers</focus>
  </iteration>
</task>
```

---

## Model Configuration Reference

### Standard Execution

```json
{
  "provider": "qwen",
  "model": "qwen-plus",
  "temperature": 0.3,
  "max_tokens": 4096,
  "top_p": 0.8,
  "frequency_penalty": 0.1,
  "presence_penalty": 0.1
}
```

### Complex Logic

```json
{
  "provider": "qwen",
  "model": "qwen-max",
  "temperature": 0.4,
  "max_tokens": 8192,
  "top_p": 0.85
}
```

### Quick Tasks

```json
{
  "provider": "qwen",
  "model": "qwen-turbo",
  "temperature": 0.3,
  "max_tokens": 2048
}
```

---

## Common Execution Scenarios

### Scenario 1: API Endpoint Implementation

```markdown
<task>
  <name>REST API Endpoints</name>
  <action>
    Implement CRUD endpoints:
    1. GET /items - List all items
    2. GET /items/:id - Get single item
    3. POST /items - Create item
    4. PUT /items/:id - Update item
    5. DELETE /items/:id - Delete item
  </action>
  <verify>
    - All endpoints respond
    - Proper status codes
    - Input validation
    - Error handling
  </verify>
  <files>
    - src/routes/items.js
    - src/controllers/items.js
    - tests/items.test.js
  </files>
  <model>qwen-plus</model>
</task>
```

### Scenario 2: Database Integration

```markdown
<task>
  <name>Database Setup</name>
  <action>
    Set up database:
    1. Install Sequelize ORM
    2. Configure database connection
    3. Create migrations
    4. Create models
  </action>
  <verify>
    - Database connects
    - Migrations run
    - Models defined correctly
  </verify>
  <files>
    - src/database/index.js
    - src/database/migrations/*.js
    - src/models/*.js
  </files>
  <model>qwen-plus</model>
</task>
```

### Scenario 3: Testing Implementation

```markdown
<task>
  <name>Unit Tests</name>
  <action>
    Write comprehensive tests:
    1. Unit tests for all modules
    2. Integration tests for APIs
    3. Mock external services
  </action>
  <verify>
    - Coverage > 80%
    - All tests pass
    - Edge cases covered
  </verify>
  <files>
    - tests/**/*.test.js
  </files>
  <model>qwen-plus</model>
  <temperature>0.2</temperature>
</task>
```

---

## Troubleshooting

### Issue: Build Errors

**Solution:**
1. Check error message
2. Verify dependencies installed
3. Run `npm install` again
4. Check Node.js version

### Issue: Test Failures

**Solution:**
1. Read test output carefully
2. Check test expectations
3. Verify implementation matches spec
4. Debug with console.log

### Issue: Linting Errors

**Solution:**
1. Run `npm run lint -- --fix`
2. Check ESLint rules
3. Manually fix complex issues
4. Update .eslintrc if needed

---

## Best Practices

1. **Commit Frequently** - One commit per task
2. **Write Tests First** - TDD approach
3. **Document as You Go** - Update docs with code
4. **Verify Continuously** - Test after each change
5. **Use Right Temperature** - Lower for precise code

---

## Next Steps

- [Verification Workflow](QWEN-VERIFICATION.md) - How to verify implementation
- [Planning Workflow](QWEN-PLANNING.md) - Planning reference
- [Provider Guide](QWEN-PROVIDER.md) - Complete documentation
