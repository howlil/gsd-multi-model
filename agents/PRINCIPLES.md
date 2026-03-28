---
name: PRINCIPLES
description: Core philosophy shared by all 21 EZ Agents
type: shared-philosophy
version: 1.0.0
---

<philosophy>

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

## Clean Code Principles

### YAGNI — You Ain't Gonna Need It

**Don't add functionality until it's necessary.**

- No speculative features "just in case"
- No unused parameters "for future use"
- No over-engineering for hypothetical requirements
- Current requirements drive design, not future possibilities

**Questions to ask:**
- "Is this feature needed NOW?"
- "What's the simplest thing that could possibly work?"
- "Am I building this because requirements say so, or because I think we might need it?"

**When in doubt:** Leave it out. You can always add it later when requirements actually demand it.

---

### KISS — Keep It Simple, Stupid

**Simplicity should be a key goal.**

- Simplest solution that works
- No unnecessary complexity
- Clear, readable code over clever code
- Obvious > Magic

**Signs of over-engineering:**
- More than 3 levels of abstraction
- Factory patterns for single-use cases
- Generic solutions for one-off problems
- "Future-proofing" that nobody asked for

---

### Boy Scout Rule

**Leave the code cleaner than you found it.**

- Small improvements made during every change
- Tech debt addressed incrementally
- Don't walk past broken windows
- Continuous improvement culture

**How to apply:**
1. Fix one naming issue while touching a file
2. Extract one function that was too long
3. Add one missing test
4. Update one outdated comment

**Remember:** You don't have to fix everything at once. Small, consistent improvements compound over time.

---

### SOLID Principles

**S — Single Responsibility:**
- Each function does ONE thing
- Each class has ONE reason to change
- No "god classes" or "god functions"

**O — Open/Closed:**
- Open for extension, closed for modification

**L — Liskov Substitution:**
- Subtypes substitutable for base types

**I — Interface Segregation:**
- Many small interfaces > one large interface

**D — Dependency Inversion:**
- Depend on abstractions, not concretions

---

### DRY — Don't Repeat Yourself

**Every piece of knowledge must have a single, unambiguous representation.**

- No duplicate code blocks
- No duplicate logic
- No duplicate configuration
- Extract common patterns

**When to apply:**
- Copy-paste detected (3+ times)
- Same algorithm in multiple places
- Configuration duplicated across files

**Exception:** Tests can have some duplication for clarity (DAMP > DRY in tests)

**Questions to ask:**
- "Have I written this before?"
- "Will I write this again?"
- "Is this knowledge represented in one place?"

---

### Fail Fast

**Detect and report errors as early as possible.**

- Validate inputs at function entry
- Return errors immediately, don't continue
- Use assertions for invariants
- Crash loudly instead of failing silently

**Why:** Early failures are easier to debug than cascading failures.

**Example:**
```typescript
// ❌ BAD: Continue on error
function processUser(data) {
  if (data.email) {
    // ... process
  }
  // Continues even if email missing
}

// ✅ GOOD: Fail fast
function processUser(data) {
  if (!data.email) {
    throw new Error('Email is required');
  }
  // ... process
}
```

---

### Chesterton's Fence

**Don't remove code until you understand why it exists.**

Before removing "dead" code:
1. Understand what it does
2. Understand why it was added
3. Verify it's truly unnecessary
4. Document why you removed it

**Why:** Code that looks useless often has a reason (edge case, bug fix, workaround).

**When you find weird code:**
- Ask: "What problem does this solve?"
- Check git blame for context
- Check related issues/PRs
- Only remove after understanding

---

### Rule of Three

**Refactor when you do something three times.**

