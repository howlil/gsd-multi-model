# AI CLI Provider Behaviors

This document describes the behavioral differences between AI CLI providers that EZ Agents supports. Understanding these differences helps you write compatible workflows and understand why certain transformations are applied during installation.

## Supported Providers

| Provider | Config Directory | Command Prefix | Invocation Format |
|----------|-----------------|----------------|-------------------|
| Claude Code | `~/.claude/` | `/ez:` | `/ez:command-name` |
| OpenCode | `~/.config/opencode/` or `~/.opencode/` | `/ez-` | `/ez-command-name` |
| Gemini CLI | `~/.gemini/` | `/ez-` | `/ez-command-name` |
| Codex | `~/.codex/` | `$ez-` | `$ez-command-name` |
| Copilot | `~/.copilot/` | `/ez-` | `/ez-command-name` |
| Qwen Code | `~/.qwen/` | `/ez-` | `/ez-command-name` |
| Kimi Code | `~/.kimi/` | `/ez-` | `/ez-command-name` |

## Command Structure Differences

### Claude Code
- **Format**: Slash commands with colon separator
- **Example**: `/ez:new-project`, `/ez:plan-phase 1`
- **Location**: `~/.claude/commands/ez/*.md`
- **Frontmatter**: YAML with `allowed-tools:` as multiline array
- **Tool Names**: PascalCase (e.g., `Read`, `Write`, `Bash`, `TodoWrite`)

### OpenCode
- **Format**: Slash commands with hyphen separator
- **Example**: `/ez-new-project`, `/ez-plan-phase`
- **Location**: `~/.config/opencode/command/ez-*.md` (flat structure)
- **Frontmatter**: YAML with `tools:` as object mapping
- **Tool Names**: lowercase (e.g., `read`, `edit`, `question`, `todowrite`)
- **Path References**: `~/.config/opencode/` instead of `~/.claude/`

