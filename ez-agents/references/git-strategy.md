# Git Strategy Guide

**Version:** 1.0.0  
**Last Updated:** 2026-03-29  
**Purpose:** Complete git workflow for EZ Agents projects

---

## Core Principle

**Commit outcomes, not process.**

The git log should read like a changelog of what shipped, not a diary of planning activity.

---

## Commit Points

| Event | Commit? | Why |
|-------|---------|-----|
| BRIEF + ROADMAP created | ✅ YES | Project initialization |
| PLAN.md created | ❌ NO | Intermediate - commit with plan completion |
| RESEARCH.md created | ❌ NO | Intermediate research artifact |
| DISCOVERY.md created | ❌ NO | Intermediate discovery artifact |
| **Task completed** | ✅ YES | Atomic unit of work (1 commit per task) |
| **Plan completed** | ✅ YES | Metadata commit (SUMMARY + STATE + ROADMAP) |
| Handoff created | ✅ YES | WIP state preserved |

---

## Git Initialization

All EZ Agents projects get their own repository:

```bash
[ -d .git ] && echo "GIT_EXISTS" || echo "NO_GIT"
```

If `NO_GIT`: Run `git init` silently.

---

## Commit Message Formats

### Project Initialization

```
docs: {project-name} ({N} phases)

[One-liner from PROJECT.md]

Phases:
1. {phase-name}: {goal}
2. {phase-name}: {goal}
3. {phase-name}: {goal}
```

**What to commit:**
```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" commit "docs: {project-name} ({N} phases)" --files .planning/
```

---

### Task Completion (Most Common - 90%)

Each task gets its own commit immediately after completion.

```
{type}({phase}-{plan}): {task-name}

- [Key change 1]
- [Key change 2]
- [Key change 3]
```

**Commit types:**
- `feat` - New feature/functionality
- `fix` - Bug fix
- `test` - Test-only (TDD RED phase)
- `refactor` - Code cleanup (TDD REFACTOR phase)
- `perf` - Performance improvement
- `chore` - Dependencies, config, tooling

**Examples:**

```bash
# Standard task
git add src/api/auth.ts src/types/user.ts
git commit -m "feat(08-02): create user registration endpoint

- POST /auth/register validates email and password
- Checks for duplicate users
- Returns JWT token on success
"

# TDD task - RED phase
git add src/__tests__/jwt.test.ts
git commit -m "test(07-02): add failing test for JWT generation

- Tests token contains user ID claim
- Tests token expires in 1 hour
- Tests signature verification
"

# TDD task - GREEN phase
git add src/utils/jwt.ts
git commit -m "feat(07-02): implement JWT generation

- Uses jose library for signing
- Includes user ID and expiry claims
- Signs with HS256 algorithm
"
```

---

### Plan Completion (Metadata Commit)

After all tasks are committed, one final metadata commit captures plan completion.

```
docs({phase}-{plan}): complete [plan-name] plan

Tasks completed: [N]/[N]
- [Task 1 name]
- [Task 2 name]
- [Task 3 name]

SUMMARY: .planning/phases/XX-name/{phase}-{plan}-SUMMARY.md
```

**What to commit:**
```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" commit "docs({phase}-{plan}): complete [plan-name] plan" --files .planning/phases/XX-name/{phase}-{plan}-PLAN.md .planning/phases/XX-name/{phase}-{plan}-SUMMARY.md .planning/STATE.md .planning/ROADMAP.md
```

**Note:** Code files NOT included - already committed per-task.

---

### Handoff (WIP)

```
wip: [phase-name] paused at task [X]/[Y]

Current: [task name]
[If blocked:] Blocked: [reason]
```

**What to commit:**
```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" commit "wip: [phase-name] paused at task [X]/[Y]" --files .planning/
```

---

## Commit via CLI

Always use `ez-tools commit` for `.planning/` files — it handles `commit_docs` and gitignore checks automatically:

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" commit "docs({scope}): {description}" --files .planning/STATE.md .planning/ROADMAP.md
```

The CLI will return `skipped` (with reason) if `commit_docs` is `false` or `.planning/` is gitignored.

---

## Amend Previous Commit

To fold `.planning/` file changes into the previous commit:

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" commit "" --files .planning/codebase/*.md --amend
```

---

## Commit Message Patterns

| Command | Scope | Example |
|---------|-------|---------|
| plan-phase | phase | `docs(phase-03): create authentication plans` |
| execute-phase | phase | `docs(phase-03): complete authentication phase` |
| new-milestone | milestone | `docs: start milestone v1.1` |
| remove-phase | chore | `chore: remove phase 17 (dashboard)` |
| insert-phase | phase | `docs: insert phase 16.1 (critical fix)` |
| add-phase | phase | `docs: add phase 07 (settings page)` |

---

## Example Git Log

### Old Approach (Per-Plan Commits)

```
a7f2d1 feat(checkout): Stripe payments with webhook verification
3e9c4b feat(products): catalog with search, filters, and pagination
8a1b2c feat(auth): JWT with refresh rotation using jose
5c3d7e feat(foundation): Next.js 15 + Prisma + Tailwind scaffold
2f4a8d docs: initialize ecommerce-app (5 phases)
```

**Problem:** Each plan is a black box - can't see what changed inside.

---

### New Approach (Per-Task Commits)

