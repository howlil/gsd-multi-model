# Qwen Planning Workflow

**Manual Planning Guide for Qwen Provider**

This guide shows how to perform manual planning using Qwen models in EZ Agents.

---

## Overview

The planning workflow consists of three phases:

1. **Planning** - Design architecture and create task breakdown
2. **Execution** - Implement the planned tasks
3. **Verification** - Validate implementation against requirements

---

## Phase 1: Planning with Qwen

### Step 1: Initialize Planning Session

```bash
# Start new project with Qwen
ez-agents new-project

# Or add Qwen to existing project
ez-agents set-profile --provider qwen --model qwen-max
```

### Step 2: Create Planning Document

Create `.planning/phases/01-planning/01-PLAN.md`:

```markdown
---
phase: 01
plan: 01
type: planning
wave: 1
depends_on: []
files_modified: []
autonomous: true
must_haves:
  - artifacts:
      - path: docs/ARCHITECTURE.md
        min_lines: 50
      - path: docs/REQUIREMENTS.md
        min_lines: 30
  - key_links:
      - from: docs/ARCHITECTURE.md
        to: docs/REQUIREMENTS.md
        via: "REQ-\\d+"
---

# Phase 1: Project Planning

## Objective

Create comprehensive project architecture and requirements using Qwen-Max for complex reasoning.

## Tasks

<task>
  <name>Requirements Analysis</name>
  <action>
    Use Qwen-Max to analyze project requirements and create detailed specification.
    Focus on:
    - Functional requirements
    - Non-functional requirements
    - User stories
    - Acceptance criteria
  </action>
  <verify>
    - All requirements documented in REQUIREMENTS.md
    - Each requirement has unique ID (REQ-001, REQ-002, etc.)
    - Requirements are testable and measurable
  </verify>
  <done>
    Requirements document complete with stakeholder approval
  </done>
  <files>
    - docs/REQUIREMENTS.md
    - .planning/REQUIREMENTS.md
  </files>
  <model>qwen-max</model>
  <temperature>0.7</temperature>
  <max_tokens>4096</max_tokens>
</task>

<task>
  <name>Architecture Design</name>
  <action>
    Use Qwen-Max to design system architecture.
    Include:
    - System components
    - Data flow diagrams
    - Technology stack
    - Integration points
    - Security considerations
  </action>
  <verify>
    - Architecture document complete
    - All components documented
    - Data flows clearly defined
    - Technology choices justified
  </verify>
  <done>
    Architecture reviewed and approved
  </done>
  <files>
    - docs/ARCHITECTURE.md
  </files>
  <model>qwen-max</model>
  <temperature>0.7</temperature>
  <max_tokens>8192</max_tokens>
</task>

<task>
  <name>Task Breakdown</name>
  <action>
    Use Qwen-Max to break down work into manageable tasks.
    Create:
    - Phase 2: Foundation tasks
    - Phase 3: Core features
    - Phase 4: Testing
  </action>
  <verify>
    - Tasks are atomic and actionable
    - Dependencies identified
    - Estimated effort for each task
  </verify>
  <done>
    Complete task breakdown in ROADMAP.md
  </done>
  <files>
    - .planning/ROADMAP.md
  </files>
  <model>qwen-max</model>
  <temperature>0.6</temperature>
  <max_tokens>4096</max_tokens>
</task>

## Success Criteria

1. ✅ Requirements document with 20+ requirements
2. ✅ Architecture document with diagrams
3. ✅ Complete roadmap with 3+ phases
4. ✅ All stakeholders reviewed and approved

## Model Configuration

```json
{
  "provider": "qwen",
  "model": "qwen-max",
  "temperature": 0.7,
  "max_tokens": 8192,
  "top_p": 0.9,
  "presence_penalty": 0.1
}
```

## Prompt Template

```
You are an expert software architect and business analyst.

## Context
{PROJECT_CONTEXT}

## Task
{SPECIFIC_TASK}

## Requirements
- Analyze thoroughly
- Think step by step
- Provide detailed output
- Use markdown formatting
- Include examples where helpful

## Output Format
{OUTPUT_FORMAT}
```
```