1. **First time:** Just do it
2. **Second time:** Notice the duplication (but don't refactor yet)
3. **Third time:** Refactor into reusable abstraction

**Why:** Premature abstraction is worse than duplication.

**Signs it's time to refactor:**
- Same code 3+ times
- Copy-paste with minor modifications
- "This looks familiar..."

**Signs it's too early:**
- Only seen twice
- Might be coincidence
- Not sure if pattern will continue

---

### Tell, Don't Ask

**Tell objects what to do, don't query their state.**

```typescript
// ❌ BAD: Asking (violates encapsulation)
const balance = account.getBalance();
if (balance >= amount) {
  account.setBalance(balance - amount);
}

// ✅ GOOD: Telling (respects encapsulation)
account.withdraw(amount);
```

**Why:**
- Encapsulates logic inside the object
- Maintains invariants automatically
- Reduces coupling between objects
- Easier to change implementation

**Questions to ask:**
- "Am I querying state to make decisions?"
- "Should this logic be inside the object?"
- "Who should be responsible for this?"

---

## Testing Principles

### FIRST

**Good tests are:**

- **Fast** — Run quickly (<100ms per test)
- **Independent** — No test depends on another
- **Repeatable** — Same result every time
- **Self-validating** — Pass/fail is clear (no manual checking)
- **Timely** — Written before/during coding (TDD)

**Why FIRST matters:** Tests that violate FIRST get deleted or ignored.

---

### Test Pyramid

**Distribution of tests:**

```
        /\
       /  \
      / E2E \      ← Fewest (slow, brittle, high confidence)
     /--------\
    /Integration\   ← Some (medium speed, medium confidence)
   /--------------\
  /     Unit       \  ← Most (fast, reliable, low confidence)
 /------------------\
```

**Unit Tests (70%):**
- Test individual functions/classes
- Fast (<10ms)
- Isolated (mocks/stubs)
- Many tests possible

**Integration Tests (20%):**
- Test component interactions
- Medium speed (<100ms)
- Some mocking
- Verify contracts

**E2E Tests (10%):**
- Test full user flows
- Slow (>1s)
- No mocking
- High confidence

**Why:** Unit tests are fast and isolate failures. E2E tests are slow but verify integration.

---

### Arrange-Act-Assert (AAA)

**Test structure pattern:**

```typescript
test('withdraw reduces balance', () => {
  // Arrange — Set up test data
  const account = new Account(100);
  
  // Act — Perform action
  account.withdraw(50);
  
  // Assert — Verify outcome
  expect(account.balance).toBe(50);
});
```

**Why AAA:**
- Consistent structure makes tests readable
- Clear separation of concerns
- Easy to understand what's being tested

**Anti-patterns:**
- Multiple Act sections (testing multiple things)
- Assert before Act (wrong order)
- Arrange mixed with Act (unclear setup)

---

## Process Principles

### Make It Work, Make It Right, Make It Fast

**Three stages of development:**

```
1. Make It Work
   ↓
   Get it working
   Tests pass
   Feature complete
   
2. Make It Right
   ↓
   Refactor
   Clean code
   DRY, SOLID
   Remove duplication
   
3. Make It Fast
   ↓
   Optimize (only if needed)
   Profile first
   Measure improvement
```

**Never skip stages:**
- Don't optimize before it works (wasted effort)
- Don't refactor before it works (moving target)
- Don't skip refactoring (tech debt accumulates)

**When to move to next stage:**
- Work → Right: All tests pass
- Right → Fast: Performance matters (measured, not guessed)

---

### Premature Optimization is the Root of All Evil

**Donald Knuth's famous quote.**

**Rules:**
1. Don't optimize until you have measurements
2. Profile before optimizing
3. 90% of execution time is in 10% of code
4. Simple code is faster than clever code

**Signs of premature optimization:**
- Adding caching "just in case"
- Using complex algorithms for small data
- Micro-optimizing before profiling
- Sacrificing readability for speed

**When optimization IS appropriate:**
- Performance requirement defined
- Profiling shows bottleneck
- Simple optimization available
- Measurable improvement expected

---

### Measure, Don't Guess

**Performance engineering principle.**

**Before optimizing:**
1. Profile to find bottlenecks
2. Measure baseline performance
3. Identify the 10% causing 90% of issues
4. Set improvement target

**After optimizing:**
1. Measure again
2. Verify improvement
3. Check no regression
4. Document what worked

**Tools to use:**
- Profiler (Chrome DevTools, node --inspect)
- Lighthouse (performance score)
- Bundle analyzer (webpack-bundle-analyzer)
- Custom timing (console.time)

**Questions to ask:**
- "What does the profiler say?"
- "Where is the bottleneck?"
- "Is this worth optimizing?"
- "How will I measure improvement?"

---

## Security Principles

### Principle of Least Privilege

**Give minimum access necessary.**

- **Users:** Minimum permissions to do their job
- **Code:** Minimum capabilities to function
- **Services:** Minimum network access
- **Data:** Minimum exposure (need-to-know basis)

**Why:** Limits blast radius of breaches. Compromised component can do less damage.

**Examples:**
```typescript
// ❌ BAD: Admin access for simple task
const db = connect({ user: 'admin', password: '...' });

// ✅ GOOD: Read-only for reading data
const db = connect({ user: 'reader', password: '...' });
```

---

### Defense in Depth

**Multiple layers of security.**

```
Layer 1: Input Validation
   ↓
Layer 2: Authentication
   ↓
Layer 3: Authorization
   ↓
Layer 4: Encryption
   ↓
Layer 5: Logging/Monitoring
```

**Why:** Single layer can fail; multiple layers provide redundancy.

**Examples:**
- Input validation + parameterized queries (SQL injection prevention)
- Auth + authorization (can't access others' data)
- HTTPS + encryption at rest (data protected in transit and storage)

---

## Product Thinking Principles

### Outcome Over Output

**Ship value, not features.**

- Measure outcomes (user behavior change), not outputs (features shipped)
- Ask "What problem does this solve?" before "How do we build this?"
- Define success metrics BEFORE building

**Questions to ask:**
- "What user behavior will change after this?"
- "How will we measure success?"
- "What's the minimum we can build to test this?"

**Engineering metrics track OUTPUT:**
- Velocity (tasks/phase)
- Defect density (bugs/KLOC)
- Code coverage (%)

**Product metrics track OUTCOME:**
- User adoption (% who use feature)
- Retention (D1/D7/D30)
- Task success rate (%)
- User satisfaction (NPS, CSAT)

---

### Problem-First, Not Solution-First

**Understand the problem deeply before designing solutions.**

- Spend 80% time understanding problem, 20% on solution
- Ask "5 Whys" to get to root cause
- Validate problem exists before building solution

**5 Whys Example:**
```
Problem: Users aren't signing up
1. Why? → Signup form is too long
2. Why? → We ask for too much information
3. Why? → We think we need it for personalization
4. Why? → We assume users want personalization
5. Why? → We haven't validated this assumption

Root Cause: Building features without validating assumptions
```

**Red flags (solution-first thinking):**
- "We need to add [feature]"
- "Competitor X has this, we should too"
- "Let's build [technology] and see what happens"

**Green flags (problem-first thinking):**
- "Users are struggling with [problem]"
- "We observed [behavior] that indicates [problem]"
- "If we solve [problem], [metric] will improve"

---

### Build-Measure-Learn Loop

**Validate assumptions quickly with MVPs.**

```
1. BUILD → Create MVP with minimum features to test hypothesis
   ↓
2. MEASURE → Track metrics, gather user feedback
   ↓
3. LEARN → Validate or invalidate hypothesis
   ↓
4. PIVOT or PERSEVERE → Decide based on learning
```

**MVP Types:**

| Type | When to Use | Example |
|------|-------------|---------|
| **Landing Page MVP** | Test demand before building | Sign-up page for feature that doesn't exist |
| **Concierge MVP** | Manual service pretending to be automated | Human does what software will do |
| **Wizard of Oz MVP** | Looks automated, actually manual | Fake backend, real frontend |
| **Piecemeal MVP** | Glue existing tools together | Zapier + Google Sheets + Typeform |

**When to Pivot:**
- Hypothesis invalidated (metrics don't improve)
- User feedback consistently negative
- Better opportunity discovered

**When to Persevere:**
- Hypothesis validated (metrics improve)
- User engagement increasing
- Clear path to product-market fit

---

### Jobs-To-Be-Done (JTBD)

**Users "hire" your product to do a "job".**

**JTBD Framework:**
```
When [situation/context]
I want to [motivation/drive]
So I can [expected outcome/benefit]
```

**Example:**
```
When I'm managing a team of 10+ people
I want to track task completion automatically
So I can focus on strategic work instead of micromanaging
```

**Why JTBD matters:**
- Focuses on user needs, not features
- Reveals true competition (alternative ways to do the job)
- Guides feature prioritization

**JTBD in practice:**
```
Feature: Task management dashboard

JTBD 1:
When I start my workday
I want to see what's most important
So I can prioritize effectively

JTBD 2:
When a team member asks for status
I want to quickly see progress
So I can give accurate updates

JTBD 3:
When a deadline approaches
I want to identify at-risk tasks
So I can intervene early
```

---

### Feature Prioritization (RICE Score)

**Prioritize features objectively.**

**RICE Formula:**
```
RICE Score = (Reach × Impact × Confidence) / Effort

Reach: How many users affected? (1-1000)
Impact: How much does it help? (0.25-3)
  0.25 = Minimal impact
  0.5 = Low impact
  1 = Medium impact
  2 = High impact
  3 = Massive impact
Confidence: How sure are we? (0-100%)
  100% = Strong data
  80% = Some data
  50% = Low confidence
  <50% = Guess
Effort: How much work? (person-weeks or story points)
```

**Example:**
| Feature | Reach | Impact | Confidence | Effort | RICE Score |
|---------|-------|--------|------------|--------|------------|
| Social Login | 500 | 2 | 90% | 3 | 300 |
| Dark Mode | 200 | 0.5 | 80% | 5 | 16 |
| Export to CSV | 100 | 1.5 | 95% | 2 | 71 |
| Performance Fix | 800 | 3 | 100% | 8 | 300 |

**Prioritize by RICE Score (highest first).**

**Value vs Effort Matrix:**
```
High Value │ Quick Wins      │ Major Projects
           │ (do first)      │ (plan carefully)
           │                 │
───────────┼─────────────────┼─────────────────
           │                 │
Low Value  │ Fill-Ins        │ Time Wasters
           │ (do if time)    │ (avoid)
           │                 │
           └─────────────────┴─────────────────
             Low Effort    High Effort
```

---

### Success Metrics (HEART Framework)

**Measure user experience quality.**

| Metric | What It Measures | Example |
|--------|-----------------|---------|
| **Happiness** | User satisfaction | NPS, CSAT, app store ratings |
| **Engagement** | Usage frequency | DAU/MAU, session length, actions/session |
| **Adoption** | New users | Signups, activations, first key action |
| **Retention** | Returning users | D1/D7/D30 retention, churn rate |
| **Task Success** | Completion rate | Task completion %, error rate, time to complete |

**Define 1-2 key metrics per category.**

**Example for Task Management App:**
```
Happiness: NPS > 50
Engagement: DAU/MAU > 40%
Adoption: 100 signups/week
Retention: D7 retention > 60%
Task Success: 95% task completion rate
```

**North Star Metric:**
Pick ONE metric that matters most.

Example: "Weekly Active Teams" (teams with 3+ members who complete 5+ tasks/week)

---

### Product-Market Fit (PMF)

**Build something users want.**

**PMF Indicators:**
- 40%+ users say they'd be "very disappointed" without product
- Organic growth (word of mouth)
- High retention (>80% D30)
- Users find workarounds when feature is missing

**Before PMF:**
- Focus on learning, not scaling
- Talk to users weekly
- Pivot quickly based on feedback
- Keep team small, move fast
- **Tech debt is OK** if it speeds learning

**After PMF:**
- Focus on scaling
- Invest in infrastructure
- Hire aggressively
- Optimize for growth
- **Pay down tech debt** to enable scaling

**The PMF Pivot:**
```
Before PMF: "What should we build?"
After PMF: "How do we reach more users?"

Before PMF: Feature exploration
After PMF: Feature optimization

Before PMF: Qualitative feedback (interviews)
After PMF: Quantitative feedback (metrics)
```

---

### Lean UX

**Design for learning, not perfection.**

**Lean UX Principles:**
- **Problem-First:** Define problem before solution
- **Hypothesis-Driven:** "We believe [X] will result in [Y]"
- **Rapid Prototyping:** Low-fidelity → High-fidelity
- **User Testing:** Test early, test often
- **Iterate:** Design → Test → Learn → Iterate

**Hypothesis Template:**
```
We believe [doing X]
For [user persona]
Will result in [outcome Y]
We'll know we're right when [metric Z improves]
```

**Example:**
```
We believe adding social login
For new visitors
Will result in higher signup completion
We'll know we're right when signup rate increases from 20% to 35%
```

**Lean UX Cycle:**
```
1. Ideate (hypothesis)
   ↓
2. Prototype (low-fi → hi-fi)
   ↓
3. Test (with real users)
   ↓
4. Learn (validate/invalidate)
   ↓
5. Iterate (pivot or persevere)
```

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
- Structured format (YAML frontmatter + XML)
- External examples (reference, don't include)

</philosophy>

---

*This file is referenced by all 21 EZ Agents. Updates apply to all agents automatically.*
