# Skill System Reference

**Version:** 1.0.0  
**Last Updated:** 2026-03-29  
**Purpose:** Complete guide to EZ Agents skill system - activation, registry, and best practices

---

## Overview

The Skill System allows EZ Agents to load domain-specific knowledge, best practices, and validation rules for specific technologies, frameworks, or methodologies.

**What Skills Provide:**
- Technology-specific best practices
- Framework conventions and patterns
- Validation rules for code quality
- Anti-pattern detection
- Code generation templates

---

## Skill Registry

### Location

**Default Global Path:** `~/.skills/ez-agents/`  
**Override:** Set `EZ_AGENTS_SKILLS_PATH` environment variable

```bash
# Check current skills path
echo $EZ_AGENTS_SKILLS_PATH

# Set custom path
export EZ_AGENTS_SKILLS_PATH=/shared/team-skills
```

**Local Project Skills:** `.planning/skills/` (overrides global)

---

## Available Skills

### Core Skills

| Skill ID | Category | Version | Description |
|----------|----------|---------|-------------|
| `nextjs_app_router` | Stack | 1.0 | Next.js 14+ App Router best practices |
| `nextjs_pages_router` | Stack | 1.0 | Next.js Pages Router patterns |
| `react_hooks` | Framework | 2.1 | React Hooks patterns and anti-patterns |
| `typescript_strict` | Language | 1.5 | Strict TypeScript configuration |
| `tailwind_css` | Styling | 1.2 | Tailwind CSS utilities and conventions |
| `prisma_orm` | Database | 2.0 | Prisma ORM schema and query patterns |
| `jest_testing` | Testing | 1.3 | Jest testing patterns and mocks |
| `react_testing_library` | Testing | 2.1 | React Testing Library best practices |
| `node_api` | Backend | 1.4 | Node.js API design patterns |
| `express_middleware` | Backend | 1.1 | Express middleware patterns |
| `graphql_apollo` | API | 1.2 | Apollo GraphQL schema design |
| `postgres_optimization` | Database | 1.0 | PostgreSQL query optimization |
| `redis_caching` | Infrastructure | 1.1 | Redis caching strategies |
| `docker_containers` | DevOps | 1.3 | Docker best practices |
| `github_actions` | DevOps | 1.2 | GitHub Actions CI/CD patterns |
| `aws_lambda` | Cloud | 1.4 | AWS Lambda function design |
| `security_auth` | Security | 2.0 | Authentication and authorization patterns |
| `accessibility_wcag` | Quality | 1.5 | WCAG 2.1 AA compliance |
| `performance_web` | Quality | 1.3 | Web performance optimization |
| `clean_code` | Methodology | 1.0 | Clean Code principles |

---

## Skill Activation

### Activate a Skill

```bash
# Activate single skill
node ez-tools.cjs skill activate nextjs_app_router

# Activate multiple skills
node ez-tools.cjs skill activate react_hooks typescript_strict tailwind_css

# Activate with scope (global or local)
node ez-tools.cjs skill activate prisma_orm --scope=local
```

### Check Active Skills

```bash
# List active skills
node ez-tools.cjs skill list

# Check if specific skill is active
node ez-tools.cjs skill status nextjs_app_router
```

### Deactivate a Skill

```bash
# Deactivate single skill
node ez-tools.cjs skill deactivate nextjs_app_router

# Deactivate all skills
node ez-tools.cjs skill deactivate --all
```

---

## Skill Structure

Each skill is a YAML/Markdown file with the following structure:

```yaml
---
id: nextjs_app_router
name: Next.js App Router
category: Stack
version: 1.0.0
description: Best practices for Next.js 14+ App Router
dependencies:
  - react_hooks
  - typescript_strict
---

# Best Practices

## Server Components

- Use Server Components by default
- Colocate data fetching with components
- Use `async/await` in Server Components
- Stream slow components with `Suspense`

## Data Fetching

```typescript
// ✅ DO: Fetch directly in Server Component
async function Page() {
  const data = await db.query();
  return <Component data={data} />;
}

// ❌ DON'T: Use useEffect in Server Component
```

## Anti-Patterns

- `'use client'` at top of every file
- Fetching data in Client Components
- Not using Suspense boundaries
- Over-using `loading.tsx` for everything
```

---

## Skill Files

### Directory Structure

```
~/.skills/ez-agents/
├── core/
│   ├── nextjs_app_router.md
│   ├── react_hooks.md
│   └── typescript_strict.md
├── testing/
│   ├── jest_testing.md
│   └── react_testing_library.md
├── backend/
│   ├── node_api.md
│   └── express_middleware.md
├── devops/
│   ├── docker_containers.md
│   └── github_actions.md
└── quality/
    ├── accessibility_wcag.md
    └── performance_web.md
```

### Skill File Format

Skills use Markdown with YAML frontmatter:

```markdown
---
id: skill_id
name: Display Name
category: Category
version: X.Y.Z
description: What this skill provides
dependencies:
  - skill_id_1
  - skill_id_2
best_practices:
  - Practice 1
  - Practice 2
anti_patterns:
  - Anti-pattern 1
  - Anti-pattern 2
---

# Detailed Content

## Section 1

Content here...

## Code Examples

```typescript
// Example code
```
```

---

## Installing Skills

### Install from Registry

```bash
# Install official skill
node ez-tools.cjs skill install nextjs_app_router

# Install from URL
node ez-tools.cjs skill install https://github.com/user/ez-agents-skill-xyz.md

# Install from file
node ez-tools.cjs skill install ./my-custom-skill.md
```

### Create Custom Skill

1. Create skill file in `~/.skills/ez-agents/custom/`