### Step 3: Execute Planning

```bash
# Run planning phase
ez-agents plan-phase "Create project architecture and requirements"

# Or manually
node ez-agents/bin/ez-tools.cjs init plan-phase "1"
```

### Step 4: Review Planning Output

Check generated documents:
- `.planning/REQUIREMENTS.md` - Requirements traceability
- `docs/REQUIREMENTS.md` - Detailed requirements
- `docs/ARCHITECTURE.md` - System architecture
- `.planning/ROADMAP.md` - Project roadmap

---

## Phase 2: Execution with Qwen

### Step 1: Create Execution Plan

Create `.planning/phases/02-execution/01-PLAN.md`:

```markdown
---
phase: 02
plan: 01
type: execution
wave: 1
depends_on: ["01-01"]
files_modified: []
autonomous: true
must_haves:
  - artifacts:
      - path: src/index.js
        min_lines: 100
        exports: ["main", "init"]
  - key_links:
      - from: src/index.js
        to: docs/ARCHITECTURE.md
        via: "architecture"
---

# Phase 2: Foundation Implementation

## Objective

Implement project foundation using Qwen-Plus for balanced performance.

## Tasks

<task>
  <name>Project Setup</name>
  <action>
    Use Qwen-Plus to initialize project structure.
    Create:
    - Package configuration
    - Directory structure
    - Build configuration
    - Linting rules
  </action>
  <verify>
    - npm install succeeds
    - npm run build succeeds
    - npm run lint passes
  </verify>
  <done>
    Project builds without errors
  </done>
  <files>
    - package.json
    - src/index.js
    - .eslintrc.js
  </files>
  <model>qwen-plus</model>
  <temperature>0.3</temperature>
  <max_tokens>4096</max_tokens>
</task>

<task>
  <name>Core Module Implementation</name>
  <action>
    Use Qwen-Plus to implement core modules.
    Follow architecture specifications.
  </action>
  <verify>
    - All modules implemented
    - Unit tests passing
    - Code coverage > 80%
  </verify>
  <done>
    Core modules complete and tested
  </done>
  <files>
    - src/modules/*.js
  </files>
  <model>qwen-plus</model>
  <temperature>0.3</temperature>
  <max_tokens>8192</max_tokens>
</task>

## Model Configuration

```json
{
  "provider": "qwen",
  "model": "qwen-plus",
  "temperature": 0.3,
  "max_tokens": 8192,
  "top_p": 0.8
}
```
```

### Step 2: Execute Implementation

```bash
# Execute phase
ez-agents execute-phase "2"

# Or manually
node ez-agents/bin/ez-tools.cjs init execute-phase "2"
```

---

## Phase 3: Verification with Qwen

### Step 1: Create Verification Plan

Create `.planning/phases/03-verification/01-PLAN.md`:

```markdown
---
phase: 03
plan: 01
type: verification
wave: 1
depends_on: ["02-01", "02-02"]
files_modified: []
autonomous: false
must_haves:
  - artifacts:
      - path: tests/verification-report.md
        min_lines: 50
---

# Phase 3: Verification & Quality Assurance

## Objective

Verify implementation against requirements using Qwen-Plus.

## Tasks

<task>
  <name>Requirements Traceability</name>
  <action>
    Use Qwen-Plus to verify each requirement is implemented.
    Create traceability matrix.
  </action>
  <verify>
    - Each requirement linked to implementation
    - Gaps identified and documented
  </verify>
  <done>
    Traceability matrix complete
  </done>
  <files>
    - .planning/REQUIREMENTS.md
    - tests/traceability-matrix.md
  </files>
  <model>qwen-plus</model>
  <temperature>0.2</temperature>
</task>

<task>
  <name>Code Quality Review</name>
  <action>
    Use Qwen-Plus to review code quality.
    Check:
    - Code style consistency
    - Best practices
    - Security vulnerabilities
    - Performance issues
  </action>
  <verify>
    - Code review report generated
    - Issues categorized by severity
    - Remediation plan created
  </verify>
  <done>
    Code review complete with action items
  </done>
  <files>
    - tests/code-review-report.md
  </files>
  <model>qwen-plus</model>
  <temperature>0.2</temperature>
</task>

<task>
  <name>Test Verification</name>
  <action>
    Use Qwen-Plus to verify test coverage.
    Ensure:
    - Unit tests exist for all modules
    - Integration tests for critical paths
    - E2E tests for user journeys
  </action>
  <verify>
    - Test coverage report generated
    - Coverage meets threshold (>80%)
  </verify>
  <done>
    Test coverage verified
  </done>
  <files>
    - tests/coverage-report.md
  </files>
  <model>qwen-turbo</model>
  <temperature>0.1</temperature>
</task>

## Success Criteria

1. ✅ All requirements traced to implementation
2. ✅ Code review completed
3. ✅ Test coverage > 80%
4. ✅ No critical security issues

## Model Configuration

```json
{
  "provider": "qwen",
  "model": "qwen-plus",
  "temperature": 0.2,
  "max_tokens": 4096
}
```
```

