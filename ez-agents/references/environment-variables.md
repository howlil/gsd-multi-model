# EZ Agents Environment Variables Reference

Complete reference for configuring EZ Agents via environment variables.

## Core Configuration

### `EZ_AGENTS_ROOT`

**Purpose:** Override the default EZ Agents installation directory

**Default:** `~/.claude/ez-agents`

**Example:**
```bash
export EZ_AGENTS_ROOT=/opt/ez-agents
export EZ_AGENTS_ROOT=$HOME/.config/ez-agents
```

**Use cases:**
- Multi-runtime setups (share one installation across Claude Code, OpenCode, Qwen Code, etc.)
- Custom installation locations
- Testing different EZ Agents versions
- System-wide installations

---

### `EZ_AGENTS_SKILLS_PATH`

**Purpose:** Override the default global skills directory

**Default:** `~/.skills/ez-agents`

**Example:**
```bash
export EZ_AGENTS_SKILLS_PATH=/shared/skills
export EZ_AGENTS_SKILLS_PATH=$HOME/.config/ez-agents-skills
```

**Use cases:**
- Shared skills across teams
- Custom skills organization
- Testing skill modifications

---

## Runtime-Specific Overrides

These environment variables tell EZ Agents which runtime config directory to use:

### `CLAUDE_CONFIG_DIR`

**Purpose:** Override Claude Code config directory

**Default:** `~/.claude`

---

### `OPENCODE_CONFIG_DIR` or `OPENCODE_CONFIG`

**Purpose:** Override OpenCode config directory

**Default:** `~/.config/opencode`

---

### `GEMINI_CONFIG_DIR`

**Purpose:** Override Gemini CLI config directory

**Default:** `~/.gemini`

---

### `CODEX_HOME`

**Purpose:** Override Codex config directory

**Default:** `~/.codex`

---

### `COPILOT_CONFIG_DIR`

**Purpose:** Override GitHub Copilot config directory

**Default:** `~/.copilot`

---

### `QWEN_CONFIG_DIR`

**Purpose:** Override Qwen Code config directory

**Default:** `~/.qwen`

---

### `KIMI_CONFIG_DIR`

**Purpose:** Override Kimi Code config directory

**Default:** `~/.kimi`

---

## Workflow Configuration

### `EZ_AGENTS_MODEL_PROFILE`

**Purpose:** Override the default model profile from `.planning/config.json`

**Values:** `quality`, `balanced`, `budget`

**Example:**
```bash
export EZ_AGENTS_MODEL_PROFILE=quality
```

---

### `EZ_AGENTS_AUTO_MODE`

**Purpose:** Force auto mode for all workflows (skip checkpoints)

**Values:** `true`, `false`

**Example:**
```bash
export EZ_AGENTS_AUTO_MODE=true
```

---

## Debug & Logging

### `EZ_AGENTS_DEBUG`

**Purpose:** Enable debug logging

**Values:** `true`, `false`, `verbose`

**Example:**
```bash
export EZ_AGENTS_DEBUG=true
export EZ_AGENTS_DEBUG=verbose
```

---

### `EZ_AGENTS_LOG_LEVEL`

**Purpose:** Set logging level

**Values:** `error`, `warn`, `info`, `debug`

**Default:** `info`

**Example:**
```bash
export EZ_AGENTS_LOG_LEVEL=debug
```

---

### `EZ_AGENTS_LOG_FILE`

**Purpose:** Custom log file path

**Default:** `.planning/logs/ez-agents.log`

**Example:**
```bash
export EZ_AGENTS_LOG_FILE=/tmp/ez-agents.log
```

---

## Performance & Limits

### `EZ_AGENTS_MAX_TOKENS`

**Purpose:** Override default max tokens per request

**Default:** Agent-specific (see `bin/lib/core.ts` MODEL_PROFILES)

**Example:**
```bash
export EZ_AGENTS_MAX_TOKENS=8192
```

---

### `EZ_AGENTS_TIMEOUT_MS`

**Purpose:** Default timeout for agent operations

**Default:** `300000` (5 minutes)

**Example:**
```bash
export EZ_AGENTS_TIMEOUT_MS=600000
```

---

### `EZ_AGENTS_MAX_RETRIES`

**Purpose:** Maximum retry attempts for failed operations

**Default:** `3`

**Example:**
```bash
export EZ_AGENTS_MAX_RETRIES=5
```

---

## Feature Flags

### `EZ_AGENTS_ENABLE_METRICS`

**Purpose:** Enable workflow metrics tracking

**Values:** `true`, `false`

**Default:** `true`

**Example:**
```bash
export EZ_AGENTS_ENABLE_METRICS=false
```

---

### `EZ_AGENTS_ENABLE_ANALYTICS`

**Purpose:** Enable usage analytics

**Values:** `true`, `false`

**Default:** `false`

**Example:**
```bash
export EZ_AGENTS_ENABLE_ANALYTICS=true
```

---

### `EZ_AGENTS_DISABLE_VERIFICATION`

**Purpose:** Skip automated verification steps

