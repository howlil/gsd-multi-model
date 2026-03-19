---
name: ez:git-workflow
description: Git workflow management for phase-based development
argument-hint: "<operation> [options] — operations: create-phase, create-branch, merge, release, hotfix, rollback, validate, changelog"
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
---
<objective>
Manage Git workflow operations for phase-based development with enterprise-grade branch management, validation, and merging.

**Operations:**
- `create-phase <N> <slug>` — Create phase branch (e.g., `phase/15-git-workflow`)
- `create-branch <type> <slug>` — Create feature/fix/docs/refactor branch
- `merge <source> <target>` — Merge branches with validation
- `release <version>` — Create and manage release branch
- `hotfix <description>` — Create hotfix branch from main
- `rollback <phase-number>` — Rollback a phase
- `validate <branch>` — Validate branch before merge
- `changelog <from-tag> [to-tag]` — Generate changelog from commits
</objective>

<execution_context>
@ez-agents/bin/lib/git-workflow-engine.cjs
@ez-agents/bin/lib/git-utils.cjs
@ez-agents/bin/lib/git-errors.cjs
@.planning/config.json
</execution_context>

<context>
**Branch Hierarchy:**
```
main (production) ← develop (staging) ← phase/* ← {feature,fix,docs,refactor}/*
```

**Configuration:**
- Merge strategies from `.planning/config.json`
- Enterprise mode settings (PR requirements, reviewers)
- Validation levels (minimal, standard, full)

**Environment:**
- GITHUB_TOKEN required for enterprise PR workflow
- GITHUB_TOKEN required for branch protection checks
</context>

<process>
1. Parse operation and arguments
2. Initialize GitWorkflowEngine with config
3. Execute requested operation:
   - **create-phase**: Call `engine.createPhaseBranch(phaseNumber, phaseSlug)`
   - **create-branch**: Call `engine.createWorkBranch(type, ticketId, slug)`
   - **merge**: Call `engine.mergeBranch(source, target, options)`
   - **release**: Call `engine.createReleaseBranch(version)` then `engine.mergeReleaseToMain(releaseBranch)`
   - **hotfix**: Call `engine.createHotfix(description)` then `engine.mergeHotfix(hotfixBranch, version)`
   - **rollback**: Call `engine.rollbackPhase(phaseNumber)`
   - **validate**: Call `engine.validateBeforeMerge(branch, validationLevel)`
   - **changelog**: Call `engine.generateChangelog(fromTag, toTag)`
4. Handle errors with appropriate error classes
5. Log operation result
6. Return success/failure status
</process>

<error_handling>
- `BranchExistsError`: Branch already exists, suggest different name or delete first
- `BranchNotFoundError`: Source/target branch doesn't exist
- `MergeConflictError`: Conflicts detected, provide conflict resolution guidance
- `ValidationFailedError`: Validation checks failed, list specific failures
- `GitWorkflowError`: General git workflow error
</error_handling>