```markdown
---
id: my_custom_skill
name: My Custom Skill
category: Custom
version: 1.0.0
description: Custom skill for my team's conventions
---

# My Team's Conventions

## Code Style

- Use 2 spaces for indentation
- Max line length: 100 characters
- Semicolons required

## Component Patterns

- Functional components only
- Named exports preferred
- Props interface required
```

2. Activate the skill

```bash
node ez-tools.cjs skill activate my_custom_skill
```

---

## Skill Validation Rules

Skills can define validation rules that are checked during execution:

```yaml
validation_rules:
  - id: no_console_log
    pattern: "console\\.log\\("
    severity: warning
    message: "Remove console.log before production"
    
  - id: require_typescript
    pattern: "\\.ts$"
    severity: error
    message: "TypeScript required for this project"
    
  - id: max_component_size
    pattern: ".tsx"
    max_lines: 300
    severity: warning
    message: "Component exceeds 300 lines, consider splitting"
```

---

## Skill Dependencies

Skills can depend on other skills. When activated, dependencies are automatically loaded:

```yaml
dependencies:
  - react_hooks
  - typescript_strict
```

**Dependency Resolution:**
1. Check if dependency is already active
2. If not, activate dependency first
3. Load skill after dependencies

**Circular Dependency Detection:**
- System detects and prevents circular dependencies
- Error message shows dependency chain

---

## Skill Categories

### Stack Skills

Technology stack-specific knowledge:
- `nextjs_app_router`
- `nextjs_pages_router`
- `node_api`
- `express_middleware`

### Framework Skills

Framework patterns and conventions:
- `react_hooks`
- `typescript_strict`
- `tailwind_css`
- `prisma_orm`

### Testing Skills

Testing methodologies and tools:
- `jest_testing`
- `react_testing_library`
- `cypress_e2e`
- `playwright_testing`

### DevOps Skills

Infrastructure and deployment:
- `docker_containers`
- `github_actions`
- `aws_lambda`
- `kubernetes_basics`

### Quality Skills

Code quality and compliance:
- `accessibility_wcag`
- `performance_web`
- `security_auth`
- `clean_code`

---

## Using Skills in Workflows

Skills are automatically applied when agents execute tasks:

```markdown
<!-- In workflow file -->
<execution_context>
@~/.qwen/ez-agents/skills/nextjs_app_router.md
@~/.qwen/ez-agents/skills/react_hooks.md
</execution_context>

<process>
Agents will apply skill knowledge when:
1. Generating code
2. Reviewing code
3. Suggesting improvements
4. Detecting anti-patterns
</process>
```

---

## Skill Versioning

Skills use semantic versioning:

```yaml
version: 1.2.3
# Major.Minor.Patch
# 1.0.0 - Initial release
# 1.1.0 - New features (backward compatible)
# 2.0.0 - Breaking changes
```

**Version Compatibility:**

```yaml
# Require minimum version
requires_version:
  react_hooks: ">=2.0.0"
  typescript_strict: "^1.5.0"
```

---

## Troubleshooting

### Skill Not Found

```bash
# Error: Skill "xyz" not found

# Solution: Check available skills
node ez-tools.cjs skill list

# Install missing skill
node ez-tools.cjs skill install xyz
```

### Dependency Conflict

```bash
# Error: Circular dependency detected

# Solution: Check skill dependencies
cat ~/.skills/ez-agents/xyz.md | grep -A 5 "dependencies:"
```

### Skill Not Applied

```bash
# Check if skill is active
node ez-tools.cjs skill status xyz

# Reactivate skill
node ez-tools.cjs skill deactivate xyz
node ez-tools.cjs skill activate xyz
```

---

## Best Practices

### ✅ Do

- Activate only relevant skills for current project
- Keep skills updated to latest version
- Create custom skills for team conventions
- Review skill best practices before starting work

### ❌ Don't

- Activate too many skills (causes context bloat)
- Ignore skill anti-pattern warnings
- Use conflicting skills together
- Forget to deactivate skills after project

---

## API Reference

### CLI Commands

```bash
# Skill management
node ez-tools.cjs skill activate <skill-id>
node ez-tools.cjs skill deactivate <skill-id>
node ez-tools.cjs skill list
node ez-tools.cjs skill status <skill-id>
node ez-tools.cjs skill install <url-or-path>
node ez-tools.cjs skill uninstall <skill-id>

# Skill info
node ez-tools.cjs skill info <skill-id>
node ez-tools.cjs skill validate <skill-id>
```

### Programmatic API

```typescript
import { SkillRegistry } from './skill/skill-registry.js';

const registry = new SkillRegistry();
await registry.load();

// Activate skill
await registry.activate('nextjs_app_router');

// Get skill info
const skill = registry.get('nextjs_app_router');

// Check if active
const isActive = registry.isActive('nextjs_app_router');

// Get all active skills
const active = registry.getActive();
```

---

## Contributing Skills

### Submit to Registry

1. Create skill file following standard format
2. Test skill with sample project
3. Submit PR to EZ Agents skill registry
4. Include examples and test cases

### Skill Review Checklist

- [ ] Clear description
- [ ] Best practices documented
- [ ] Anti-patterns identified
- [ ] Code examples provided
- [ ] Validation rules defined (if applicable)
- [ ] Dependencies listed
- [ ] Version specified

---

## See Also

- [[environment-variables.md]](./environment-variables.md) — `EZ_AGENTS_SKILLS_PATH` configuration
- [[planning-config.md]](./planning-config.md) — Project configuration
- [[agent-output-format.md]](../templates/agent-output-format.md) — How skills affect agent output

---

**Maintained by:** EZ Agents Core Team  
**Feedback:** Open an issue on GitHub  
**Skill Registry:** https://github.com/ez-agents/skills