**Values:** `true`, `false`

**Default:** `false`

**Example:**
```bash
export EZ_AGENTS_DISABLE_VERIFICATION=true
```

---

## Git & Branching

### `EZ_AGENTS_GIT_BRANCH_PREFIX`

**Purpose:** Override default branch name prefix

**Default:** `ez/`

**Example:**
```bash
export EZ_AGENTS_GIT_BRANCH_PREFIX=feature/
```

---

### `EZ_AGENTS_GIT_AUTHOR_NAME`

**Purpose:** Override git author name for planning commits

**Default:** System git config

**Example:**
```bash
export EZ_AGENTS_GIT_AUTHOR_NAME="EZ Agents Bot"
```

---

### `EZ_AGENTS_GIT_AUTHOR_EMAIL`

**Purpose:** Override git author email for planning commits

**Default:** System git config

**Example:**
```bash
export EZ_AGENTS_GIT_AUTHOR_EMAIL="ez-agents@example.com"
```

---

## Cost Tracking

### `EZ_AGENTS_COST_TRACKING_ENABLED`

**Purpose:** Enable/disable cost tracking

**Values:** `true`, `false`

**Default:** `true`

**Example:**
```bash
export EZ_AGENTS_COST_TRACKING_ENABLED=false
```

---

### `EZ_AGENTS_COST_BUDGET_LIMIT`

**Purpose:** Set daily cost budget limit (USD)

**Default:** No limit

**Example:**
```bash
export EZ_AGENTS_COST_BUDGET_LIMIT=10.00
```

---

## Sandbox & Security

### `EZ_AGENTS_SANDBOX_MODE`

**Purpose:** Enable sandbox execution mode

**Values:** `true`, `false`, `docker`, `firejail`

**Default:** `false`

**Example:**
```bash
export EZ_AGENTS_SANDBOX_MODE=docker
```

---

### `EZ_AGENTS_VAULT_PATH`

**Purpose:** Custom secrets vault location

**Default:** `.planning/.vault`

**Example:**
```bash
export EZ_AGENTS_VAULT_PATH=/secure/vault
```

---

## Multi-Runtime Setup Example

Share one EZ Agents installation across multiple AI runtimes:

```bash
# Install once
export EZ_AGENTS_ROOT=/opt/ez-agents

# Claude Code
export CLAUDE_CONFIG_DIR=$HOME/.claude
ln -s $EZ_AGENTS_ROOT/commands/ez/* $CLAUDE_CONFIG_DIR/commands/

# Qwen Code
export QWEN_CONFIG_DIR=$HOME/.qwen
ln -s $EZ_AGENTS_ROOT/commands/ez/* $QWEN_CONFIG_DIR/commands/

# OpenCode
export OPENCODE_CONFIG_DIR=$HOME/.config/opencode
ln -s $EZ_AGENTS_ROOT/commands/ez/* $OPENCODE_CONFIG_DIR/commands/
```

---

## Skills Sharing Example

Share skills across team members:

```bash
# Shared network location
export EZ_AGENTS_SKILLS_PATH=/shared/team-skills

# All team members use the same skills
# Updates propagate automatically
```

---

## Debugging Setup

```bash
# Enable verbose logging
export EZ_AGENTS_DEBUG=verbose
export EZ_AGENTS_LOG_LEVEL=debug
export EZ_AGENTS_LOG_FILE=/tmp/ez-agents-debug.log

# Disable metrics/analytics for clean debugging
export EZ_AGENTS_ENABLE_METRICS=false
export EZ_AGENTS_ENABLE_ANALYTICS=false
```

---

## Environment Variable Priority

1. **Environment variable** (highest priority)
2. **`.planning/config.json`** settings
3. **Default values** (lowest priority)

**Example:**
```bash
# This overrides .planning/config.json
export EZ_AGENTS_MODEL_PROFILE=quality

# This overrides default behavior
export EZ_AGENTS_AUTO_MODE=true
```

---

## Export Helper Function

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
# EZ Agents configuration
export EZ_AGENTS_ROOT=$HOME/.claude/ez-agents
export EZ_AGENTS_DEBUG=${EZ_AGENTS_DEBUG:-false}
export EZ_AGENTS_LOG_LEVEL=${EZ_AGENTS_LOG_LEVEL:-info}

# Optional: skills sharing
# export EZ_AGENTS_SKILLS_PATH=/shared/skills

# Optional: custom git prefix
# export EZ_AGENTS_GIT_BRANCH_PREFIX=feature/
```

---

## Validation

Check current environment configuration:

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" doctor

# Output shows:
# ✓ EZ_AGENTS_ROOT: /path/to/ez-agents
# ✓ Skills path: /path/to/skills
# ✓ Config: .planning/config.json
# ✓ Runtime: claude-code
```

---

## See Also

- [[checkpoints.md]] - Human-AI interaction patterns
- [[tier-strategy.md]] - Release strategy configuration
- [[model-strategy.md]] - Model profile selection
- `bin/lib/core.ts` - Core configuration source code
