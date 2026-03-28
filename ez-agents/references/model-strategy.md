# Model Strategy Guide

**Version:** 1.0.0  
**Last Updated:** 2026-03-29  
**Purpose:** Complete guide to model selection, profiles, and optimization

---

## Executive Summary

Model profiles balance quality vs. token spend by controlling which Claude model each agent uses.

**Quick Recommendations:**

| Scenario | Profile | Rationale |
|----------|---------|-----------|
| Critical architecture | `quality` | Opus for all decision-making |
| Normal development | `balanced` | Smart allocation, best value |
| High-volume work | `budget` | Cost-optimized, Haiku for simple tasks |
| Quota constrained | `budget` | Minimize Opus usage |

---

## Model Profiles

### Profile Matrix

| Agent | `quality` | `balanced` | `budget` |
|-------|-----------|------------|----------|
| ez-planner | opus | opus | sonnet |
| ez-roadmapper | opus | sonnet | sonnet |
| ez-executor | opus | sonnet | sonnet |
| ez-phase-researcher | opus | sonnet | haiku |
| ez-project-researcher | opus | sonnet | haiku |
| ez-debugger | opus | sonnet | sonnet |
| ez-codebase-mapper | sonnet | haiku | haiku |
| ez-verifier | sonnet | sonnet | haiku |
| ez-plan-checker | sonnet | sonnet | haiku |
| ez-ui-auditor | sonnet | sonnet | haiku |

### Profile Characteristics

#### Quality Profile

**Characteristics:**
- Maximum reasoning power
- Opus for all decision-making agents
- Sonnet for read-only verification
- Best for: Critical architecture, complex systems, quota available

**Token Impact:** ~2-3x balanced profile

**When to Use:**
- Greenfield architecture design
- Complex distributed systems
- High-stakes production work
- When you have generous Claude quota

---

#### Balanced Profile (Default)

**Characteristics:**
- Smart allocation
- Opus only for planning (architecture decisions)
- Sonnet for execution and research
- Sonnet for verification (reasoning, not just pattern matching)
- Best for: Normal development, best quality/cost ratio

**Token Impact:** Baseline (1x)

**When to Use:**
- Daily development work
- Feature implementation
- Standard refactoring
- Most production scenarios

---

#### Budget Profile

**Characteristics:**
- Minimal Opus usage
- Sonnet for anything that writes code
- Haiku for research and verification
- Best for: Cost optimization, high-volume work

**Token Impact:** ~0.5x balanced profile

**When to Use:**
- Conserving quota
- High-volume repetitive work
- Less critical phases
- Prototyping/exploration

---

## Design Rationale

### Why Opus for ez-planner?

**Reasoning:** Planning involves architecture decisions, goal decomposition, and task design. This is where model quality has the highest impact on downstream work.

**Impact:** A well-planned phase prevents costly rework and technical debt.

---

### Why Opus for ez-debugger?

**Reasoning:** Debugging requires deep reasoning about complex issues, root cause analysis, and scientific hypothesis testing. Opus excels at connecting disparate clues.

**Impact:** Faster diagnosis, fewer false leads, correct fixes.

---

### Why Sonnet for ez-executor?

**Reasoning:** Executors follow explicit PLAN.md instructions. The plan already contains the reasoning; execution is implementation following specifications.

**Impact:** Sonnet handles implementation well when given clear instructions.

---

### Why Sonnet for ez-roadmapper?

**Reasoning:** Roadmapping balances strategic thinking with structured output. Sonnet handles requirement decomposition and prioritization well.

**Impact:** Good strategic decisions without Opus cost.

---

### Why Sonnet (not Haiku) for Verifiers?

**Reasoning:** Verification requires goal-backward reasoning — checking if code *delivers* what the phase promised, not just pattern matching. Haiku may miss subtle gaps.

**Impact:** Catches issues that pattern-matching would miss.

---

### Why Haiku for ez-codebase-mapper?

**Reasoning:** Read-only exploration and pattern extraction. No reasoning required, just structured output from file contents.