```
# Phase 04 - Checkout
1a2b3c docs(04-01): complete checkout flow plan
4d5e6f feat(04-01): add webhook signature verification
7g8h9i feat(04-01): implement payment session creation
0j1k2l feat(04-01): create checkout page component

# Phase 03 - Products
3m4n5o docs(03-02): complete product listing plan
6p7q8r feat(03-02): add pagination controls
9s0t1u feat(03-02): implement search and filters
2v3w4x feat(03-01): create product catalog schema

# Phase 02 - Auth
5y6z7a docs(02-02): complete token refresh plan
8b9c0d feat(02-02): implement refresh token rotation
1e2f3g test(02-02): add failing test for token refresh
4h5i6j docs(02-01): complete JWT setup plan
7k8l9m feat(02-01): add JWT generation and validation
0n1o2p chore(02-01): install jose library

# Phase 01 - Foundation
3q4r5s docs(01-01): complete scaffold plan
6t7u8v feat(01-01): configure Tailwind and globals
9w0x1y feat(01-01): set up Prisma with database
2z3a4b feat(01-01): create Next.js 15 project

# Initialization
5c6d7e docs: initialize ecommerce-app (5 phases)
```

**Benefits:**
- Each plan produces 2-4 commits (tasks + metadata)
- Clear, granular, bisectable history
- Can trace every line to specific task context

---

## Anti-Patterns

### ❌ Don't Commit (Intermediate Artifacts)

- PLAN.md creation (commit with plan completion)
- RESEARCH.md (intermediate research)
- DISCOVERY.md (intermediate discovery)
- Minor planning tweaks
- "Fixed typo in roadmap"

### ✅ Do Commit (Outcomes)

- Each task completion (feat/fix/test/refactor)
- Plan completion metadata (docs)
- Project initialization (docs)

**Key principle:** Commit working code and shipped outcomes, not planning process.

---

## When to Skip Commits

Skip planning artifact commits when:

1. `commit_docs: false` in `.planning/config.json`
2. `.planning/` is gitignored
3. No changes to commit (check with `git status --porcelain .planning/`)

---

## Branch Strategy

### Default Branch Names

| Workflow | Branch Pattern | Example |
|----------|---------------|---------|
| Phase work | `ez/phase-{phase}-{slug}` | `ez/phase-03-auth` |
| Milestone | `ez/{milestone}-{slug}` | `ez/v1.1-auth-feature` |
| Hotfix | `ez/hotfix-{slug}` | `ez/hotfix-auth-bypass` |

### Configure Branch Templates

In `.planning/config.json`:

```json
{
  "phase_branch_template": "ez/phase-{phase}-{slug}",
  "milestone_branch_template": "ez/{milestone}-{slug}"
}
```

---

## Commit Strategy Rationale

### Why Per-Task Commits?

#### Context Engineering for AI

- Git history becomes primary context source for future Claude sessions
- `git log --grep="{phase}-{plan}"` shows all work for a plan
- `git diff <hash>^..<hash>` shows exact changes per task
- Less reliance on parsing SUMMARY.md = more context for actual work

#### Failure Recovery

- Task 1 committed ✅, Task 2 failed ❌
- Claude in next session: sees task 1 complete, can retry task 2
- Can `git reset --hard` to last successful task

#### Debugging

- `git bisect` finds exact failing task, not just failing plan
- `git blame` traces line to specific task context
- Each commit is independently revertable

#### Observability

- Solo developer + Claude workflow benefits from granular attribution
- Atomic commits are git best practice
- "Commit noise" irrelevant when consumer is Claude, not humans

---

## Git Commands Reference

### Check Git Status

```bash
git status --porcelain .planning/
```

### View Phase-Specific Commits

```bash
git log --grep="03-" --oneline
# Shows all commits for phase 03
```

### Find Specific Plan Commits

```bash
git log --grep="03-02" --oneline
# Shows commits for plan 03-02
```

### Show Task Changes

```bash
git show 4d5e6f
# Shows exact changes for webhook signature verification task
```

### Bisect to Find Bug Introduction

```bash
git bisect start
git bisect bad    # Current HEAD has bug
git bisect good 5c6d7e  # Initialization was good
# Git will checkout commits until bug source found
```

---

## Configuration

### Enable/Disable Planning Commits

In `.planning/config.json`:

```json
{
  "commit_docs": true
}
```

Or via CLI:

```bash
node ez-tools.cjs config set commit_docs false
```

### Gitignore Planning (Alternative)

If you prefer not to commit planning artifacts:

```
# .gitignore
.planning/
```

EZ Agents will detect this and skip planning commits automatically.

---

## Best Practices

### ✅ Do

- Commit each task immediately after completion
- Use conventional commit format with phase-plan scope
- Keep commit messages focused on what changed
- Include verification criteria in commit messages
- Create metadata commits for plan completion

### ❌ Don't

- Batch multiple tasks into one commit
- Commit intermediate planning artifacts
- Write vague commit messages ("Fixed stuff")
- Forget to commit code changes before phase transition
- Commit planning docs if `commit_docs: false`

---

## See Also

- [[checkpoints.md]](./checkpoints.md) — Human-AI interaction protocol
- [[tdd.md]](./tdd.md) — Test-driven development workflow
- [[verification-patterns.md]](./verification-patterns.md) — Quality verification
- [[phase-utilities.md]](./phase-utilities.md) — Phase number handling

---

**Maintained by:** EZ Agents Core Team  
**Feedback:** Open an issue on GitHub
