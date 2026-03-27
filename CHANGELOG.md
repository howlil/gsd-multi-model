# Changelog

All notable changes to EZ Agents will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [5.0.0] - 2026-03-27

### 🎉 Major Release: Complete TypeScript & OOP Transformation

**Milestone:** v5.0 Complete TypeScript & OOP Transformation
**Total Requirements:** 215 (126 complete, 59%)
**Phases:** 31 (18 complete, 5 in progress, 8 planned)
**Test Coverage:** 206/307 passing (67%) → Target: 100%

### ⚠️ BREAKING CHANGES

#### Phase 28: Remove Over-Engineering

**Removed circuit-breaker.ts (328 lines)**
- `CircuitBreaker` class removed
- `CircuitBreakerAdapter` removed
- CLI commands `ez-tools circuit-breaker status` and `reset` removed
- **Migration:** Use `withRetry()` from `bin/lib/retry.ts` instead
  ```typescript
  // Before
  import { CircuitBreaker } from './circuit-breaker.js';
  const breaker = new CircuitBreaker();
  const result = await breaker.execute(() => apiCall());

  // After
  import { withRetry } from './retry.js';
  const result = await withRetry(() => apiCall(), { maxRetries: 3 });
  ```

**Removed analytics/ module (5 files, 1200 lines)**
- `AnalyticsCollector` removed
- `AnalyticsReporter` removed
- `CohortAnalyzer` removed
- `FunnelAnalyzer` removed
- `NpsTracker` removed
- **Reason:** Zero production usage, 83% test failure rate (20/24 tests failing)
- **Migration:** If you need analytics, implement custom solution or use external service

**Removed environment variables:**
- `EZ_LOG_CIRCUIT_BREAKER` - No longer needed (circuit breaker removed)
- `EZ_LOG_ANALYTICS` - No longer needed (analytics removed)