**Impact:** Fast, cheap codebase analysis.

---

### Why Haiku for Researchers?

**Reasoning:** Research involves gathering information from documented sources (Context7, official docs). This is retrieval and synthesis, not deep reasoning.

**Impact:** Efficient information gathering.

---

## Resolution Logic

### Resolution Order

```
1. Read .planning/config.json
2. Check model_overrides for agent-specific override
3. If no override, look up agent in profile table
4. Pass model parameter to Task call
```

### Implementation

```typescript
// bin/lib/core.ts
function resolveModel(cwd: string, agentType: string): string {
  const config = loadConfig(cwd);
  
  // 1. Check per-agent override
  const override = config.model_overrides?.[agentType];
  if (override) {
    return override === 'opus' ? 'inherit' : override;
  }
  
  // 2. Fall back to profile lookup
  const profile = config.model_profile || 'balanced';
  const agentModels = MODEL_PROFILES[agentType];
  const resolved = agentModels[profile] || agentModels['balanced'] || 'sonnet';
  
  // 3. Opus resolves to 'inherit' for version compatibility
  return resolved === 'opus' ? 'inherit' : resolved;
}
```

---

## Per-Agent Overrides

Override specific agents without changing the entire profile.

### Configuration

```json
{
  "model_profile": "balanced",
  "model_overrides": {
    "ez-executor": "opus",
    "ez-planner": "haiku"
  }
}
```

### Use Cases

**Override executor to Opus:**
- Critical implementation phase
- Complex algorithm work
- Performance-sensitive code

**Override planner to Haiku:**
- Simple, routine phases
- Following well-established patterns
- Cost-constrained scenarios

**Override verifier to Sonnet:**
- Security-critical verification
- Complex integration validation
- When catching edge cases matters

---

## The `inherit` Convention

### Why Not Pass `"opus"` Directly?

Claude Code's `"opus"` alias maps to a specific model version (e.g., `claude-3-opus-20240229`). Organizations may:

- Block older opus versions
- Allow only newer versions (e.g., `claude-3-5-sonnet-20241022`)
- Have custom model policies

### The `inherit` Solution

EZ Agents returns `"inherit"` for opus-tier agents. This causes the agent to use whatever opus version the parent session has configured.

**Benefits:**
- Avoids version conflicts
- Respects organization policies
- No silent fallbacks to Sonnet
- User controls model version

---

## Switching Profiles

### Runtime Command

```bash
/ez:settings
# Select model profile from menu
```

### Per-Project Default

Edit `.planning/config.json`:

```json
{
  "model_profile": "quality"
}
```

### Environment Variable

```bash
export EZ_AGENTS_MODEL_PROFILE=balanced
```

### Profile Command

```bash
node ez-tools.cjs config set model_profile quality
```

---

## Token Cost Optimization

### Cost by Profile (Relative)

| Profile | Relative Cost | Best For |
|---------|---------------|----------|
| quality | 2.5x | Critical work |
| balanced | 1.0x | Default |
| budget | 0.4x | High-volume |

### Optimization Strategies

#### 1. Profile per Phase Type

```
Architecture phases → quality
Feature implementation → balanced
Bug fixes → budget
Research phases → budget
```

#### 2. Override Critical Agents

```json
{
  "model_profile": "budget",
  "model_overrides": {
    "ez-planner": "sonnet",
    "ez-debugger": "sonnet"
  }
}
```

#### 3. Use Quick Mode for Simple Tasks

```bash
/ez:quick "Add logging to this function"
# Uses budget profile automatically
```

---

## Model Selection Flowchart

```
                    ┌─────────────────┐
                    │  Start Phase    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Critical work? │
                    └────────┬────────┘
                       Yes   │   No
                    ┌────────┴────────┐
                    │                 │
              ┌─────▼─────┐     ┌─────▼─────┐
              │  quality  │     │ Budget ok?│
              │  profile  │     └─────┬─────┘
              └───────────┘        Yes │   No
                                      │  ┌──▼──────┐
                              ┌───────▼─────┤balanced│
                              │  budget     │profile│
                              │  profile    └───────┘
                              └───────────────┘
```