### Gemini CLI
- **Format**: Slash commands with hyphen separator
- **Example**: `/ez-new-project`, `/ez-plan-phase`
- **Location**: `~/.gemini/commands/ez-*.toml`
- **Frontmatter**: TOML format, not Markdown
- **Tool Names**: snake_case built-in names (e.g., `read_file`, `write_file`, `run_shell_command`, `write_todos`)
- **Special Handling**: 
  - MCP tools auto-discovered at runtime (not listed in frontmatter)
  - Agent tools auto-registered (Task tool excluded from frontmatter)
  - `<sub>` tags stripped from output (terminals can't render subscript)

### Codex
- **Format**: Dollar sign prefix with hyphen separator
- **Example**: `$ez-new-project`, `$ez-plan-phase`
- **Location**: `~/.codex/skills/ez-*/SKILL.md`
- **Frontmatter**: TOML format with skill adapter header
- **Tool Names**: lowercase
- **Special Handling**:
  - Uses `<codex_skill_adapter>` header for EZ Agents workflow compatibility
  - `AskUserQuestion` → `request_user_input` mapping
  - `Task()` → `spawn_agent()` mapping
  - MCP tools auto-discovered from `mcpServers` config
  - Per-role sandbox configuration in `.toml` files

### Copilot
- **Format**: Slash commands with hyphen separator
- **Example**: `/ez-new-project`, `/ez-plan-phase`
- **Location**: `~/.copilot/skills/ez-*/SKILL.md`
- **Frontmatter**: YAML with `tools:` as JSON array
- **Tool Names**: lowercase with special mappings
- **Special Handling**:
  - `mcp__context7__*` → `io.github.upstash/context7/*` wildcard mapping
  - Path conversion: `~/.claude/` → `~/.copilot/`
  - Command name conversion: `ez:` → `ez-` in all references

### Qwen Code
- **Format**: Slash commands with hyphen separator
- **Example**: `/ez-new-project`, `/ez-plan-phase`
- **Location**: `~/.qwen/skills/ez-*/SKILL.md`
- **Frontmatter**: Simple Markdown, no complex frontmatter required
- **Tool Names**: lowercase
- **Special Handling**:
  - Skill architecture uses `skills/` directory structure with `SKILL.md` files
  - Path conversion: `~/.claude/` → `~/.qwen/`
  - Uses Alibaba DashScope SDK for model interactions

### Kimi Code
- **Format**: Slash commands with hyphen separator
- **Example**: `/ez-new-project`, `/ez-plan-phase`
- **Location**: `~/.kimi/skills/ez-*/SKILL.md`
- **Frontmatter**: Simple Markdown, no complex frontmatter required
- **Tool Names**: lowercase
- **Special Handling**:
  - Skill architecture uses `skills/` directory structure with `SKILL.md` files
  - Path conversion: `~/.claude/` → `~/.kimi/`
  - Uses Moonshot AI API for model interactions

## Tool Name Mappings

EZ Agents automatically transforms tool names during installation to match each provider's conventions:

| Claude Code | OpenCode | Gemini CLI | Codex | Copilot | Qwen Code | Kimi Code |
|-------------|----------|------------|-------|---------|-----------|-----------|
| `Read` | `read` | `read_file` | `read` | `read` | `read` | `read` |
| `Write` | `write` | `write_file` | `write` | `edit` | `write` | `write` |
| `Edit` | `edit` | `replace` | `edit` | `edit` | `edit` | `edit` |
| `Bash` | `bash` | `run_shell_command` | `bash` | `execute` | `bash` | `bash` |
| `Grep` | `grep` | `search_file_content` | `grep` | `search` | `grep` | `grep` |
| `Glob` | `glob` | `glob` | `glob` | `search` | `glob` | `glob` |
| `TodoWrite` | `todowrite` | `write_todos` | `todowrite` | `todo` | `todowrite` | `todowrite` |
| `AskUserQuestion` | `question` | `ask_user` | `question` | `ask_user` | `question` | `question` |
| `SlashCommand` | `skill` | N/A | `skill` | `skill` | `skill` | `skill` |
| `WebSearch` | `websearch` | `google_web_search` | `websearch` | `web` | `websearch` | `websearch` |
| `WebFetch` | `webfetch` | `web_fetch` | `webfetch` | `web` | `webfetch` | `webfetch` |
| `Task` | `task` | (auto) | (auto) | `agent` | `task` | `task` |


### MCP Tool Handling

| Provider | MCP Tool Format | Discovery |
|----------|----------------|-----------|
| Claude Code | `mcp__server__tool` | Listed in `allowed-tools` |
| OpenCode | `mcp__server__tool` | Listed in `tools` |
| Gemini CLI | (excluded) | Auto-discovered from `mcpServers` config |
| Codex | (excluded) | Auto-discovered from `mcpServers` config |
| Copilot | `mcp__context7__*` | Wildcard → `io.github.upstash/context7/*` |

## Path Transformation Rules

During installation, EZ Agents transforms path references to match each provider's config directory:

### Source Paths (in repository)
All source files use Claude Code paths as the canonical format:
- `~/.claude/` for global installs
- `$HOME/.claude/` for shell-script portability
- `./.claude/` for local installs

### Target Paths (after installation)

| Provider | Global Install | Local Install |
|----------|---------------|---------------|
| Claude Code | `~/.claude/` | `./.claude/` |
| OpenCode | `~/.config/opencode/` | `./.config/opencode/` |
| Gemini CLI | `~/.gemini/` | `./.gemini/` |
| Codex | `~/.codex/` | `./.codex/` |
| Copilot | `~/.copilot/` | `./.github/` |
| Qwen Code | `~/.qwen/` | `./.qwen/` |
| Kimi Code | `~/.kimi/` | `./.kimi/` |

### Special Cases

**Copilot Path Conversion (CONV-06)**:
- `~/.claude/` → `~/.copilot/`
- `$HOME/.claude/` → `$HOME/.copilot/`
- `./.claude/` → `./.github/` (Copilot uses `.github` for local config)

**OpenCode Path Conversion**:
- `~/.claude/` → `~/.config/opencode/`
- `$HOME/.claude/` → `$HOME/.config/opencode/`

**Codex Path Conversion**:
- `~/.claude/` → `~/.codex/`
- `$HOME/.claude/` → `$HOME/.codex/`

## Frontmatter Format Differences

### Claude Code (YAML)
```yaml
---
name: ez-example
description: Example command
allowed-tools:
  - Read
  - Write
  - Bash
color: blue
---
```

### OpenCode (YAML with tools object)
```yaml
---
description: Example command
tools:
  read: true
  write: true
  bash: true
color: "#0000FF"
---
```

### Gemini CLI (YAML with tools array)
```yaml
---
description: Example command
tools:
  - read_file
  - write_file
  - run_shell_command
---
```

### Codex (TOML)
```toml
description = "Example command"
prompt = """
Command body here
"""
```

### Copilot (YAML with tools array)
```yaml
---
name: ez-example
description: Example command
tools: ["read", "edit", "execute"]
color: "#0000FF"
---
```

## Environment Variable Support

Each provider supports different environment variables for custom config paths:

| Provider | Environment Variable | Default Path |
|----------|---------------------|--------------|
| Claude Code | `CLAUDE_CONFIG_DIR` | `~/.claude/` |
| OpenCode | `OPENCODE_CONFIG_DIR`, `OPENCODE_CONFIG` | `~/.config/opencode/` |
| Gemini CLI | `GEMINI_CONFIG_DIR` | `~/.gemini/` |
| Codex | `CODEX_HOME` | `~/.codex/` |
| Copilot | `COPILOT_CONFIG_DIR` | `~/.copilot/` |
| Qwen Code | `QWEN_CONFIG_DIR` | `~/.qwen/` |
| Kimi Code | `KIMI_CONFIG_DIR` | `~/.kimi/` |

The EZ Agents installer respects these environment variables and the `--config-dir` flag for custom installations.

## Attribution Handling

Each provider handles commit attribution differently:

| Provider | Setting | Default | EZ Agents Behavior |
|----------|---------|---------|-------------------|
| Claude Code | `attribution.commit` | Provider default | Respects user setting |
| OpenCode | `disable_ai_attribution` | `false` | Respects user setting |
| Gemini CLI | `attribution.commit` | Provider default | Respects user setting |
| Codex | N/A | N/A | No special handling |
| Copilot | N/A | N/A | No special handling |

When `attribution.commit` is set to empty string (`""`), EZ Agents removes `Co-Authored-By` lines from commits. When set to a custom value, it replaces the default attribution.

## Known Limitations

### Gemini CLI
- No `multiSelect` support for `AskUserQuestion` — uses sequential single-selects
- Template variable escaping: `${VAR}` patterns must be escaped to avoid Gemini's template validation
- No subscript HTML rendering — `<sub>` tags converted to italics

### Codex
- No inline `model` selection in `Task()` calls — uses per-role config
- `fork_context: false` by default — agents load their own context
- Result parsing requires structured markers (`CHECKPOINT`, `PLAN COMPLETE`, etc.)

### Copilot
- Tool names must match exactly — mapping table applied during installation
- Path conversion applies to ALL content (skills, agents, engine files)
- Local installs use `.github/` instead of `.copilot/`

## Best Practices

1. **Always use `/ez:` prefix in documentation** — the installer transforms to the correct format for each provider.

2. **Reference paths as `~/.claude/` in source files** — the installer transforms these automatically.

3. **Use PascalCase tool names in source files** — transformations apply lowercase/snake_case conversions as needed.

4. **Avoid provider-specific features in shared workflows** — stick to the common denominator of features available across all providers.

5. **Test on multiple providers** — what works on Claude Code may need adaptation for Gemini or Codex.

## Migration Notes

### From Legacy Command Format
- Command prefix standardized to `/ez:`
- NPM package changed from `ez-agents-cc` to `@howlil/ez-agents`
- Folder structure remains compatible (`ez-agents/` internal folder preserved)
- Update command: `/ez:update`

### From Other Forks
- Check tool name mappings — some forks use non-standard tool names
- Verify path transformations — custom forks may use different config directories
- Review MCP tool handling — auto-discovery vs explicit listing varies by fork