### Step 2: Execute Verification

```bash
# Verify work
ez-agents verify-work "2"

# Or manually
node ez-agents/bin/ez-tools.cjs init verify-work "2"
```

---

## Complete Workflow Example

### Full Session Script

```bash
#!/bin/bash

# Set Qwen provider
export DASHSCOPE_API_KEY="sk-your-key"

# Phase 1: Planning
echo "=== Phase 1: Planning ==="
ez-agents new-project
ez-agents plan-phase "Design e-commerce platform architecture"

# Review planning output
cat docs/ARCHITECTURE.md
cat docs/REQUIREMENTS.md

# Phase 2: Execution
echo "=== Phase 2: Execution ==="
ez-agents execute-phase "1"

# Review implementation
npm run build
npm test

# Phase 3: Verification
echo "=== Phase 3: Verification ==="
ez-agents verify-work "1"

# Review verification
cat tests/verification-report.md

# Complete phase
ez-agents complete-milestone "1.0"
```

---

## Model Selection Guide

| Phase | Model | Temperature | Max Tokens | Purpose |
|-------|-------|-------------|------------|---------|
| Planning | qwen-max | 0.6-0.8 | 4096-8192 | Complex reasoning |
| Execution | qwen-plus | 0.2-0.4 | 4096-8192 | Balanced performance |
| Verification | qwen-plus | 0.1-0.3 | 2048-4096 | Strict validation |
| Quick Tasks | qwen-turbo | 0.2-0.5 | 2048 | Fast responses |

---

## Tips for Better Results

### 1. Write Clear Prompts

```
Good:
"Implement user authentication with JWT tokens, including:
- Login endpoint
- Registration endpoint
- Token refresh
- Password reset
Use bcrypt for password hashing."

Bad:
"Make auth system"
```

### 2. Provide Context

```markdown
## Project Context
- E-commerce platform
- Node.js + Express
- PostgreSQL database
- 10k daily active users expected

## Current Task
Implement user registration
```

### 3. Specify Output Format

```markdown
## Expected Output
1. Code implementation
2. Unit tests
3. API documentation
4. Security considerations
```

### 4. Use Temperature Appropriately

- **Creative tasks** (planning, design): 0.6-0.8
- **Implementation tasks**: 0.2-0.4
- **Verification tasks**: 0.1-0.3

---

## Troubleshooting

### Issue: Vague Planning Output

**Solution:** Increase temperature and provide more context
```json
{
  "temperature": 0.8,
  "system_prompt": "You are an expert software architect with 20 years experience"
}
```

### Issue: Code Errors

**Solution:** Lower temperature, add verification step
```json
{
  "temperature": 0.2,
  "verify": "Run linter and tests after generation"
}
```

### Issue: Slow Response

**Solution:** Use qwen-turbo for quick tasks
```json
{
  "model": "qwen-turbo",
  "max_tokens": 2048
}
```

---

## Next Steps

- [Execution Workflow](QWEN-EXECUTION.md) - Detailed execution guide
- [Verification Workflow](QWEN-VERIFICATION.md) - Verification best practices
- [Provider Guide](QWEN-PROVIDER.md) - Complete provider documentation
