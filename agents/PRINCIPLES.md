# Core Philosophy for All EZ Agents

## Solo Developer + Claude Workflow

Planning for ONE person (the user) and ONE implementer (Claude).
- No teams, stakeholders, ceremonies, coordination overhead
- User = visionary/product owner, Claude = builder
- Estimate effort in Claude execution time, not human dev time
- No RACI matrices, stakeholder management, sprint ceremonies

---

## Plans Are Prompts

PLAN.md IS the prompt (not a document that becomes one). Contains:
- Objective (what and why)
- Context (@file references)
- Tasks (with verification criteria)
- Success criteria (measurable)

**Not:**
- A document that gets reviewed, approved, then converted to a prompt
- A specification with appendices and version history
- A coordination artifact for team alignment

---

## Quality Degradation Curve

| Context Usage | Quality | Claude's State |
|---------------|---------|----------------|
| 0-30% | PEAK | Thorough, comprehensive |
| 30-50% | GOOD | Balanced, efficient |
| 50-70% | DECLINING | Repetitive, unfocused |
| 70%+ | POOR | Confused, contradictory |

**Rule:** Keep prompts under 50% context window for peak quality.

---

## Anti-Enterprise Patterns (Delete If Seen)

**Team structures:**
- RACI matrices, stakeholder maps, coordination overhead
- Sprint planning, standups, retrospectives
- Change management processes

**Documentation bloat:**
- Version history tables
- Approval workflows
- Meeting notes integration

**Coordination artifacts:**
- Communication plans
- Risk registers (beyond simple technical risks)
- Dependency tracking across teams

---

## Execution Principles

**Atomic commits:**
- One commit per phase
- Clear, descriptive messages
- Easy to revert if needed

**Checkpoint protocol:**
- Pause at defined checkpoints
- User reviews before continuing
- No surprise changes after checkpoint

**Deviation handling:**
- Minor deviations: proceed, document in summary
- Major deviations: pause, ask user
- Blocked tasks: attempt recovery, escalate if fails

---

## Tool Usage

**Allowed tools:**
- Read, Write, Edit (file operations)
- Bash (command execution)
- Grep, Glob (search)
- WebFetch (research)
- mcp__context7__* (context retrieval)

**Tool constraints:**
- No destructive operations without confirmation
- No external API calls without user approval
- No long-running processes without checkpoint

---

## Output Standards

**SUMMARY.md files:**
- One-liner objective
- Completed tasks list
- Key files modified
- Decisions made
- Next steps

**Commit messages:**
- Conventional commits format
- References to phase/plan
- Clear scope description

---

## Error Handling

**Authentication errors:**
- Pause and request credentials
- Document in summary
- Resume after auth provided

**Technical failures:**
- Attempt recovery (retry, alternative approach)
- If recovery fails, escalate to user
- Document in summary

**Scope creep:**
- Recognize when task expands beyond original intent
- Pause and ask user if expansion is intended
- Document deferred ideas

---

## Deferred Ideas Protocol

**When user defers an idea:**
1. Capture in SUMMARY.md under "Deferred Ideas"
2. Do NOT implement in current phase
3. May be referenced in future phases

**Example:**
```markdown
## Deferred Ideas
- Search functionality (deferred to Phase X)
- Dark mode (deferred to Phase X)
```

---

## Context Management

**Context optimization:**
- Use @file references for large files
- Extract only relevant sections
- Keep prompts under 50% context window

**Token efficiency:**
- Bullet points over paragraphs
- Structured format (YAML frontmatter + xml)
- External examples (reference, don't include)

---

*This file is referenced by all 21 EZ Agents. Updates apply to all agents automatically.*
