# EZ Agents - CLI UX Improvements

> **Goal:** User experience yang bagus — user ga bingung, command terorganisir, workflow jelas.

---

## 🎯 PROBLEM STATEMENT

### Current State (Masalah)

```
❌ 48 workflows di folder — user scroll panjang
❌ Semua command flat — ga ada kategori
❌ User baru: "Pakai yang mana?"
❌ Command frequent & jarang bercampur
❌ Ga ada visual hint untuk workflow mode
```

### Impact

```
- User overwhelmed dengan pilihan
- Time to first success lama
- Frequent commands tenggelam
- User experience buruk
```

---

## ✅ SOLUTION: CATEGORIZED CLI

### 1. WORKFLOW-BASED CATEGORIZATION

```
┌─────────────────────────────────────────────────────────────────┐
│                    EZ AGENTS CLI STRUCTURE                      │
└─────────────────────────────────────────────────────────────────┘

/ez:
│
├── 🚀 START (Project Initialization)
│   ├── /ez:new-project          # Initialize from zero
│   └── /ez:new-milestone        # Add new milestone
│
├── 📋 PLAN (Planning & Requirements)
│   ├── /ez:plan-phase           # Create phase plan
│   ├── /ez:discuss-phase        # Discuss requirements
│   ├── /ez:gather-requirements  # BDD requirements
│   └── /ez:arch-review          # Architecture review
│
├── ⚡ EXECUTE (Development)
│   ├── /ez:execute-phase        # Execute tasks
│   ├── /ez:autonomous           # Auto-execute all
│   └── /ez:quick                # Quick task (no plan)
│
├── 📊 TRACK (Progress & Monitoring)
│   ├── /ez:progress             # Progress bar
│   ├── /ez:standup              # Daily standup
│   ├── /ez:health               # Project health check
│   └── /ez:stats                # Statistics
│
├── 🚢 RELEASE (Production)
│   ├── /ez:release              # Tier-aware release
│   ├── /ez:preflight            # Pre-release check
│   └── /ez:hotfix               # Emergency fix
│
├── 💾 SESSION (Management)
│   ├── /ez:export-session       # Export session
│   ├── /ez:import-session       # Import session
│   ├── /ez:resume-session       # Resume session
│   └── /ez:list-sessions        # List all sessions
│
├── 🔧 MAINTAIN (Maintenance)
│   ├── /ez:cleanup              # Clean working directory
│   ├── /ez:debug                # Debug issues
│   ├── /ez:diagnose-issues      # Diagnose problems
│   └── /ez:node-repair          # Fix node_modules
│
└── 📚 HELP (Reference)
    ├── /ez:help                 # Full reference
    ├── /ez:settings             # Configure settings
    └── /ez:set-profile          # Set model profile
```

---

### 2. FREQUENCY-BASED VISUAL HINTS

```
┌─────────────────────────────────────────────────────────────────┐
│                    FREQUENCY LEGEND                             │
└─────────────────────────────────────────────────────────────────┘

🔥 = HOT (Daily use — 80% time)
⚡  = WARM (Weekly use — 15% time)
❄️  = COLD (Rare use — 5% time)
```

#### Example Output dengan Frequency Hints

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► HELP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 START
  🔥 /ez:new-project          Initialize project from zero
  ❄️ /ez:new-milestone        Create new milestone

📋 PLAN
  🔥 /ez:plan-phase           Create detailed phase plan
  ⚡  /ez:discuss-phase        Discuss phase requirements
  ❄️ /ez:gather-requirements  BDD requirements gathering
  ❄️ /ez:arch-review          Architecture review

⚡ EXECUTE
  🔥 /ez:execute-phase        Execute phase tasks
  🔥 /ez:autonomous           Auto-execute all phases
  ⚡  /ez:quick                Quick task (no plan)

📊 TRACK
  ⚡  /ez:progress             Visual progress bar
  ⚡  /ez:standup              Daily standup report
  ❄️ /ez:health               Project health check
  ❄️ /ez:stats                Development statistics

🚢 RELEASE
  ⚡  /ez:release              Tier-aware production release
  ❄️ /ez:preflight            Pre-release validation
  ❄️ /ez:hotfix               Emergency production fix

💾 SESSION
  ❄️ /ez:export-session       Export session data
  ❄️ /ez:import-session       Import session data
  ❄️ /ez:resume-session       Resume previous session
  ❄️ /ez:list-sessions        List all sessions