---

## Monitoring & Analytics

### Check Current Profile

```bash
node ez-tools.cjs config get model_profile
```

### View Token Usage

```bash
node ez-tools.cjs cost-report
```

### Agent-Specific Usage

```bash
node ez-tools.cjs stats --agent ez-executor
# Shows token consumption by model tier
```

---

## Troubleshooting

### Issue: Unexpected Model Usage

**Symptoms:** Higher token consumption than expected

**Diagnosis:**
```bash
# Check current profile
node ez-tools.cjs config get model_profile

# Check for overrides
cat .planning/config.json | jq .model_overrides

# Review recent agent usage
node ez-tools.cjs cost-report --last 10
```

**Fix:**
```bash
# Switch to budget profile
node ez-tools.cjs config set model_profile budget

# Or override specific agents
# Edit .planning/config.json
```

---

### Issue: Model Version Conflicts

**Symptoms:** "Model not available" errors

**Cause:** Organization policy blocking specific model versions

**Fix:** Use `inherit` for opus-tier agents (default behavior)

```json
{
  "model_overrides": {
    "ez-planner": "inherit"
  }
}
```

---

## Best Practices

### ✅ Do

- Use `balanced` as default for most projects
- Override to `quality` for critical architecture phases
- Use `budget` for high-volume, low-risk work
- Override specific agents rather than changing entire profile
- Monitor token usage with `cost-report`

### ❌ Don't

- Use `quality` for routine work (wasteful)
- Use `budget` for critical production code (false economy)
- Forget to reset profile after critical phases
- Ignore token usage alerts
- Override verifiers to Haiku (misses subtle issues)

---

## Model Profiles by Workflow

### Initialization Workflows

| Workflow | Recommended Profile | Rationale |
|----------|---------------------|-----------|
| new-project | balanced | Good foundation without overspend |
| product-discovery | balanced | Strategic thinking, cost-effective |
| map-codebase | budget | Pattern extraction, Haiku sufficient |

---

### Phase Lifecycle

| Workflow | Recommended Profile | Rationale |
|----------|---------------------|-----------|
| discuss-phase | balanced | Decision capture, Sonnet adequate |
| plan-phase | quality | Architecture decisions matter |
| execute-phase | balanced | Implementation follows plan |
| verify-work | balanced | Verification needs reasoning |

---

### Milestone Management

| Workflow | Recommended Profile | Rationale |
|----------|---------------------|-----------|
| audit-milestone | balanced | Quality assessment |
| complete-milestone | budget | Administrative work |
| cleanup | budget | Simple file operations |

---

## Advanced Configuration

### Dynamic Profile Switching

```bash
# In workflow scripts
PROFILE=$(node ez-tools.cjs config get model_profile)

if [ "$PHASE_CRITICAL" = "true" ]; then
  node ez-tools.cjs config set model_profile quality
fi

# Execute workflow...

# Restore original profile
node ez-tools.cjs config set model_profile $PROFILE
```

### Profile by Time of Day

```bash
# Morning (fresh quota): quality
# Afternoon: balanced
# Evening (quota low): budget
```

### Profile by Phase Complexity

```json
{
  "phase_profiles": {
    "01": "quality",
    "02": "balanced",
    "03": "balanced",
    "04": "budget"
  }
}
```

---

## See Also

- [[model-profiles.md]](./model-profiles.md) — Profile definitions
- [[model-profile-resolution.md]](./model-profile-resolution.md) — Resolution logic
- [[planning-config.md]](./planning-config.md) — Configuration options
- [[environment-variables.md]](./environment-variables.md) — Environment variable reference
- [[metrics-schema.md]](./metrics-schema.md) — Success metrics

---

**Maintained by:** EZ Agents Core Team  
**Feedback:** Open an issue on GitHub