**Impact:**
- Code reduction: 1528 lines removed
- Token savings: ~600 tokens/phase
- Phase 19 unblocked (20 failing analytics tests marked as won't fix)

---

## [4.0.0] - 2026-03-24

### 🎉 Major Release: Production Hardening & TypeScript Migration

**Milestone:** v4.0 Production Hardening & Optimization
**Total Requirements:** 38 (100% complete)
**Phases:** 7 (40-46)
**Test Coverage:** 472 tests passing (100%)

### Added

#### Cost Tracking & Budget Management
- **COST-01**: Per-agent cost tracking with `agent` field in cost entries
  - `CostTracker.record()` accepts `agent` parameter for per-agent tracking
  - `CostTracker.aggregate({ by_agent: true })` returns nested breakdown by agent
  - Costs tracked for ez-planner, ez-executor, ez-verifier, and other agents
- **COST-02**: Multi-threshold budget alerts (50%, 75%, 90%)
  - `CostAlerts` class with `checkThresholds()` and `logAlert()` methods
  - Alerts logged to `.planning/alerts.json` with duplicate prevention (24h)
  - Alert levels: `info` (50%), `warning` (75%), `critical` (90%)
  - Integration with `CostTracker.checkBudget()` for automatic alert triggering
- **COST-03**: Budget-aware model downgrade
  - `ModelTierManager` class with model tiers (premium, standard, economy)
  - Automatic model selection based on budget percentage used
  - Model downgrade at 75% (standard) and 90% (economy) budget usage
  - Downgrade events logged to `.planning/metrics.json`
  - Support for Claude, OpenAI, Qwen, and Kimi providers

#### Circuit Breaker & Reliability
- **CIRCUIT-01**: Circuit breaker for agent spawns
  - `CircuitBreaker` class with state persistence to `.planning/circuit-breaker.json`
  - Trips to OPEN state after 5 consecutive failures
  - Automatic recovery through HALF_OPEN state after reset timeout
  - `CircuitBreakerAdapter` wraps all 6 assistant adapters (Claude, OpenCode, Gemini, Codex, Qwen, Kimi)
  - Per-agent-type circuit breakers for isolated failure handling
- **CIRCUIT-02**: Circuit breaker metrics and CLI
  - `ez-tools circuit-breaker status` command shows state for all agent types
  - `ez-tools circuit-breaker reset [agent-type]` command resets breaker(s)
  - State transitions logged to `.planning/metrics.json`
  - Complete statistics via `CircuitBreaker.getStats()`

#### Context Optimization
- **CTX-01**: Context relevance scoring for file prioritization
- **CTX-02**: Code compression with folding for large files
- **CTX-03**: Deduplication using Jaccard similarity
- **CTX-04**: Metadata tracking for context optimization

#### New Agents
- `ez-product-engineer` - Product thinking, feature prioritization, business alignment
- `ez-technical-writer` - Technical documentation, user guides, API docs
- `ez-design-expert` - Design system expertise, UI/UX best practices
- `ez-ux-expert` - User experience research and validation

#### New Skills (17 skill categories)
- Architecture patterns (CQRS, DDD, Hexagonal, Serverless, etc.)
- Domain expertise (FinTech, SaaS, E-commerce, Healthcare, etc.)
- Stack-specific skills (React, Vue, Svelte, Next.js, etc.)
- Governance (Security, Privacy, Accessibility, Compliance)
- Testing frameworks and best practices

### Changed

- **Agent Restructuring**: Removed legacy agents (ez-observer, ez-plan-checker, ez-tech-lead, ez-ui-auditor)
- **Skill System**: Expanded from 0 to 49+ skills across 8 categories
- **Test Suite**: Comprehensive test coverage with 472 passing tests
- **Documentation**: Added complete skill catalog and usage guides

### New Modules

- `bin/lib/cost-alerts.cjs` - Multi-threshold budget alert system
- `bin/lib/model-tier-manager.cjs` - Budget-aware model selection
- `bin/lib/circuit-breaker.cjs` - Circuit breaker implementation
- `bin/lib/context-relevance-scorer.cjs` - Context scoring
- `bin/lib/context-compressor.cjs` - Code compression
- `bin/lib/context-deduplicator.cjs` - Deduplication
- `bin/lib/context-metadata-tracker.cjs` - Metadata tracking
- `bin/lib/gate-executor.cjs` - Quality gate execution
- `bin/lib/gates/` - Quality gate definitions
- `bin/lib/perf/` - Performance monitoring
- `bin/lib/finops/` - Financial operations
- `bin/lib/analytics/` - Analytics tracking
- `bin/lib/backup-service.cjs` - Backup management
- `bin/lib/error-registry.cjs` - Error tracking
- `bin/lib/recovery-manager.cjs` - Recovery management
- `bin/lib/quality-metrics.cjs` - Quality metrics

### New Commands

- `ez-tools circuit-breaker` - Circuit breaker management
- `ez-tools cost` - Cost tracking and reporting
- `ez-tools doctor` - System health diagnostics
- `/ez:run-phase` - Automated phase execution

### Fixed

- Cost alerts now properly trigger at threshold boundaries
- Context optimization pipeline fully functional
- Agent frontmatter consistency across all agents
- Skill registry and activation working correctly

### Removed

- Deprecated legacy agents (ez-observer, ez-plan-checker, etc.)
- Removed unused templates and workflows
- Cleaned up legacy code paths

### Technical Details

- **Node.js**: >= 16.7.0
- **Test Framework**: Node.js native test runner + Vitest
- **Coverage**: 472 tests, 100% pass rate
- **Breaking Changes**: Agent restructuring may require workflow updates

---

## [Unreleased] - Phase 44: Cost Tracking & Circuit Breaker

### Added

- **COST-01**: Per-agent cost tracking with `agent` field in cost entries
  - `CostTracker.record()` accepts `agent` parameter for per-agent tracking
  - `CostTracker.aggregate({ by_agent: true })` returns nested breakdown by agent
  - Costs tracked for ez-planner, ez-executor, ez-verifier, and other agents
- **COST-02**: Multi-threshold budget alerts (50%, 75%, 90%)
  - `CostAlerts` class with `checkThresholds()` and `logAlert()` methods
  - Alerts logged to `.planning/alerts.json` with duplicate prevention (24h)
  - Alert levels: `info` (50%), `warning` (75%), `critical` (90%)
  - Integration with `CostTracker.checkBudget()` for automatic alert triggering
- **COST-03**: Budget-aware model downgrade
  - `ModelTierManager` class with model tiers (premium, standard, economy)
  - Automatic model selection based on budget percentage used
  - Model downgrade at 75% (standard) and 90% (economy) budget usage
  - Downgrade events logged to `.planning/metrics.json`
  - Support for Claude, OpenAI, Qwen, and Kimi providers
- **CIRCUIT-01**: Circuit breaker for agent spawns
  - `CircuitBreaker` class with state persistence to `.planning/circuit-breaker.json`
  - Trips to OPEN state after 5 consecutive failures
  - Automatic recovery through HALF_OPEN state after reset timeout
  - `CircuitBreakerAdapter` wraps all 6 assistant adapters (Claude, OpenCode, Gemini, Codex, Qwen, Kimi)
  - Per-agent-type circuit breakers for isolated failure handling
- **CIRCUIT-02**: Circuit breaker metrics and CLI
  - `ez-tools circuit-breaker status` command shows state for all agent types
  - `ez-tools circuit-breaker reset [agent-type]` command resets breaker(s)
  - State transitions logged to `.planning/metrics.json`
  - Complete statistics via `CircuitBreaker.getStats()`

### New Modules

- `bin/lib/cost-alerts.cjs` - Multi-threshold budget alert system
- `bin/lib/model-tier-manager.cjs` - Budget-aware model selection with tier downgrade

### New Commands

- `ez-tools circuit-breaker` - Circuit breaker management
  - `status` - Show circuit breaker status for all agent types
  - `reset [agent-type]` - Reset circuit breaker(s) to CLOSED state

### New Tests

- `tests/integration/cost-tracking.test.cjs` - End-to-end cost tracking integration tests
- `tests/integration/circuit-breaker.test.cjs` - End-to-end circuit breaker integration tests
- Enhanced `tests/cost-tracker.test.cjs` with per-agent tracking tests (COST-01)

### Changed

- `bin/lib/cost-tracker.cjs` - Enhanced with `agent` field support and `by_agent` aggregation
- `bin/lib/cost-tracker.cjs` - `checkBudget()` now async and triggers multi-threshold alerts
- `bin/lib/circuit-breaker.cjs` - Added state persistence to `.planning/circuit-breaker.json`
- `bin/lib/circuit-breaker.cjs` - Added `agentType` parameter for per-agent state
- `bin/lib/assistant-adapter.cjs` - Integrated `CircuitBreakerAdapter` wrapper for all adapters
- `bin/lib/assistant-adapter.cjs` - Integrated `ModelTierManager` for budget-aware model selection
- `ez-agents/bin/ez-tools.cjs` - Added `circuit-breaker` command with status and reset subcommands
- `.planning/config.json` - Added `cost_tracking.alert_thresholds`, `model_downgrade.tiers`, and `circuit_breaker` configuration

### Configuration

```json
{
  "cost_tracking": {
    "alert_thresholds": [50, 75, 90],
    "alert_channels": ["log", "file"],
    "model_downgrade": {
      "enabled": true,
      "tiers": {
        "claude": {
          "premium": ["claude-3-opus", "claude-sonnet-4-6"],
          "standard": ["claude-3-sonnet"],
          "economy": ["claude-3-haiku"]
        }
      }
    }
  },
  "circuit_breaker": {
    "enabled": true,
    "failure_threshold": 5,
    "reset_timeout": 60000,
    "persist_state": true,
    "metrics_enabled": true
  }
}
```

### Tests

- 76 tests pass for Phase 44 features
- Unit tests: cost-tracker, cost-alerts, model-tier-manager, circuit-breaker
- Integration tests: cost-tracking, circuit-breaker

---

## [3.5.0] - 2026-03-20

### Fixed

- **Critical path bug**: All workflow files used `$HOME/.qwen/ez-agents/` — replaced with `$HOME/.claude/ez-agents/` across 6 files (`autonomous.md`, `new-project.md`, `new-milestone.md`, `resume.md`, `export-session.md`, `import-session.md`). Commands were silently failing to load workflows at runtime.
- **`progress.md`**: Removed invalid `SlashCommand` from `allowed-tools` — not a valid tool in the framework; added `argument-hint: "[--no-auto]"`

### Added

- **New commands**: `/ez:hotfix`, `/ez:arch-review`, `/ez:standup`, `/ez:resume`, `/ez:export-session`, `/ez:import-session`, `/ez:list-sessions`, `/ez:preflight`, `/ez:release`, `/ez:gather-requirements`
- **New workflows**: `arch-review.md`, `standup.md`, `resume-session.md`, `export-session.md`, `import-session.md`, `release.md`, `gather-requirements.md`, `hotfix.md`
- **Session management**: `session-manager.cjs`, `session-chain.cjs`, `session-export.cjs`, `session-import.cjs`, `session-errors.cjs`, `memory-compression.cjs` — full session persistence, cross-model handoff via `/ez:export-session` / `/ez:import-session`
- **Release tier system**: `tier-manager.cjs` — MVP / Medium / Enterprise tier gates with coverage thresholds and checklist enforcement
- **New agents**: `ez-release-agent.md`, `ez-requirements-agent.md`
- **New templates**: `bdd-feature.md`, `discussion.md`, `incident-runbook.md`, `release-checklist.md`, `rollback-plan.md`
- **New references**: `metrics-schema.md`, `tier-strategy.md`
- **`planning-config.md`**: Added documentation for `smart_orchestration`, `agent_discussion`, `sessions`, `release.tiers`, and `packageManager` config blocks

### Changed

- **`commands/ez/hotfix.md`**: Proper YAML frontmatter (`name: ez:hotfix`, `argument-hint`, `allowed-tools`) + `execution_context` referencing workflow
- **`commands/ez/arch-review.md`**: Proper YAML frontmatter + `execution_context` + `process` sections
- **`commands/ez/standup.md`**: Proper YAML frontmatter + `execution_context` + `process` sections

---

## [Unreleased] - Phase 16: Context & File Access

### Added

- **CONTEXT-01**: File reading support for /ez:new-project phase
- **CONTEXT-02**: File reading support for /ez:new-milestone phase
- **CONTEXT-03**: URL fetching during planning phases
- **CONTEXT-04**: Session-only context caching
- **CONTEXT-05**: URL validation (HTTPS only)
- **CONTEXT-06**: XSS/malware content scanning
- **CONTEXT-07**: Agent command for requesting additional context
- **CONTEXT-08**: Context source tracking in STATE.md

### New Modules

- `ez-agents/bin/lib/file-access.cjs` - File reading with glob pattern support
- `ez-agents/bin/lib/url-fetch.cjs` - Secure URL fetching with HTTPS validation
- `ez-agents/bin/lib/content-scanner.cjs` - XSS/malware detection
- `ez-agents/bin/lib/context-cache.cjs` - Session-only temporary cache
- `ez-agents/bin/lib/context-manager.cjs` - Context orchestration
- `ez-agents/bin/lib/context-errors.cjs` - Structured error classes

### New Commands

- `ez-tools context read <pattern>` - Read local files using glob patterns
- `ez-tools context fetch <url>` - Fetch content from URL (HTTPS only)
- `ez-tools context request` - Interactive context gathering mode

### Dependencies

- Added `micromatch@^4.0.5` for glob pattern matching

### Security

- Content security scanner detects script tags, JavaScript URLs, event handlers
- URL validation rejects HTTP, file, data, javascript, and vbscript protocols
- Localhost URLs blocked for security
- Content size limits (1MB max) prevent memory exhaustion

### Workflows

- `/ez:new-project` - Integrated context gathering in Step 0a
- `/ez:new-milestone` - Integrated context gathering in Step 0a

### Tests

- 90+ unit, integration, and security tests added
- XSS detection test suite with 50+ pattern variations

---

## [3.4.2] - 2026-03-18

### Changed

- **npm Registry Installation** - Package now published to npm registry for professional installation
- **Installation Command** - Single source of truth: `npm i -g @howlil/ez-agents@latest`
- **Update Command** - Use npm's built-in update: `npm update -g @howlil/ez-agents`

### Removed

- **ez-agents-update Command** - Removed in favor of npm's native update mechanism
- Git-based installation (`git+https://...`) deprecated in documentation

### Migration

If you installed via git:
```bash
# Uninstall old version
npm uninstall -g ez-agents

# Install from npm
npm i -g @howlil/ez-agents@latest
```

### Technical Details

- Package scoped to `@howlil/ez-agents` on npm registry
- No breaking changes - all existing workflows and commands unchanged
- Backward compatible with v3.4.1 configurations

## [3.4.1] - 2026-03-18

### Fixed

- **npm Publish** - Re-published to ensure npm registry is up to date

### Changed

- Version bump to 3.4.1 to trigger npm publish workflow

## [3.4.0] - 2026-03-18

### Added

- **Qwen Provider Documentation** - Complete manual workflow guides for Alibaba Qwen (DashScope)
  - 6 new documentation files covering setup, planning, execution, and verification
  - Authentication guide with 3 methods (environment variable, system keychain, config file)
  - Model selection guide (qwen-max, qwen-plus, qwen-turbo) with cost optimization tips
  - 10+ configuration examples from basic to enterprise setups

- **Qwen Workflow Guides**:
  - `docs/QWEN-PROVIDER.md` - Complete provider setup and troubleshooting
  - `docs/QWEN-PLANNING.md` - Manual planning workflow with templates
  - `docs/QWEN-EXECUTION.md` - Code execution with parallel waves
  - `docs/QWEN-VERIFICATION.md` - Requirements traceability and security audit
  - `docs/QWEN-CONFIG-EXAMPLES.md` - Configuration templates and examples
  - `docs/QWEN-README.md` - Quick start guide (5-minute setup)

### Fixed

- **auth.cjs** - Added missing `QWEN` provider constant to `PROVIDERS` object

### Changed

- **Documentation** - 3,425+ lines of new Qwen provider documentation
- **Test Coverage** - All 697 tests passing

### Technical Details

- No breaking changes - backward compatible with v3.3.0
- No database changes
- Works with existing configurations

---

## [3.3.0] - 2026-03-18

### Added

- **End-to-End Testing Framework** - Comprehensive E2E tests for complete user workflows
  - Complete project lifecycle testing (health check → phase management → milestone complete)
  - Phase lifecycle testing (create → verify → complete)
  - State management testing (load → update → verify persistence)
  - Multi-phase workflow testing with dependencies
  - Decimal phase numbering support
  - Error handling and edge case testing

- **10 New E2E Test Cases** covering:
  - Complete workflow: health check → phase management → milestone complete
  - Phase lifecycle: create → verify → complete
  - State management: load → update → verify persistence
  - Roadmap analyze with disk status
  - Health check with missing critical files
  - Phase operations with invalid phase numbers
  - State operations with missing STATE.md
  - Config operations with invalid JSON
  - Multiple phases with dependencies
  - Phase numbering with decimal phases

### Fixed

- **Test Helper Improvements** - Updated `runEzTools` to use `spawnSync` for proper stdout/stderr capture
- **Verify Health Test** - Fixed test expectation to accept both E001 and E002/E003/E004 error codes
- **Debug Cleanup** - Removed debug statements from `verify.cjs` and `ez-tools.cjs`

### Changed

- **Test Coverage** - Increased from 687 to 697 tests (all passing)
- **Test Reliability** - Improved E2E test assertions to handle varying output formats

### Technical Details

- All 697 tests passing (100% pass rate)
- New E2E tests located in `tests/e2e-workflow.test.cjs`
- Test helper updated in `tests/helpers.cjs`
- Health validation test updated in `tests/verify-health.test.cjs`

---

## Migration Guide: Legacy Branding → EZ Agents

**This fork has been rebranded to EZ Agents.**

### What Changed

| Category | Before (Legacy) | After (EZ Agents) |
|----------|-------------|-------------------|
| **NPM Package** | `ez-agents-cc` | `@howlil/ez-agents` |
| **Command Prefix** | `/legacy:` | `/ez:` |
| **Install Command** | `npx ez-agents-cc` | `npx ez-agents` |
| **Update Command** | `/legacy:update` | `/ez:update` |
| **Agent Prefix** | `ez-*` | `ez-*` |
| **Folder Structure** | `ez-agents/` (internal) | `ez-agents/` (unchanged) |

### Migration Steps

1. **Uninstall legacy package** (if installed globally):
   ```bash
   npx ez-agents-cc --all --global --uninstall
   ```

2. **Install EZ Agents**:
   ```bash
   npx ez-agents --all --global
   ```

3. **Update your workflows**:
   - Replace legacy slash-command prefixes with `/ez:` in your notes and documentation
   - Update any custom scripts that reference `ez-agents-cc`

### What Stayed the Same

- **Core functionality**: All EZ Agents workflows, agents, and commands work identically
- **Planning files**: `.planning/` directory structure unchanged
- **Configuration**: `.planning/config.json` format unchanged
- **Internal folder**: `ez-agents/` folder name preserved for backward compatibility

### Why the Fork?

EZ Agents adds **multi-model support** (Qwen, Kimi, OpenAI, Anthropic) and **enterprise-grade reliability** features to the original EZ Agents system. See [README.md](README.md) for full details.

---

## [3.2.1] - 2026-03-18

### Removed
- **Legacy ez Support**: Completely removed all remaining legacy `~/.ez` fallback paths, `ez_state_version` metadata, and `runezTools` aliases.
- **Legacy Scripts**: Deleted `replace-ez-tools.js` and `run-replace.js`.

### Fixed
- **Branding**: Updated remaining ez references in tests, documentation, and security email (`security@ez.agents`).
- **Tests**: Fixed `COMMANDS_DIR` path in `agent-frontmatter.test.cjs` and refactored `copilot-install.test.cjs` to use EZ-branded functions and variables.

## [3.2.0] - 2026-03-18

### Added
- **Node repair operator** (`workflows/node-repair.md`) — autonomous recovery when task verification fails. Instead of immediately asking the user, the executor attempts structured repair: RETRY (different approach), DECOMPOSE (break into sub-tasks), or PRUNE (skip with justification). Only escalates to the user when the repair budget is exhausted or an architectural decision is needed. Repair budget defaults to 2 attempts per task; configurable via `workflow.node_repair_budget`. Disable entirely with `workflow.node_repair: false` to restore original behavior.
- **Comprehensive test suite expansion**: Added 12 new test files covering circuit breakers, file locks, logger integration, and state-snapshot consistency.
- **Assistant Adapter Refactor**: Unified multi-model support for Qwen, Kimi, and OpenAI via a new adapter pattern.
- **EZ-Agents Rebranding**: Finalized the migration from legacy ez branding across all workflows, agents, and documentation.

## [3.1.1] - 2026-03-17

### Fixed
- `init new-project` brownfield detection is now cross-platform and no longer depends on Unix shell pipelines.
- Global defaults and Brave key detection now prefer `~/.ez` while keeping legacy `~/.ez` fallback compatibility.
- User-facing workflow banners and command hints are now fully EZ-branded (`EZ ►`, `/ez-*`) with stale legacy references removed.

### Changed
- Logger filename convention updated to `ez-*.log` and planning temp write prefix updated to `ez-write-*`.
- STATE frontmatter now emits `ez_state_version` while preserving `ez_state_version` compatibility alias for older state readers.
- Release-adjacent docs/templates cleaned to align with current EZ naming and command format.

## [1.22.4] - 2026-03-03

### Added
- `--discuss` flag for `/EZ Agents:quick` — lightweight pre-planning discussion to gather context before quick tasks

### Fixed
- Windows: `@file:` protocol resolution for large init payloads (>50KB) — all 32 workflow/agent files now resolve temp file paths instead of letting agents hallucinate `/tmp` paths (#841)
- Missing `skills` frontmatter on ez-nyquist-auditor agent

## [1.22.3] - 2026-03-03

### Added
- Verify-work auto-injects a cold-start smoke test for phases that modify server, database, seed, or startup files — catches warm-state blind spots

### Changed
- Renamed `depth` setting to `granularity` with values `coarse`/`standard`/`fine` to accurately reflect what it controls (phase count, not investigation depth). Backward-compatible migration auto-renames existing config.

### Fixed
- Installer now replaces `$HOME/.claude/` paths (not just `~/.claude/`) for non-Claude runtimes — fixes broken commands on local installs and Gemini/OpenCode/Codex installs (#905, #909)

## [1.22.2] - 2026-03-03

### Fixed
- Codex installer no longer creates duplicate `[features]` and `[agents]` sections on re-install (#902, #882)
- Context monitor hook is advisory instead of blocking non-EZ Agents workflows
- Hooks respect `CLAUDE_CONFIG_DIR` for custom config directories
- Hooks include stdin timeout guard to prevent hanging on pipe errors
- Statusline context scaling matches autocompact buffer thresholds
- Gap closure plans compute wave numbers instead of hardcoding wave 1
- `auto_advance` config flag no longer persists across sessions
- Phase-complete scans ROADMAP.md as fallback for next-phase detection
- `getMilestoneInfo()` prefers in-progress milestone marker instead of always returning first
- State parsing supports both bold and plain field formats
- Phase counting scoped to current milestone
- Total phases derived from ROADMAP when phase directories don't exist yet
- OpenCode detects runtime config directory instead of hardcoding `.claude`
- Gemini hooks use `AfterTool` event instead of `PostToolUse`
- Multi-word commit messages preserved in CLI router
- Regex patterns in milestone/state helpers properly escaped
- `isGitIgnored` uses `--no-index` for tracked file detection
- AskUserQuestion freeform answer loop properly breaks on valid input
- Agent spawn types standardized across all workflows

### Changed
- Anti-heredoc instruction extended to all file-writing agents
- Agent definitions include skills frontmatter and hooks examples

### Chores
- Removed leftover `new-project.md.bak` file
- Deduplicated `extractField` and phase filter helpers into shared modules
- Added 47 agent frontmatter and spawn consistency tests

## [1.22.1] - 2026-03-02

### Added
- Discuss phase now loads prior context (PROJECT.md, REQUIREMENTS.md, STATE.md, and all prior CONTEXT.md files) before identifying gray areas — prevents re-asking questions you've already answered in earlier phases

### Fixed
- Shell snippets in workflows use `printf` instead of `echo` to prevent jq parse errors with special characters

## [1.22.0] - 2026-02-27

### Added
- Codex multi-agent support: `request_user_input` mapping, multi-agent config, and agent role generation for Codex runtime
- Analysis paralysis guard in agents to prevent over-deliberation during planning
- Exhaustive cross-check and task-level TDD patterns in agent workflows
- Code-aware discuss phase with codebase scouting — `/EZ Agents:discuss-phase` now analyzes relevant source files before asking questions

### Fixed
- Update checker clears both cache paths to prevent stale version notifications
- Statusline migration regex no longer clobbers third-party statuslines
- Subagent paths use `$HOME` instead of `~` to prevent `MODULE_NOT_FOUND` errors
- Skill discovery supports both `.claude/skills/` and `.agents/skills/` paths
- `resolve-model` variable names aligned with template placeholders
- Regex metacharacters properly escaped in `stateExtractField`
- `model_overrides` and `nyquist_validation` correctly loaded from config
- `phase-plan-index` no longer returns null/empty for `files_modified`, `objective`, and `task_count`

## [1.21.1] - 2026-02-27

### Added
- Comprehensive test suite: 428 tests across 13 test files covering core, commands, config, dispatcher, frontmatter, init, milestone, phase, roadmap, state, and verify modules
- CI pipeline with GitHub Actions: 9-matrix (3 OS × 3 Node versions), c8 coverage enforcement at 70% line threshold
- Cross-platform test runner (`scripts/run-tests.cjs`) for Windows compatibility

### Fixed
- `getMilestoneInfo()` returns wrong version when shipped milestones are collapsed in `<details>` blocks
- Milestone completion stats and archive now scoped to current milestone phases only (previously counted all phases on disk including prior milestones)
- MILESTONES.md entries now insert in reverse chronological order (newest first)
- Cross-platform path separators: all user-facing file paths use forward slashes on Windows
- JSON quoting and dollar sign handling in CLI arguments on Windows
- `model_overrides` loaded from config and `resolveModelInternal` used in CLI

## [1.21.0] - 2026-02-25

### Added
- YAML frontmatter sync to STATE.md for machine-readable status tracking
- `/EZ Agents:add-tests` command for post-phase test generation
- Codex runtime support with skills-first installation
- Standard `project_context` block in ez-verifier output
- Codex changelog and usage documentation

### Changed
- Improved onboarding UX: installer now suggests `/EZ Agents:new-project` instead of `/EZ Agents:help`
- Updated Discord invite to vanity URL (discord.gg/EZ Agents)
- Compressed Nyquist validation layer to align with EZ Agents meta-prompt conventions
- Requirements propagation now includes `phase_req_ids` from ROADMAP to workflow agents
- Debug sessions require human verification before resolution

### Fixed
- Multi-level decimal phase handling (e.g., 72.1.1) with proper regex escaping
- `/EZ Agents:update` always installs latest package version
- STATE.md decision corruption and dollar sign handling
- STATE.md frontmatter mapping for requirements-completed status
- Progress bar percent clamping to prevent RangeError crashes
- `--cwd` override support in state-snapshot command

## [1.20.6] - 2025-02-23

### Added
- Context window monitor hook with WARNING/CRITICAL alerts when agent context usage exceeds thresholds
- Nyquist validation layer in plan-phase pipeline to catch quality issues before execution
- Option highlighting and gray area looping in discuss-phase for clearer preference capture

### Changed
- Refactored installer tools into 11 domain modules for maintainability

### Fixed
- Auto-advance chain no longer breaks when skills fail to resolve inside Task subagents
- Gemini CLI workflows and templates no longer incorrectly convert to TOML format
- Universal phase number parsing handles all formats consistently (decimal phases, plain numbers)

## [1.20.5] - 2026-02-19

### Fixed
- `/EZ Agents:health --repair` now creates timestamped backup before regenerating STATE.md (#657)

### Changed
- Subagents now discover and load project CLAUDE.md and skills at spawn time for better project context (#671, #672)
- Improved context loading reliability in spawned agents

## [1.20.4] - 2026-02-17

### Fixed
- Executor agents now update ROADMAP.md and REQUIREMENTS.md after each plan completes — previously both documents stayed unchecked throughout milestone execution
- New `requirements mark-complete` CLI command enables per-plan requirement tracking instead of waiting for phase completion
- Executor final commit includes ROADMAP.md and REQUIREMENTS.md

## [1.20.3] - 2026-02-16

### Fixed
- Milestone audit now cross-references three independent sources (VERIFICATION.md + SUMMARY frontmatter + REQUIREMENTS.md traceability) instead of single-source phase status checks
- Orphaned requirements (in traceability table but absent from all phase VERIFICATIONs) detected and forced to `unsatisfied`
- Integration checker receives milestone requirement IDs and maps findings to affected requirements
- `complete-milestone` gates on requirements completion before archival — surfaces unchecked requirements with proceed/audit/abort options
- `plan-milestone-gaps` updates REQUIREMENTS.md traceability table (phase assignments, checkbox resets, coverage count) and includes it in commit
- Gemini CLI: escape `${VAR}` shell variables in agent bodies to prevent template validation failures

## [1.20.2] - 2026-02-16

### Fixed
- Requirements tracking chain now strips bracket syntax (`[REQ-01, REQ-02]` → `REQ-01, REQ-02`) across all agents
- Verifier cross-references requirement IDs from PLAN frontmatter instead of only grepping REQUIREMENTS.md by phase number
- Orphaned requirements (mapped to phase in REQUIREMENTS.md but unclaimed by any plan) are detected and flagged

### Changed
- All `requirements` references across planner, templates, and workflows enforce MUST/REQUIRED/CRITICAL language — no more passive suggestions
- Plan checker now **fails** (blocking, not warning) when any roadmap requirement is absent from all plans
- Researcher receives phase-specific requirement IDs and must output a `<phase_requirements>` mapping table
- Phase requirement IDs extracted from ROADMAP and passed through full chain: researcher → planner → checker → executor → verifier
- Verification report requirements table expanded with Source Plan, Description, and Evidence columns

## [1.20.1] - 2026-02-16

### Fixed
- Auto-mode (`--auto`) now survives context compaction by persisting `workflow.auto_advance` to config.json on disk
- Checkpoints no longer block auto-mode: human-verify auto-approves, decision auto-selects first option (human-action still stops for auth gates)
- Plan-phase now passes `--auto` flag when spawning execute-phase
- Auto-advance clears on milestone complete to prevent runaway chains

## [1.20.0] - 2026-02-15

### Added
- `/EZ Agents:health` command — validates `.planning/` directory integrity with `--repair` flag for auto-fixing config.json and STATE.md
- `--full` flag for `/EZ Agents:quick` — enables plan-checking (max 2 iterations) and post-execution verification on quick tasks
- `--auto` flag wired from `/EZ Agents:new-project` through the full phase chain (discuss → plan → execute)
- Auto-advance chains phase execution across full milestones when `workflow.auto_advance` is enabled

### Fixed
- Plans created without user context — `/EZ Agents:plan-phase` warns when no CONTEXT.md exists, `/EZ Agents:discuss-phase` warns when plans already exist (#253)
- OpenCode installer converts `general-purpose` subagent type to OpenCode's `general`
- `/EZ Agents:complete-milestone` respects `commit_docs` setting when merging branches
- Phase directories tracked in git via `.gitkeep` files

## [1.19.2] - 2026-02-15

### Added
- User-level default settings via `~/.EZ Agents/defaults.json` — set EZ Agents defaults across all projects
- Per-agent model overrides — customize which Claude model each agent uses

### Changed
- Completed milestone phase directories are now archived for cleaner project structure
- Wave execution diagram added to README for clearer parallelization visualization

### Fixed
- OpenCode local installs now write config to `./.opencode/` instead of overwriting global `~/.config/opencode/`
- Large JSON payloads write to temp files to prevent truncation in tool calls
- Phase heading matching now supports `####` depth
- Phase padding normalized in insert command
- ESM conflicts prevented by renaming ez-tools.js to .cjs
- Config directory paths quoted in hook templates for local installs
- Settings file corruption prevented by using Write tool for file creation
- Plan-phase autocomplete fixed by removing "execution" from description
- Executor now has scope boundary and attempt limit to prevent runaway loops

## [1.19.1] - 2026-02-15

### Added
- Auto-advance pipeline: `--auto` flag on `discuss-phase` and `plan-phase` chains discuss → plan → execute without stopping. Also available as `workflow.auto_advance` config setting

### Fixed
- Phase transition routing now routes to `discuss-phase` (not `plan-phase`) when no CONTEXT.md exists — consistent across all workflows (#530)
- ROADMAP progress table plan counts are now computed from disk instead of LLM-edited — deterministic "X/Y Complete" values (#537)
- Verifier uses ROADMAP Success Criteria directly instead of deriving verification truths from the Goal field (#538)
- REQUIREMENTS.md traceability updates when a phase completes
- STATE.md updates after discuss-phase completes (#556)
- AskUserQuestion headers enforced to 12-char max to prevent UI truncation (#559)
- Agent model resolution returns `inherit` instead of hardcoded `opus` (#558)

## [1.19.0] - 2026-02-15

### Added
- Brave Search integration for researchers (requires BRAVE_API_KEY environment variable)
- GitHub issue templates for bug reports and feature requests
- Security policy for responsible disclosure
- Auto-labeling workflow for new issues

### Fixed
- UAT gaps and debug sessions now auto-resolve after gap-closure phase execution (#580)
- Fall back to ROADMAP.md when phase directory missing (#521)
- Template hook paths for OpenCode/Gemini runtimes (#585)
- Accept both `##` and `###` phase headers, detect malformed ROADMAPs (#598, #599)
- Use `{phase_num}` instead of ambiguous `{phase}` for filenames (#601)
- Add package.json to prevent ESM inheritance issues (#602)

## [1.18.0] - 2026-02-08

### Added
- `--auto` flag for `/EZ Agents:new-project` — runs research → requirements → roadmap automatically after config questions. Expects idea document via @ reference (e.g., `/EZ Agents:new-project --auto @prd.md`)

### Fixed
- Windows: SessionStart hook now spawns detached process correctly
- Windows: Replaced HEREDOC with literal newlines for git commit compatibility
- Research decision from `/EZ Agents:new-milestone` now persists to config.json

## [1.17.0] - 2026-02-08

### Added
- **ez-tools verification suite**: `verify plan-structure`, `verify phase-completeness`, `verify references`, `verify commits`, `verify artifacts`, `verify key-links` — deterministic structural checks
- **ez-tools frontmatter CRUD**: `frontmatter get/set/merge/validate` — safe YAML frontmatter operations with schema validation
- **ez-tools template fill**: `template fill summary/plan/verification` — pre-filled document skeletons
- **ez-tools state progression**: `state advance-plan`, `state update-progress`, `state record-metric`, `state add-decision`, `state add-blocker`, `state resolve-blocker`, `state record-session` — automates STATE.md updates
- **Local patch preservation**: Installer now detects locally modified EZ Agents files, backs them up to `ez-local-patches/`, and creates a manifest for restoration
- `/EZ Agents:reapply-patches` command to merge local modifications back after EZ Agents updates

### Changed
- Agents (executor, planner, plan-checker, verifier) now use ez-tools for state updates and verification instead of manual markdown parsing
- `/EZ Agents:update` workflow now notifies about backed-up local patches and suggests `/EZ Agents:reapply-patches`

### Fixed
- Added workaround for Claude Code `classifyHandoffIfNeeded` bug that causes false agent failures — execute-phase and quick workflows now spot-check actual output before reporting failure

## [1.16.0] - 2026-02-08

### Added
- 10 new ez-tools CLI commands that replace manual AI orchestration of mechanical operations:
  - `phase add <desc>` — append phase to roadmap + create directory
  - `phase insert <after> <desc>` — insert decimal phase
  - `phase remove <N> [--force]` — remove phase with full renumbering
  - `phase complete <N>` — mark done, update state + roadmap, detect milestone end
  - `roadmap analyze` — unified roadmap parser with disk status
  - `milestone complete <ver> [--name]` — archive roadmap/requirements/audit
  - `validate consistency` — check phase numbering and disk/roadmap sync
  - `progress [json|table|bar]` — render progress in various formats
  - `todo complete <file>` — move todo from pending to completed
  - `scaffold [context|uat|verification|phase-dir]` — template generation

### Changed
- Workflows now delegate deterministic operations to ez-tools CLI, reducing token usage and errors:
  - `remove-phase.md`: 13 manual steps → 1 CLI call + confirm + commit
  - `add-phase.md`: 6 manual steps → 1 CLI call + state update
  - `insert-phase.md`: 7 manual steps → 1 CLI call + state update
  - `complete-milestone.md`: archival delegated to `milestone complete`
  - `progress.md`: roadmap parsing delegated to `roadmap analyze`

### Fixed
- Execute-phase now correctly spawns `ez-executor` subagents instead of generic task agents
- `commit_docs=false` setting now respected in all `.planning/` commit paths (execute-plan, debugger, reference docs all route through ez-tools CLI)
- Execute-phase orchestrator no longer bloats context by embedding file content — passes paths instead, letting subagents read in their fresh context
- Windows: Normalized backslash paths in ez-tools invocations (contributed by @rmindel)

## [1.15.0] - 2026-02-08

### Changed
- Optimized workflow context loading to eliminate redundant file reads, reducing token usage by ~5,000-10,000 tokens per workflow execution

## [1.14.0] - 2026-02-08

### Added
- Context-optimizing parsing commands in ez-tools (`phase-plan-index`, `state-snapshot`, `summary-extract`) — reduces agent context usage by returning structured JSON instead of raw file content

### Fixed
- Installer no longer deletes opencode.json on JSONC parse errors — now handles comments, trailing commas, and BOM correctly (#474)

## [1.13.0] - 2026-02-08

### Added
- `ez-tools history-digest` — Compiles phase summaries into structured JSON for faster context loading
- `ez-tools phases list` — Lists phase directories with filtering (replaces fragile `ls | sort -V` patterns)
- `ez-tools roadmap get-phase` — Extracts phase sections from ROADMAP.md
- `ez-tools phase next-decimal` — Calculates next decimal phase number for insert operations
- `ez-tools state get/patch` — Atomic STATE.md field operations
- `ez-tools template select` — Chooses summary template based on plan complexity
- Summary template variants: minimal (~30 lines), standard (~60 lines), complex (~100 lines)
- Test infrastructure with 22 tests covering new commands

### Changed
- Planner uses two-step context assembly: digest for selection, full SUMMARY for understanding
- Agents migrated from bash patterns to structured ez-tools commands
- Nested YAML frontmatter parsing now handles `dependency-graph.provides`, `tech-stack.added` correctly

## [1.12.1] - 2026-02-08

### Changed
- Consolidated workflow initialization into compound `init` commands, reducing token usage and improving startup performance
- Updated 24 workflow and agent files to use single-call context gathering instead of multiple atomic calls

## [1.12.0] - 2026-02-07

### Changed
- **Architecture: Thin orchestrator pattern** — Commands now delegate to workflows, reducing command file size by ~75% and improving maintainability
- **Centralized utilities** — New `ez-tools.cjs` (11 functions) replaces repetitive bash patterns across 50+ files
- **Token reduction** — ~22k characters removed from affected command/workflow/agent files
- **Condensed agent prompts** — Same behavior with fewer words (executor, planner, verifier, researcher agents)

### Added
- `ez-tools.cjs` CLI utility with functions: state load/update, resolve-model, find-phase, commit, verify-summary, generate-slug, current-timestamp, list-todos, verify-path-exists, config-ensure-section

## [1.11.2] - 2026-02-05

### Added
- Security section in README with Claude Code deny rules for sensitive files

### Changed
- Install respects `attribution.commit` setting for OpenCode compatibility (#286)

### Fixed
- **CRITICAL:** Prevent API keys from being committed via `/EZ Agents:map-codebase` (#429)
- Enforce context fidelity in planning pipeline - agents now honor CONTEXT.md decisions (#326, #216, #206)
- Executor verifies task completion to prevent hallucinated success (#315)
- Auto-create `config.json` when missing during `/EZ Agents:settings` (#264)
- `/EZ Agents:update` respects local vs global install location
- Researcher writes RESEARCH.md regardless of `commit_docs` setting
- Statusline crash handling, color validation, git staging rules
- Statusline.js reference updated during install (#330)
- Parallelization config setting now respected (#379)
- ASCII box-drawing vs text content with diacritics (#289)
- Removed broken ez-gemini link (404)

## [1.11.1] - 2026-01-31

### Added
- Git branching strategy configuration with three options:
  - `none` (default): commit to current branch
  - `phase`: create branch per phase (`EZ Agents/phase-{N}-{slug}`)
  - `milestone`: create branch per milestone (`EZ Agents/{version}-{slug}`)
- Squash merge option at milestone completion (recommended) with merge-with-history alternative
- Context compliance verification dimension in plan checker — flags if plans contradict user decisions

### Fixed
- CONTEXT.md from `/EZ Agents:discuss-phase` now properly flows to all downstream agents (researcher, planner, checker, revision loop)

## [1.10.1] - 2025-01-30

### Fixed
- Gemini CLI agent loading errors that prevented commands from executing

## [1.10.0] - 2026-01-29

### Added
- Native Gemini CLI support — install with `--gemini` flag or select from interactive menu
- New `--all` flag to install for Claude Code, OpenCode, and Gemini simultaneously

### Fixed
- Context bar now shows 100% at actual 80% limit (was scaling incorrectly)

## [1.9.12] - 2025-01-23

### Removed
- `/EZ Agents:whats-new` command — use `/EZ Agents:update` instead (shows changelog with cancel option)

### Fixed
- Restored auto-release GitHub Actions workflow

## [1.9.11] - 2026-01-23

### Changed
- Switched to manual npm publish workflow (removed GitHub Actions CI/CD)

### Fixed
- Discord badge now uses static format for reliable rendering

## [1.9.10] - 2026-01-23

### Added
- Discord community link shown in installer completion message

## [1.9.9] - 2026-01-23

### Added
- `/EZ Agents:join-discord` command to quickly access the EZ Agents Discord community invite link

## [1.9.8] - 2025-01-22

### Added
- Uninstall flag (`--uninstall`) to cleanly remove EZ Agents from global or local installations

### Fixed
- Context file detection now matches filename variants (handles both `CONTEXT.md` and `{phase}-CONTEXT.md` patterns)

## [1.9.7] - 2026-01-22

### Fixed
- OpenCode installer now uses correct XDG-compliant config path (`~/.config/opencode/`) instead of `~/.opencode/`
- OpenCode commands use flat structure (`command/ez-help.md`) matching OpenCode's expected format
- OpenCode permissions written to `~/.config/opencode/opencode.json`

## [1.9.6] - 2026-01-22

### Added
- Interactive runtime selection: installer now prompts to choose Claude Code, OpenCode, or both
- Native OpenCode support: `--opencode` flag converts EZ Agents to OpenCode format automatically
- `--both` flag to install for both Claude Code and OpenCode in one command
- Auto-configures `~/.opencode.json` permissions for seamless EZ Agents doc access

### Changed
- Installation flow now asks for runtime first, then location
- Updated README with new installation options

## [1.9.5] - 2025-01-22

### Fixed
- Subagents can now access MCP tools (Context7, etc.) - workaround for Claude Code bug #13898
- Installer: Escape/Ctrl+C now cancels instead of installing globally
- Installer: Fixed hook paths on Windows
- Removed stray backticks in `/EZ Agents:new-project` output

### Changed
- Condensed verbose documentation in templates and workflows (-170 lines)
- Added CI/CD automation for releases

## [1.9.4] - 2026-01-21

### Changed
- Checkpoint automation now enforces automation-first principle: Claude starts servers, handles CLI installs, and fixes setup failures before presenting checkpoints to users
- Added server lifecycle protocol (port conflict handling, background process management)
- Added CLI auto-installation handling with safe-to-install matrix
- Added pre-checkpoint failure recovery (fix broken environment before asking user to verify)
- DRY refactor: checkpoints.md is now single source of truth for automation patterns

## [1.9.2] - 2025-01-21

### Removed
- **Codebase Intelligence System** — Removed due to overengineering concerns
  - Deleted `/EZ Agents:analyze-codebase` command
  - Deleted `/EZ Agents:query-intel` command
  - Removed SQLite graph database and sql.js dependency (21MB)
  - Removed intel hooks (ez-intel-index.js, ez-intel-session.js, ez-intel-prune.js)
  - Removed entity file generation and templates

### Fixed
- new-project now properly includes model_profile in config

## [1.9.0] - 2025-01-20

### Added
- **Model Profiles** — `/EZ Agents:set-profile` for quality/balanced/budget agent configurations
- **Workflow Settings** — `/EZ Agents:settings` command for toggling workflow behaviors interactively

### Fixed
- Orchestrators now inline file contents in Task prompts (fixes context issues with @ references)
- Tech debt from milestone audit addressed
- All hooks now use `ez-` prefix for consistency (statusline.js → ez-statusline.js)

## [1.8.0] - 2026-01-19

### Added
- Uncommitted planning mode: Keep `.planning/` local-only (not committed to git) via `planning.commit_docs: false` in config.json. Useful for OSS contributions, client work, or privacy preferences.
- `/EZ Agents:new-project` now asks about git tracking during initial setup, letting you opt out of committing planning docs from the start

## [1.7.1] - 2026-01-19

### Fixed
- Quick task PLAN and SUMMARY files now use numbered prefix (`001-PLAN.md`, `001-SUMMARY.md`) matching regular phase naming convention

## [1.7.0] - 2026-01-19

### Added
- **Quick Mode** (`/EZ Agents:quick`) — Execute small, ad-hoc tasks with EZ Agents guarantees but skip optional agents (researcher, checker, verifier). Quick tasks live in `.planning/quick/` with their own tracking in STATE.md.

### Changed
- Improved progress bar calculation to clamp values within 0-100 range
- Updated documentation with comprehensive Quick Mode sections in help.md, README.md, and ez-STYLE.md

### Fixed
- Console window flash on Windows when running hooks
- Empty `--config-dir` value validation
- Consistent `allowed-tools` YAML format across agents
- Corrected agent name in research-phase heading
- Removed hardcoded 2025 year from search query examples
- Removed dead ez-researcher agent references
- Integrated unused reference files into documentation

### Housekeeping
- Added homepage and bugs fields to package.json

## [1.6.4] - 2026-01-17

### Fixed
- Installation on WSL2/non-TTY terminals now works correctly - detects non-interactive stdin and falls back to global install automatically
- Installation now verifies files were actually copied before showing success checkmarks
- Orphaned `ez-notify.sh` hook from previous versions is now automatically removed during install (both file and settings.json registration)

## [1.6.3] - 2025-01-17

### Added
- `--gaps-only` flag for `/EZ Agents:execute-phase` — executes only gap closure plans after verify-work finds issues, eliminating redundant state discovery

## [1.6.2] - 2025-01-17

### Changed
- README restructured with clearer 6-step workflow: init → discuss → plan → execute → verify → complete
- Discuss-phase and verify-work now emphasized as critical steps in core workflow documentation
- "Subagent Execution" section replaced with "Multi-Agent Orchestration" explaining thin orchestrator pattern and 30-40% context efficiency
- Brownfield instructions consolidated into callout at top of "How It Works" instead of separate section
- Phase directories now created at discuss/plan-phase instead of during roadmap creation

## [1.6.1] - 2025-01-17

### Changed
- Installer performs clean install of EZ Agents folders, removing orphaned files from previous versions
- `/EZ Agents:update` shows changelog and asks for confirmation before updating, with clear warning about what gets replaced

## [1.6.0] - 2026-01-17

### Changed
- **BREAKING:** Unified `/EZ Agents:new-milestone` flow — now mirrors `/EZ Agents:new-project` with questioning → research → requirements → roadmap in a single command
- Roadmapper agent now references templates instead of inline structures for easier maintenance

### Removed
- **BREAKING:** `/EZ Agents:discuss-milestone` — consolidated into `/EZ Agents:new-milestone`
- **BREAKING:** `/EZ Agents:create-roadmap` — integrated into project/milestone flows
- **BREAKING:** `/EZ Agents:define-requirements` — integrated into project/milestone flows
- **BREAKING:** `/EZ Agents:research-project` — integrated into project/milestone flows

### Added
- `/EZ Agents:verify-work` now includes next-step routing after verification completes

## [1.5.30] - 2026-01-17

### Fixed
- Output templates in `plan-phase`, `execute-phase`, and `audit-milestone` now render markdown correctly instead of showing literal backticks
- Next-step suggestions now consistently recommend `/EZ Agents:discuss-phase` before `/EZ Agents:plan-phase` across all routing paths

## [1.5.29] - 2025-01-16

### Changed
- Discuss-phase now uses domain-aware questioning with deeper probing for gray areas

### Fixed
- Windows hooks now work via Node.js conversion (statusline, update-check)
- Phase input normalization at command entry points
- Removed blocking notification popups (ez-notify) on all platforms

## [1.5.28] - 2026-01-16

### Changed
- Consolidated milestone workflow into single command
- Merged domain expertise skills into agent configurations
- **BREAKING:** Removed `/EZ Agents:execute-plan` command (use `/EZ Agents:execute-phase` instead)

### Fixed
- Phase directory matching now handles both zero-padded (05-*) and unpadded (5-*) folder names
- Map-codebase agent output collection

## [1.5.27] - 2026-01-16

### Fixed
- Orchestrator corrections between executor completions are now committed (previously left uncommitted when orchestrator made small fixes between waves)

## [1.5.26] - 2026-01-16

### Fixed
- Revised plans now get committed after checker feedback (previously only initial plans were committed, leaving revisions uncommitted)

## [1.5.25] - 2026-01-16

### Fixed
- Stop notification hook no longer shows stale project state (now uses session-scoped todos only)
- Researcher agent now reliably loads CONTEXT.md from discuss-phase

## [1.5.24] - 2026-01-16

### Fixed
- Stop notification hook now correctly parses STATE.md fields (was always showing "Ready for input")
- Planner agent now reliably loads CONTEXT.md and RESEARCH.md files

## [1.5.23] - 2025-01-16

### Added
- Cross-platform completion notification hook (Mac/Linux/Windows alerts when Claude stops)
- Phase researcher now loads CONTEXT.md from discuss-phase to focus research on user decisions

### Fixed
- Consistent zero-padding for phase directories (01-name, not 1-name)
- Plan file naming: `{phase}-{plan}-PLAN.md` pattern restored across all agents
- Double-path bug in researcher git add command
- Removed `/EZ Agents:research-phase` from next-step suggestions (use `/EZ Agents:plan-phase` instead)

## [1.5.22] - 2025-01-16

### Added
- Statusline update indicator — shows `⬆ /EZ Agents:update` when a new version is available

### Fixed
- Planner now updates ROADMAP.md placeholders after planning completes

## [1.5.21] - 2026-01-16

### Added
- EZ Agents brand system for consistent UI (checkpoint boxes, stage banners, status symbols)
- Research synthesizer agent that consolidates parallel research into SUMMARY.md

### Changed
- **Unified `/EZ Agents:new-project` flow** — Single command now handles questions → research → requirements → roadmap (~10 min)
- Simplified README to reflect streamlined workflow: new-project → plan-phase → execute-phase
- Added optional `/EZ Agents:discuss-phase` documentation for UI/UX/behavior decisions before planning

### Fixed
- verify-work now shows clear checkpoint box with action prompt ("Type 'pass' or describe what's wrong")
- Planner uses correct `{phase}-{plan}-PLAN.md` naming convention
- Planner no longer surfaces internal `user_setup` in output
- Research synthesizer commits all research files together (not individually)
- Project researcher agent can no longer commit (orchestrator handles commits)
- Roadmap requires explicit user approval before committing

## [1.5.20] - 2026-01-16

### Fixed
- Research no longer skipped based on premature "Research: Unlikely" predictions made during roadmap creation. The `--skip-research` flag provides explicit control when needed.

### Removed
- `Research: Likely/Unlikely` fields from roadmap phase template
- `detect_research_needs` step from roadmap creation workflow
- Roadmap-based research skip logic from planner agent

## [1.5.19] - 2026-01-16

### Changed
- `/EZ Agents:discuss-phase` redesigned with intelligent gray area analysis — analyzes phase to identify discussable areas (UI, UX, Behavior, etc.), presents multi-select for user control, deep-dives each area with focused questioning
- Explicit scope guardrail prevents scope creep during discussion — captures deferred ideas without acting on them
- CONTEXT.md template restructured for decisions (domain boundary, decisions by category, Claude's discretion, deferred ideas)
- Downstream awareness: discuss-phase now explicitly documents that CONTEXT.md feeds researcher and planner agents
- `/EZ Agents:plan-phase` now integrates research — spawns `ez-phase-researcher` before planning unless research exists or `--skip-research` flag used

## [1.5.18] - 2026-01-16

### Added
- **Plan verification loop** — Plans are now verified before execution with a planner → checker → revise cycle
  - New `ez-plan-checker` agent (744 lines) validates plans will achieve phase goals
  - Six verification dimensions: requirement coverage, task completeness, dependency correctness, key links, scope sanity, must_haves derivation
  - Max 3 revision iterations before user escalation
  - `--skip-verify` flag for experienced users who want to bypass verification
- **Dedicated planner agent** — `ez-planner` (1,319 lines) consolidates all planning expertise
  - Complete methodology: discovery levels, task breakdown, dependency graphs, scope estimation, goal-backward analysis
  - Revision mode for handling checker feedback
  - TDD integration and checkpoint patterns
- **Statusline integration** — Context usage, model, and current task display

### Changed
- `/EZ Agents:plan-phase` refactored to thin orchestrator pattern (310 lines)
  - Spawns `ez-planner` for planning, `ez-plan-checker` for verification
  - User sees status between agent spawns (not a black box)
- Planning references deprecated with redirects to `ez-planner` agent sections
  - `plan-format.md`, `scope-estimation.md`, `goal-backward.md`, `principles.md`
  - `workflows/plan-phase.md`

### Fixed
- Removed zombie `ez-milestone-auditor` agent (was accidentally re-added after correct deletion)

### Removed
- Phase 99 throwaway test files

## [1.5.17] - 2026-01-15

### Added
- New `/EZ Agents:update` command — check for updates, install, and display changelog of what changed (better UX than raw `npx ez-agents-cc`)

## [1.5.16] - 2026-01-15

### Added
- New `ez-researcher` agent (915 lines) with comprehensive research methodology, 4 research modes (ecosystem, feasibility, implementation, comparison), source hierarchy, and verification protocols
- New `ez-debugger` agent (990 lines) with scientific debugging methodology, hypothesis testing, and 7+ investigation techniques
- New `ez-codebase-mapper` agent for brownfield codebase analysis
- Research subagent prompt template for context-only spawning

### Changed
- `/EZ Agents:research-phase` refactored to thin orchestrator — now injects rich context (key insight framing, downstream consumer info, quality gates) to ez-researcher agent
- `/EZ Agents:research-project` refactored to spawn 4 parallel ez-researcher agents with milestone-aware context (greenfield vs v1.1+) and roadmap implications guidance
- `/EZ Agents:debug` refactored to thin orchestrator (149 lines) — spawns ez-debugger agent with full debugging expertise
- `/EZ Agents:new-milestone` now explicitly references MILESTONE-CONTEXT.md

### Deprecated
- `workflows/research-phase.md` — consolidated into ez-researcher agent
- `workflows/research-project.md` — consolidated into ez-researcher agent
- `workflows/debug.md` — consolidated into ez-debugger agent
- `references/research-pitfalls.md` — consolidated into ez-researcher agent
- `references/debugging.md` — consolidated into ez-debugger agent
- `references/debug-investigation.md` — consolidated into ez-debugger agent

## [1.5.15] - 2025-01-15

### Fixed
- **Agents now install correctly** — The `agents/` folder (ez-executor, ez-verifier, ez-integration-checker, ez-milestone-auditor) was missing from npm package, now included

### Changed
- Consolidated `/EZ Agents:plan-fix` into `/EZ Agents:plan-phase --gaps` for simpler workflow
- UAT file writes now batched instead of per-response for better performance

## [1.5.14] - 2025-01-15

### Fixed
- Plan-phase now always routes to `/EZ Agents:execute-phase` after planning, even for single-plan phases

## [1.5.13] - 2026-01-15

### Fixed
- `/EZ Agents:new-milestone` now presents research and requirements paths as equal options, matching `/EZ Agents:new-project` format

## [1.5.12] - 2025-01-15

### Changed
- **Milestone cycle reworked for proper requirements flow:**
  - `complete-milestone` now archives AND deletes ROADMAP.md and REQUIREMENTS.md (fresh for next milestone)
  - `new-milestone` is now a "brownfield new-project" — updates PROJECT.md with new goals, routes to define-requirements
  - `discuss-milestone` is now required before `new-milestone` (creates context file)
  - `research-project` is milestone-aware — focuses on new features, ignores already-validated requirements
  - `create-roadmap` continues phase numbering from previous milestone
  - Flow: complete → discuss → new-milestone → research → requirements → roadmap

### Fixed
- `MILESTONE-AUDIT.md` now versioned as `v{version}-MILESTONE-AUDIT.md` and archived on completion
- `progress` now correctly routes to `/EZ Agents:discuss-milestone` when between milestones (Route F)

## [1.5.11] - 2025-01-15

### Changed
- Verifier reuses previous must-haves on re-verification instead of re-deriving, focuses deep verification on failed items with quick regression checks on passed items

## [1.5.10] - 2025-01-15

### Changed
- Milestone audit now reads existing phase VERIFICATION.md files instead of re-verifying each phase, aggregates tech debt and deferred gaps, adds `tech_debt` status for non-blocking accumulated debt

### Fixed
- VERIFICATION.md now included in phase completion commit alongside ROADMAP.md, STATE.md, and REQUIREMENTS.md

## [1.5.9] - 2025-01-15

### Added
- Milestone audit system (`/EZ Agents:audit-milestone`) for verifying milestone completion with parallel verification agents

### Changed
- Checkpoint display format improved with box headers and unmissable "→ YOUR ACTION:" prompts
- Subagent colors updated (executor: yellow, integration-checker: blue)
- Execute-phase now recommends `/EZ Agents:audit-milestone` when milestone completes

### Fixed
- Research-phase no longer gatekeeps by domain type

### Removed
- Domain expertise feature (`~/.claude/skills/expertise/`) - was personal tooling not available to other users

## [1.5.8] - 2025-01-15

### Added
- Verification loop: When gaps are found, verifier generates fix plans that execute automatically before re-verifying

### Changed
- `ez-executor` subagent color changed from red to blue

## [1.5.7] - 2025-01-15

### Added
- `ez-executor` subagent: Dedicated agent for plan execution with full workflow logic built-in
- `ez-verifier` subagent: Goal-backward verification that checks if phase goals are actually achieved (not just tasks completed)
- Phase verification: Automatic verification runs when a phase completes to catch stubs and incomplete implementations
- Goal-backward planning reference: Documentation for deriving must-haves from goals

### Changed
- execute-plan and execute-phase now spawn `ez-executor` subagent instead of using inline workflow
- Roadmap and planning workflows enhanced with goal-backward analysis

### Removed
- Obsolete templates (`checkpoint-resume.md`, `subagent-task-prompt.md`) — logic now lives in subagents

### Fixed
- Updated remaining `general-purpose` subagent references to use `ez-executor`

## [1.5.6] - 2025-01-15

### Changed
- README: Separated flow into distinct steps (1 → 1.5 → 2 → 3 → 4 → 5) making `research-project` clearly optional and `define-requirements` required
- README: Research recommended for quality; skip only for speed

### Fixed
- execute-phase: Phase metadata (timing, wave info) now bundled into single commit instead of separate commits

## [1.5.5] - 2025-01-15

### Changed
- README now documents the `research-project` → `define-requirements` flow (optional but recommended before `create-roadmap`)
- Commands section reorganized into 7 grouped tables (Setup, Execution, Verification, Milestones, Phase Management, Session, Utilities) for easier scanning
- Context Engineering table now includes `research/` and `REQUIREMENTS.md`

## [1.5.4] - 2025-01-15

### Changed
- Research phase now loads REQUIREMENTS.md to focus research on concrete requirements (e.g., "email verification") rather than just high-level roadmap descriptions

## [1.5.3] - 2025-01-15

### Changed
- **execute-phase narration**: Orchestrator now describes what each wave builds before spawning agents, and summarizes what was built after completion. No more staring at opaque status updates.
- **new-project flow**: Now offers two paths — research first (recommended) or define requirements directly (fast path for familiar domains)
- **define-requirements**: Works without prior research. Gathers requirements through conversation when FEATURES.md doesn't exist.

### Removed
- Dead `/EZ Agents:status` command (referenced abandoned background agent model)
- Unused `agent-history.md` template
- `_archive/` directory with old execute-phase version

## [1.5.2] - 2026-01-15

### Added
- Requirements traceability: roadmap phases now include `Requirements:` field listing which REQ-IDs they cover
- plan-phase loads REQUIREMENTS.md and shows phase-specific requirements before planning
- Requirements automatically marked Complete when phase finishes

### Changed
- Workflow preferences (mode, depth, parallelization) now asked in single prompt instead of 3 separate questions
- define-requirements shows full requirements list inline before commit (not just counts)
- Research-project and workflow aligned to both point to define-requirements as next step

### Fixed
- Requirements status now updated by orchestrator (commands) instead of subagent workflow, which couldn't determine phase completion

## [1.5.1] - 2026-01-14

### Changed
- Research agents write their own files directly (STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md) instead of returning results to orchestrator
- Slimmed principles.md and load it dynamically in core commands

## [1.5.0] - 2026-01-14

### Added
- New `/EZ Agents:research-project` command for pre-roadmap ecosystem research — spawns parallel agents to investigate stack, features, architecture, and pitfalls before you commit to a roadmap
- New `/EZ Agents:define-requirements` command for scoping v1 requirements from research findings — transforms "what exists in this domain" into "what we're building"
- Requirements traceability: phases now map to specific requirement IDs with 100% coverage validation

### Changed
- **BREAKING:** New project flow is now: `new-project → research-project → define-requirements → create-roadmap`
- Roadmap creation now requires REQUIREMENTS.md and validates all v1 requirements are mapped to phases
- Simplified questioning in new-project to four essentials (vision, core priority, boundaries, constraints)

## [1.4.29] - 2026-01-14

### Removed
- Deleted obsolete `_archive/execute-phase.md` and `status.md` commands

## [1.4.28] - 2026-01-14

### Fixed
- Restored comprehensive checkpoint documentation with full examples for verification, decisions, and auth gates
- Fixed execute-plan command to use fresh continuation agents instead of broken resume pattern
- Rich checkpoint presentation formats now documented for all three checkpoint types

### Changed
- Slimmed execute-phase command to properly delegate checkpoint handling to workflow

## [1.4.27] - 2025-01-14

### Fixed
- Restored "what to do next" commands after plan/phase execution completes — orchestrator pattern conversion had inadvertently removed the copy/paste-ready next-step routing

## [1.4.26] - 2026-01-14

### Added
- Full changelog history backfilled from git (66 historical versions from 1.0.0 to 1.4.23)

## [1.4.25] - 2026-01-14

### Added
- New `/EZ Agents:whats-new` command shows changes since your installed version
- VERSION file written during installation for version tracking
- CHANGELOG.md now included in package installation

## [1.4.24] - 2026-01-14

### Added
- USER-SETUP.md template for external service configuration

### Removed
- **BREAKING:** ISSUES.md system (replaced by phase-scoped UAT issues and TODOs)

## [1.4.23] - 2026-01-14

### Changed
- Removed dead ISSUES.md system code

## [1.4.22] - 2026-01-14

### Added
- Subagent isolation for debug investigations with checkpoint support

### Fixed
- DEBUG_DIR path constant to prevent typos in debug workflow

## [1.4.21] - 2026-01-14

### Fixed
- SlashCommand tool added to plan-fix allowed-tools

## [1.4.20] - 2026-01-14

### Fixed
- Standardized debug file naming convention
- Debug workflow now invokes execute-plan correctly

## [1.4.19] - 2026-01-14

### Fixed
- Auto-diagnose issues instead of offering choice in plan-fix

## [1.4.18] - 2026-01-14

### Added
- Parallel diagnosis before plan-fix execution

## [1.4.17] - 2026-01-14

### Changed
- Redesigned verify-work as conversational UAT with persistent state

## [1.4.16] - 2026-01-13

### Added
- Pre-execution summary for interactive mode in execute-plan
- Pre-computed wave numbers at plan time

## [1.4.15] - 2026-01-13

### Added
- Context rot explanation to README header

## [1.4.14] - 2026-01-13

### Changed
- YOLO mode is now recommended default in new-project

## [1.4.13] - 2026-01-13

### Fixed
- Brownfield flow documentation
- Removed deprecated resume-task references

## [1.4.12] - 2026-01-13

### Changed
- execute-phase is now recommended as primary execution command

## [1.4.11] - 2026-01-13

### Fixed
- Checkpoints now use fresh continuation agents instead of resume

## [1.4.10] - 2026-01-13

### Changed
- execute-plan converted to orchestrator pattern for performance

## [1.4.9] - 2026-01-13

### Changed
- Removed subagent-only context from execute-phase orchestrator

### Fixed
- Removed "what's out of scope" question from discuss-phase

## [1.4.8] - 2026-01-13

### Added
- TDD reasoning explanation restored to plan-phase docs

## [1.4.7] - 2026-01-13

### Added
- Project state loading before execution in execute-phase

### Fixed
- Parallel execution marked as recommended, not experimental

## [1.4.6] - 2026-01-13

### Added
- Checkpoint pause/resume for spawned agents
- Deviation rules, commit rules, and workflow references to execute-phase

## [1.4.5] - 2026-01-13

### Added
- Parallel-first planning with dependency graphs
- Checkpoint-resume capability for long-running phases
- `.claude/rules/` directory for auto-loaded contribution rules

### Changed
- execute-phase uses wave-based blocking execution

## [1.4.4] - 2026-01-13

### Fixed
- Inline listing for multiple active debug sessions

## [1.4.3] - 2026-01-13

### Added
- `/EZ Agents:debug` command for systematic debugging with persistent state

## [1.4.2] - 2026-01-13

### Fixed
- Installation verification step clarification

## [1.4.1] - 2026-01-13

### Added
- Parallel phase execution via `/EZ Agents:execute-phase`
- Parallel-aware planning in `/EZ Agents:plan-phase`
- `/EZ Agents:status` command for parallel agent monitoring
- Parallelization configuration in config.json
- Wave-based parallel execution with dependency graphs

### Changed
- Renamed `execute-phase.md` workflow to `execute-plan.md` for clarity
- Plan frontmatter now includes `wave`, `depends_on`, `files_modified`, `autonomous`

## [1.4.0] - 2026-01-12

### Added
- Full parallel phase execution system
- Parallelization frontmatter in plan templates
- Dependency analysis for parallel task scheduling
- Agent history schema v1.2 with parallel execution support

### Changed
- Plans can now specify wave numbers and dependencies
- execute-phase orchestrates multiple subagents in waves

## [1.3.34] - 2026-01-11

### Added
- `/EZ Agents:add-todo` and `/EZ Agents:check-todos` for mid-session idea capture

## [1.3.33] - 2026-01-11

### Fixed
- Consistent zero-padding for decimal phase numbers (e.g., 01.1)

### Changed
- Removed obsolete .claude-plugin directory

## [1.3.32] - 2026-01-10

### Added
- `/EZ Agents:resume-task` for resuming interrupted subagent executions

## [1.3.31] - 2026-01-08

### Added
- Planning principles for security, performance, and observability
- Pro patterns section in README

## [1.3.30] - 2026-01-08

### Added
- verify-work option surfaces after plan execution

## [1.3.29] - 2026-01-08

### Added
- `/EZ Agents:verify-work` for conversational UAT validation
- `/EZ Agents:plan-fix` for fixing UAT issues
- UAT issues template

## [1.3.28] - 2026-01-07

### Added
- `--config-dir` CLI argument for multi-account setups
- `/EZ Agents:remove-phase` command

### Fixed
- Validation for --config-dir edge cases

## [1.3.27] - 2026-01-07

### Added
- Recommended permissions mode documentation

### Fixed
- Mandatory verification enforced before phase/milestone completion routing

## [1.3.26] - 2026-01-06

### Added
- Claude Code marketplace plugin support

### Fixed
- Phase artifacts now committed when created

## [1.3.25] - 2026-01-06

### Fixed
- Milestone discussion context persists across /clear

## [1.3.24] - 2026-01-06

### Added
- `CLAUDE_CONFIG_DIR` environment variable support

## [1.3.23] - 2026-01-06

### Added
- Non-interactive install flags (`--global`, `--local`) for Docker/CI

## [1.3.22] - 2026-01-05

### Changed
- Removed unused auto.md command

## [1.3.21] - 2026-01-05

### Changed
- TDD features use dedicated plans for full context quality

## [1.3.20] - 2026-01-05

### Added
- Per-task atomic commits for better AI observability

## [1.3.19] - 2026-01-05

### Fixed
- Clarified create-milestone.md file locations with explicit instructions

## [1.3.18] - 2026-01-05

### Added
- YAML frontmatter schema with dependency graph metadata
- Intelligent context assembly via frontmatter dependency graph

## [1.3.17] - 2026-01-04

### Fixed
- Clarified depth controls compression, not inflation in planning

## [1.3.16] - 2026-01-04

### Added
- Depth parameter for planning thoroughness (`--depth=1-5`)

## [1.3.15] - 2026-01-01

### Fixed
- TDD reference loaded directly in commands

## [1.3.14] - 2025-12-31

### Added
- TDD integration with detection, annotation, and execution flow

## [1.3.13] - 2025-12-29

### Fixed
- Restored deterministic bash commands
- Removed redundant decision_gate

## [1.3.12] - 2025-12-29

### Fixed
- Restored plan-format.md as output template

## [1.3.11] - 2025-12-29

### Changed
- 70% context reduction for plan-phase workflow
- Merged CLI automation into checkpoints
- Compressed scope-estimation (74% reduction) and plan-phase.md (66% reduction)

## [1.3.10] - 2025-12-29

### Fixed
- Explicit plan count check in offer_next step

## [1.3.9] - 2025-12-27

### Added
- Evolutionary PROJECT.md system with incremental updates

## [1.3.8] - 2025-12-18

### Added
- Brownfield/existing projects section in README

## [1.3.7] - 2025-12-18

### Fixed
- Improved incremental codebase map updates

## [1.3.6] - 2025-12-18

### Added
- File paths included in codebase mapping output

## [1.3.5] - 2025-12-17

### Fixed
- Removed arbitrary 100-line limit from codebase mapping

## [1.3.4] - 2025-12-17

### Fixed
- Inline code for Next Up commands (avoids nesting ambiguity)

## [1.3.3] - 2025-12-17

### Fixed
- Check PROJECT.md not .planning/ directory for existing project detection

## [1.3.2] - 2025-12-17

### Added
- Git commit step to map-codebase workflow

## [1.3.1] - 2025-12-17

### Added
- `/EZ Agents:map-codebase` documentation in help and README

## [1.3.0] - 2025-12-17

### Added
- `/EZ Agents:map-codebase` command for brownfield project analysis
- Codebase map templates (stack, architecture, structure, conventions, testing, integrations, concerns)
- Parallel Explore agent orchestration for codebase analysis
- Brownfield integration into EZ Agents workflows

### Changed
- Improved continuation UI with context and visual hierarchy

### Fixed
- Permission errors for non-DSP users (removed shell context)
- First question is now freeform, not AskUserQuestion

## [1.2.13] - 2025-12-17

### Added
- Improved continuation UI with context and visual hierarchy

## [1.2.12] - 2025-12-17

### Fixed
- First question should be freeform, not AskUserQuestion

## [1.2.11] - 2025-12-17

### Fixed
- Permission errors for non-DSP users (removed shell context)

## [1.2.10] - 2025-12-16

### Fixed
- Inline command invocation replaced with clear-then-paste pattern

## [1.2.9] - 2025-12-16

### Fixed
- Git init runs in current directory

## [1.2.8] - 2025-12-16

### Changed
- Phase count derived from work scope, not arbitrary limits

## [1.2.7] - 2025-12-16

### Fixed
- AskUserQuestion mandated for all exploration questions

## [1.2.6] - 2025-12-16

### Changed
- Internal refactoring

## [1.2.5] - 2025-12-16

### Changed
- `<if mode>` tags for yolo/interactive branching

## [1.2.4] - 2025-12-16

### Fixed
- Stale CONTEXT.md references updated to new vision structure

## [1.2.3] - 2025-12-16

### Fixed
- Enterprise language removed from help and discuss-milestone

## [1.2.2] - 2025-12-16

### Fixed
- new-project completion presented inline instead of as question

## [1.2.1] - 2025-12-16

### Fixed
- AskUserQuestion restored for decision gate in questioning flow

## [1.2.0] - 2025-12-15

### Changed
- Research workflow implemented as Claude Code context injection

## [1.1.2] - 2025-12-15

### Fixed
- YOLO mode now skips confirmation gates in plan-phase

## [1.1.1] - 2025-12-15

### Added
- README documentation for new research workflow

## [1.1.0] - 2025-12-15

### Added
- Pre-roadmap research workflow
- `/EZ Agents:research-phase` for niche domain ecosystem discovery
- `/EZ Agents:research-project` command with workflow and templates
- `/EZ Agents:create-roadmap` command with research-aware workflow
- Research subagent prompt templates

### Changed
- new-project split to only create PROJECT.md + config.json
- Questioning rewritten as thinking partner, not interviewer

## [1.0.11] - 2025-12-15

### Added
- `/EZ Agents:research-phase` for niche domain ecosystem discovery

## [1.0.10] - 2025-12-15

### Fixed
- Scope creep prevention in discuss-phase command

## [1.0.9] - 2025-12-15

### Added
- Phase CONTEXT.md loaded in plan-phase command

## [1.0.8] - 2025-12-15

### Changed
- PLAN.md included in phase completion commits

## [1.0.7] - 2025-12-15

### Added
- Path replacement for local installs

## [1.0.6] - 2025-12-15

### Changed
- Internal improvements

## [1.0.5] - 2025-12-15

### Added
- Global/local install prompt during setup

### Fixed
- Bin path fixed (removed ./)
- .DS_Store ignored

## [1.0.4] - 2025-12-15

### Fixed
- Bin name and circular dependency removed

## [1.0.3] - 2025-12-15

### Added
- TDD guidance in planning workflow

## [1.0.2] - 2025-12-15

### Added
- Issue triage system to prevent deferred issue pile-up

## [1.0.1] - 2025-12-15

### Added
- Initial npm package release

## [1.0.0] - 2025-12-14

### Added
- Initial release of EZ Agents (Get Shit Done) meta-prompting system
- Core slash commands: `/EZ Agents:new-project`, `/EZ Agents:discuss-phase`, `/EZ Agents:plan-phase`, `/EZ Agents:execute-phase`
- PROJECT.md and STATE.md templates
- Phase-based development workflow
- YOLO mode for autonomous execution
- Interactive mode with checkpoints

[Unreleased]: https://github.com/glittercowboy/ez-agents/compare/v1.22.4...HEAD
[1.22.4]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.22.4
[1.22.3]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.22.3
[1.22.2]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.22.2
[1.22.1]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.22.1
[1.22.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.22.0
[1.21.1]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.21.1
[1.21.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.21.0
[1.20.6]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.20.6
[1.20.5]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.20.5
[1.20.4]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.20.4
[1.20.3]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.20.3
[1.20.2]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.20.2
[1.20.1]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.20.1
[1.20.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.20.0
[1.19.2]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.19.2
[1.19.1]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.19.1
[1.19.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.19.0
[1.18.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.18.0
[1.17.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.17.0
[1.16.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.16.0
[1.15.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.15.0
[1.14.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.14.0
[1.13.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.13.0
[1.12.1]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.12.1
[1.12.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.12.0
[1.11.2]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.11.2
[1.11.1]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.11.0
[1.10.1]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.10.1
[1.10.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.10.0
[1.9.12]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.9.12
[1.9.11]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.9.11
[1.9.10]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.9.10
[1.9.9]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.9.9
[1.9.8]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.9.8
[1.9.7]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.9.7
[1.9.6]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.9.6
[1.9.5]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.9.5
[1.9.4]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.9.4
[1.9.2]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.9.2
[1.9.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.9.0
[1.8.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.8.0
[1.7.1]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.7.1
[1.7.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.7.0
[1.6.4]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.6.4
[1.6.3]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.6.3
[1.6.2]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.6.2
[1.6.1]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.6.1
[1.6.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.6.0
[1.5.30]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.30
[1.5.29]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.29
[1.5.28]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.28
[1.5.27]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.27
[1.5.26]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.26
[1.5.25]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.25
[1.5.24]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.24
[1.5.23]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.23
[1.5.22]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.22
[1.5.21]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.21
[1.5.20]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.20
[1.5.19]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.19
[1.5.18]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.18
[1.5.17]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.17
[1.5.16]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.16
[1.5.15]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.15
[1.5.14]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.14
[1.5.13]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.13
[1.5.12]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.12
[1.5.11]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.11
[1.5.10]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.10
[1.5.9]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.9
[1.5.8]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.8
[1.5.7]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.7
[1.5.6]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.6
[1.5.5]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.5
[1.5.4]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.4
[1.5.3]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.3
[1.5.2]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.2
[1.5.1]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.1
[1.5.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.5.0
[1.4.29]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.29
[1.4.28]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.28
[1.4.27]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.27
[1.4.26]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.26
[1.4.25]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.25
[1.4.24]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.24
[1.4.23]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.23
[1.4.22]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.22
[1.4.21]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.21
[1.4.20]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.20
[1.4.19]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.19
[1.4.18]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.18
[1.4.17]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.17
[1.4.16]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.16
[1.4.15]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.15
[1.4.14]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.14
[1.4.13]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.13
[1.4.12]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.12
[1.4.11]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.11
[1.4.10]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.10
[1.4.9]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.9
[1.4.8]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.8
[1.4.7]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.7
[1.4.6]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.6
[1.4.5]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.5
[1.4.4]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.4
[1.4.3]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.3
[1.4.2]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.2
[1.4.1]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.1
[1.4.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.4.0
[1.3.34]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.34
[1.3.33]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.33
[1.3.32]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.32
[1.3.31]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.31
[1.3.30]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.30
[1.3.29]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.29
[1.3.28]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.28
[1.3.27]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.27
[1.3.26]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.26
[1.3.25]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.25
[1.3.24]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.24
[1.3.23]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.23
[1.3.22]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.22
[1.3.21]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.21
[1.3.20]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.20
[1.3.19]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.19
[1.3.18]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.18
[1.3.17]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.17
[1.3.16]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.16
[1.3.15]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.15
[1.3.14]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.14
[1.3.13]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.13
[1.3.12]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.12
[1.3.11]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.11
[1.3.10]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.10
[1.3.9]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.9
[1.3.8]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.8
[1.3.7]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.7
[1.3.6]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.6
[1.3.5]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.5
[1.3.4]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.4
[1.3.3]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.3
[1.3.2]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.2
[1.3.1]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.1
[1.3.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.3.0
[1.2.13]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.2.13
[1.2.12]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.2.12
[1.2.11]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.2.11
[1.2.10]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.2.10
[1.2.9]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.2.9
[1.2.8]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.2.8
[1.2.7]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.2.7
[1.2.6]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.2.6
[1.2.5]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.2.5
[1.2.4]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.2.4
[1.2.3]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.2.3
[1.2.2]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.2.2
[1.2.1]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.2.1
[1.2.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.2.0
[1.1.2]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.1.2
[1.1.1]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.1.1
[1.1.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.1.0
[1.0.11]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.0.11
[1.0.10]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.0.10
[1.0.9]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.0.9
[1.0.8]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.0.8
[1.0.7]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.0.7
[1.0.6]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.0.6
[1.0.5]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.0.5
[1.0.4]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.0.4
[1.0.3]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.0.3
[1.0.2]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.0.2
[1.0.1]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.0.1
[1.0.0]: https://github.com/glittercowboy/ez-agents/releases/tag/v1.0.0