🔧 MAINTAIN
  ❄️ /ez:cleanup              Clean working directory
  ❄️ /ez:debug                Debug issues
  ❄️ /ez:diagnose-issues      Diagnose problems
  ❄️ /ez:node-repair          Fix node_modules

📚 HELP
  ⚡  /ez:help                 Full command reference
  ❄️ /ez:settings             Configure settings
  ❄️ /ez:set-profile          Set model profile
```

---

### 3. CONTEXT-AWARE SUGGESTIONS

#### Setelah Command Complete

```bash
# Setelah /ez:new-project
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ✅ PROJECT INITIALIZED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Created: .planning/PROJECT.md
 Created: .planning/ROADMAP.md
 Created: .planning/STATE.md

 Next steps:
   1. /ez:plan-phase 1          ← Start planning first phase
   2. /ez:discuss-phase 1       ← Discuss requirements first
```

```bash
# Setelah /ez:plan-phase 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ✅ PHASE 1 PLANNED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Created: .planning/phases/01/01-PLAN-001.md
 Created: .planning/phases/01/01-PLAN-002.md

 Next steps:
   1. /ez:execute-phase 1 --plan 1   ← Execute first task
   2. /ez:autonomous                 ← Execute all automatically
```

```bash
# Setelah /ez:autonomous complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ✅ ALL PHASES COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Next steps:
   1. /ez:release mvp v1.0.0    ← Release production
   2. /ez:release preflight     ← Dry run first
```

---

### 4. WORKFLOW MODE DETECTION

#### Detect User Intent dari Command Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODE DETECTION                               │
└─────────────────────────────────────────────────────────────────┘

IF user runs: /ez:new-project
THEN suggest: /ez:plan-phase 1

IF user runs: /ez:plan-phase N
THEN suggest: /ez:execute-phase N OR /ez:autonomous

IF user runs: /ez:execute-phase N --plan M
THEN suggest: /ez:execute-phase N --plan $((M+1))

IF user runs: /ez:autonomous
THEN display: Full progress bar + lifecycle status

IF user runs: /ez:release
THEN warn: Check preflight first → /ez:release preflight
```

---

### 5. VISUAL PROGRESS INDICATORS

#### Progress Bar di Setiap Command

```bash
# /ez:progress output
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Milestone: v1.0.0 — MVP Launch

 [████████████░░░░░░░░] 60% Complete

 Phase 1: Project Setup          ✅ Complete
 Phase 2: Core Features          ✅ Complete
 Phase 3: Database Layer         ⏳ In Progress (50%)
 Phase 4: UI Components          ⏵ Pending
 Phase 5: Testing                ⏵ Pending
 Phase 6: Release Prep           ⏵ Pending

 Sprint Health: 75/100 — SOME FRICTION
 → Recommendation: Resolve API blocker before continuing
```

#### Task Progress dalam Execute

```bash
# /ez:execute-phase 3 --plan 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► EXECUTE Phase 3 Task 2/4
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Phase 3: Database Layer    [████████░░░░] 50%

 Task 1: Schema design       ✅ Complete
 Task 2: Models & repos      ⏳ Running...
 Task 3: Migrations          ⏵ Pending
 Task 4: Seed data           ⏵ Pending

 Working on: Creating User model...
```

---

### 6. SMART HELP SYSTEM

#### `/ez:help` dengan Kategori

```bash
/ez:help
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► HELP — Command Reference
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 MOST USED (Start Here)
  /ez:new-project       Initialize new project
  /ez:plan-phase        Create phase plan
  /ez:autonomous        Execute all phases auto
  /ez:execute-phase     Execute specific task
  /ez:release           Production release

📋 BY WORKFLOW

🚀 Start Project
  /ez:new-project       From zero to roadmap
  /ez:new-milestone     Add milestone

📋 Plan
  /ez:plan-phase        Detailed task plans
  /ez:discuss-phase     Requirements discussion
  /ez:gather-requirements  BDD .feature files
  /ez:arch-review       Architecture review

⚡ Execute
  /ez:execute-phase     Execute task by task
  /ez:autonomous        Execute all phases
  /ez:quick             Quick task (no plan)

📊 Track
  /ez:progress          Visual progress
  /ez:standup           Daily report
  /ez:health            Health check

🚢 Release
  /ez:release           Production release
  /ez:preflight         Pre-release check
  /ez:hotfix            Emergency fix

💾 Session
  /ez:export-session    Export for handoff
  /ez:import-session    Import from handoff
  /ez:resume-session    Resume session

🔧 Maintain
  /ez:cleanup           Clean directory
  /ez:debug             Debug issues

📚 Configure
  /ez:settings          Configure settings
  /ez:set-profile       Set model profile

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 💡 TIP: Use /ez:help <category> for details
  Example: /ez:help plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Category-Specific Help

```bash
/ez:help plan
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► HELP — PLANNING WORKFLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 PLANNING COMMANDS

/ez:plan-phase <N>
  Create detailed task plans for phase N
  
  Example: /ez:plan-phase 1
  Output: .planning/phases/01/01-PLAN-*.md
  
  Steps:
  1. Read CONTEXT.md (if exists)
  2. Generate task breakdown
  3. Create PLAN.md files
  4. Estimate effort

/ez:discuss-phase <N>
  Discuss requirements before planning
  
  Example: /ez:discuss-phase 1
  Output: .planning/phases/01/01-CONTEXT.md
  
  Steps:
  1. Ask grey area questions
  2. Document decisions
  3. Create CONTEXT.md

/ez:gather-requirements <N> [--auto]
  Gather BDD requirements
  
  Example: /ez:gather-requirements 4
  Output: specs/features/phase-4/*.feature
  
  Modes:
  - Interactive: Agent interviews you
  - --auto: Derive from context

/ez:arch-review <N>
  Architecture review for phase N
  
  Example: /ez:arch-review 5
  Output: BLOCKER/WARNING/ADVISORY report
  
  Use for: Complex/critical phases

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 💡 TIP: Run /ez:discuss-phase before /ez:plan-phase
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 7. INTERACTIVE MODE

#### `/ez` tanpa Argument

```bash
/ez
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► AGENTS — Interactive Mode
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Quick Start
  1. new-project          Initialize new project
  2. plan-phase           Create phase plan
  3. autonomous           Execute all phases

📋 Common Workflows
  4. execute-phase        Execute specific task
  5. progress             Check progress
  6. standup              Daily report
  7. release              Production release

💾 Session
  8. resume-session       Resume last session
  9. export-session       Export session

🔧 More
  h. help                 Full reference
  s. settings             Configure
  q. quit                 Exit

Select [1-9|h|s|q]: _
```

---

### 8. ERROR MESSAGES YANG HELPFUL

#### Current vs Improved

```
❌ CURRENT (Bad)
Error: Phase directory not found

✅ IMPROVED (Helpful)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ❌ ERROR: Phase Not Found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Phase 3 does not exist in ROADMAP.md

 Possible causes:
  1. Phase number is wrong
  2. Phase belum di-plan
  3. ROADMAP.md outdated

 Suggested fix:
  /ez:plan-phase 3          ← Plan this phase first
  
  Or check ROADMAP.md:
  cat .planning/ROADMAP.md
```

```
❌ CURRENT (Bad)
Error: No sessions found

✅ IMPROVED (Helpful)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ❌ ERROR: No Sessions Found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 No session data available to resume.

 Possible causes:
  1. First time running EZ Agents
  2. Session files deleted
  3. Wrong project directory

 Suggested fix:
  /ez:new-project           ← Start new project
  
  Or check if in right directory:
  ls .planning/sessions/
```

---

### 9. ONBOARDING FLOW

#### First Time User Detection

```bash
# Detect first-time user
if [ ! -d ".planning" ]; then
  echo "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 👋 Welcome to EZ Agents!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Looks like this is your first time. Let's get started!

 EZ Agents helps you:
  ✅ Create hierarchical project plans
  ✅ Execute phases automatically
  ✅ Track progress visually
  ✅ Release with confidence

 Quick start:
  /ez:new-project           ← Start here!
  
 Or view tutorial:
  /ez:help tutorial

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"
fi
```

---

### 10. COMMAND ALIASES

#### Shortcuts untuk Power Users

```bash
# Add to ez-tools.cjs

# Aliases
/ez:np    → /ez:new-project
/ez:pp    → /ez:plan-phase
/ez:ep    → /ez:execute-phase
/ez:au    → /ez:autonomous
/ez:pr    → /ez:progress
/ez:st    → /ez:standup
/ez:rl    → /ez:release
/ez:hf    → /ez:hotfix
/ez:ex    → /ez:export-session
/ez:im    → /ez:import-session
/ez:rs    → /ez:resume-session
/ez:ls    → /ez:list-sessions
```

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Core Categorization (HIGH PRIORITY)

```
┌─────────────────────────────────────────────────────┐
│ TASKS                                               │
├─────────────────────────────────────────────────────┤
│ ✅ Add category headers to /ez:help output          │
│ ✅ Add frequency emojis (🔥⚡❄️)                      │
│ ✅ Add "Next steps" suggestions after commands      │
│ ✅ Improve error messages with context              │
└─────────────────────────────────────────────────────┘
```

### Phase 2: Visual Enhancements (MEDIUM PRIORITY)

```
┌─────────────────────────────────────────────────────┐
│ TASKS                                               │
├─────────────────────────────────────────────────────┤
│ ✅ Add progress bars to execute-phase               │
│ ✅ Add workflow status banners                      │
│ ✅ Create interactive mode (/ez without args)       │
│ ✅ Add command aliases                              │
└─────────────────────────────────────────────────────┘
```

### Phase 3: Smart Features (LOW PRIORITY)

```
┌─────────────────────────────────────────────────────┐
│ TASKS                                               │
├─────────────────────────────────────────────────────┤
│ ⚪ Context-aware suggestions                          │
│ ⚪ Workflow mode detection                           │
│ ⚪ First-time user onboarding                        │
│ ⚪ Category-specific help (/ez:help plan)            │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 DESIGN PRINCIPLES

### 1. **Progressive Disclosure**

```
Beginner: See 5 main commands
Intermediate: See categories
Power user: See all + aliases
```

### 2. **Consistent Visual Language**

```
- Banners: ━━━━━━━━━━
- Sections: ┌─────────┐
- Emojis: 🔥⚡❄️✅❌⏳⏵
- Progress: [████░░░░]
```

### 3. **Action-Oriented Language**

```
❌ "Phase planning module"
✅ "Create phase plan"

❌ "Execution facilitation"
✅ "Execute tasks"
```

### 4. **Error = Opportunity to Help**

```
❌ Just error message
✅ Error + Cause + Fix + Command
```

---

## 📊 BEFORE vs AFTER

### Before (Current)

```
$ /ez:help

Available commands:
  new-project
  plan-phase
  execute-phase
  autonomous
  progress
  standup
  release
  hotfix
  export-session
  import-session
  ... (38 more)
```

**User thought:** "Mana yang penting? Urutannya gimana?"

---

### After (Improved)

```
$ /ez:help

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► HELP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 MOST USED
  /ez:new-project       Start new project
  /ez:plan-phase        Create phase plan
  /ez:autonomous        Execute all phases
  /ez:execute-phase     Execute specific task

📋 BY WORKFLOW

🚀 Start
  /ez:new-project       Initialize from zero

📋 Plan
  /ez:plan-phase        Create task plans
  /ez:discuss-phase     Discuss requirements

⚡ Execute
  /ez:autonomous        Auto-execute all
  /ez:execute-phase     Manual execution

📊 Track
  /ez:progress          Visual progress
  /ez:standup           Daily report

🚢 Release
  /ez:release           Production release
  /ez:hotfix            Emergency fix

💡 TIP: Start with /ez:new-project
```

**User thought:** "Oh, mulai dari new-project, terus autonomous!"

---

## ✅ SUCCESS METRICS

| Metric | Before | Target |
|--------|--------|--------|
| Time to first command | 30s | <10s |
| Help command usage | High | -50% |
| Error recovery time | 2min | <30s |
| User satisfaction | ? | >4.5/5 |

---

## 🎯 FINAL RECOMMENDATION

### Implement Ini Dulu (80% Value)

```
1. ✅ Category headers di /ez:help
2. ✅ Frequency emojis (🔥⚡❄️)
3. ✅ "Next steps" suggestions
4. ✅ Improved error messages
5. ✅ Progress bars di execute-phase
```

### Implement Nanti (20% Value)

```
1. ⚪ Interactive mode
2. ⚪ Command aliases
3. ⚪ First-time onboarding
4. ⚪ Category-specific help
```

---

**File ini adalah blueprint untuk UX improvement.**
**Implement Phase 1 dulu — biggest bang for buck.**

---

**Last Updated:** March 2026  
**Version:** EZ Agents v3.5.0
