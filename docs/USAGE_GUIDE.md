# EZ Agents - Panduan Penggunaan Berdasarkan Fase Project

> **EZ Agents** — Meta-prompting & Agent Orchestration, but ez.

---

## 📋 QUICK REFERENCE

| Fase Project | Command yang Dipakai | Tujuan |
|--------------|---------------------|--------|
| **Start** | `/ez:new-project` | Inisialisasi project dari nol |
| **Start** | `/ez:plan-phase 1` | Buat detail plan phase pertama |
| **Start-Middle** | `/ez:execute-phase 1` | Eksekusi task dalam phase |
| **Middle** | `/ez:autonomous` | Jalankan semua phase otomatis |
| **Middle** | `/ez:standup` | Daily check-in & health score |
| **Middle** | `/ez:progress` | Lihat progress bar |
| **Middle** | `/ez:arch-review` | Review arsitektur sebelum execute |
| **Middle** | `/ez:gather-requirements` | Ambil requirements BDD |
| **Middle** | `/ez:export-session` | Export session untuk handoff |
| **Middle** | `/ez:import-session` | Import session dari export |
| **Middle** | `/ez:resume-session` | Lanjutkan session sebelumnya |
| **End** | `/ez:release mvp v1.0.0` | Release production |
| **Emergency** | `/ez:hotfix start <name>` | Buat branch hotfix |
| **Emergency** | `/ez:hotfix complete <name> v1.0.1` | Complete hotfix & tag |

---

# 🚀 FASE 1: MEMULAI PROJECT BARU

## Situasi
- Kamu punya ide project baru
- Masih kosong, belum ada kode
- Butuh roadmap yang jelas sebelum coding

## Workflow yang Dipakai

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROJECT INITIALIZATION                       │
└─────────────────────────────────────────────────────────────────┘

  /ez:new-project
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 1. Deep Questioning                     │
  │    Agent akan tanya:                    │
  │    - Apa yang mau dibangun?             │
  │    - Siapa user-nya?                    │
  │    - Tech stack preference?             │
  │    - Constraints?                       │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 2. Optional Research                    │
  │    Spawn 4 parallel researcher agents   │
  │    - Domain research                    │
  │    - Competitor analysis                │
  │    - Best practices                     │
  │    - Tech recommendations               │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 3. Requirements Definition              │
  │    Create REQUIREMENTS.md dengan:       │
  │    - v1 scope (must-have)               │
  │    - v2 scope (nice-to-have)            │
  │    - Out of scope                       │
  │    - REQ-IDs untuk tracking             │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 4. Roadmap Creation                     │
  │    Create ROADMAP.md dengan:            │
  │    - Phase breakdown                    │
  │    - Success criteria per phase         │
  │    - Requirements mapping               │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 5. Create .planning/ Artifacts          │
  │    - PROJECT.md (vision & principles)   │
  │    - config.json (workflow mode)        │
  │    - STATE.md (project memory)          │
  │    - requirements/                      │
  │    - research/ (if selected)            │
  └─────────────────────────────────────────┘
       │
       ▼
  ✅ PROJECT READY FOR PLANNING
```

## Command

```bash
/ez:new-project
```

## Output yang Diharapkan

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► NEW PROJECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Created: .planning/PROJECT.md
 Created: .planning/REQUIREMENTS.md
 Created: .planning/ROADMAP.md
 Created: .planning/STATE.md
 Created: .planning/config.json

 Next: /ez:plan-phase 1
```

---

## Lanjutan: Plan Phase Pertama

### Situasi
- Project sudah diinisialisasi
- ROADMAP.md sudah ada
- Mau mulai coding phase 1

### Command

```bash
/ez:plan-phase 1
```

### Apa yang Terjadi

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE PLANNING                               │
└─────────────────────────────────────────────────────────────────┘

  /ez:plan-phase 1
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ Read CONTEXT.md (dari discuss-phase)   │
  │ - Domain boundaries                     │
  │ - User decisions                        │
  │ - Code context                          │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ Generate Task Plans                     │
  │ - Break down phase goal                │
  │ - Create individual PLAN.md files      │
  │ - Estimate effort per task             │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ Output: .planning/phases/01/            │
  │ - 01-PLAN-001.md                        │
  │ - 01-PLAN-002.md                        │
  │ - ...                                   │
  └─────────────────────────────────────────┘
       │
       ▼
  ✅ READY FOR EXECUTION
```

---

# 🔨 FASE 2: DEVELOPMENT (TENGAH PROJECT)

## Situasi
- Phase plan sudah dibuat
- Siap coding
- Butuh eksekusi task-by-task

## Workflow yang Dipakai

### Opsi A: Manual Execution (Recommended untuk Learning)

```
┌─────────────────────────────────────────────────────────────────┐
│                    MANUAL EXECUTION LOOP                        │
└─────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐
  │ /ez:plan-phase 1│
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ /ez:execute-phase 1 --plan 1 │
  │ (Task 1: Setup project)      │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ /ez:execute-phase 1 --plan 2 │
  │ (Task 2: Create components)  │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ /ez:execute-phase 1 --plan 3 │
  │ (Task 3: Write tests)        │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Verify phase    │
  │ Check VERIFICATION.md │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Next phase:     │
  │ /ez:plan-phase 2│
  └─────────────────┘
```

#### Command per Task

```bash
# Execute task pertama
/ez:execute-phase 1 --plan 1

# Execute task kedua
/ez:execute-phase 1 --plan 2

# Execute task ketiga
/ez:execute-phase 1 --plan 3

# Setelah semua task complete, verify
/ez:execute-phase 1
```

---

### Opsi B: Autonomous Mode (Recommended untuk Production)

### Situasi
- Semua phase sudah di-plan
- Mau jalankan semua otomatis
- Agent akan loop: discuss → plan → execute

### Command

```bash
# Jalankan semua phase otomatis
/ez:autonomous

# Atau mulai dari phase tertentu
/ez:autonomous --from 3
```

### Apa yang Terjadi

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS EXECUTION                         │
└─────────────────────────────────────────────────────────────────┘

  /ez:autonomous
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 1. Discover Incomplete Phases           │
  │    - Read ROADMAP.md                    │
  │    - Filter incomplete phases           │
  │    - Sort by number                     │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 2. For Each Phase:                      │
  │                                         │
  │    ┌─────────────────────────────────┐ │
  │    │ 2a. Smart Discuss               │ │
  │    │ - Check CONTEXT.md exists       │ │
  │    │ - If not: generate context      │ │
  │    │ - Propose grey area answers     │ │
  │    │ - User accepts/overrides        │ │
  │    └─────────────────────────────────┘ │
  │              │                          │
  │              ▼                          │
  │    ┌─────────────────────────────────┐ │
  │    │ 2b. Plan Phase                  │ │
  │    │ - Read CONTEXT.md               │ │
  │    │ - Generate task plans           │ │
  │    └─────────────────────────────────┘ │
  │              │                          │
  │              ▼                          │
  │    ┌─────────────────────────────────┐ │
  │    │ 2c. Execute Task Loop           │ │
  │    │ - For each task:                │ │
  │    │   ez:execute-phase --plan N     │ │
  │    │ - Verify output                 │ │
  │    │ - Update progress               │ │
  │    └─────────────────────────────────┘ │
  │              │                          │
  │              ▼                          │
  │    ┌─────────────────────────────────┐ │
  │    │ 2d. Phase Verification          │ │
  │    │ - Read VERIFICATION.md          │ │
  │    │ - Check status:                 │ │
  │    │   • passed → continue           │ │
  │    │   • human_needed → prompt       │ │
  │    │   • gaps_found → fix/defer      │ │
  │    └─────────────────────────────────┘ │
  │              │                          │
  │              ▼                          │
  │    ┌─────────────────────────────────┐ │
  │    │ Re-read ROADMAP.md              │ │
  │    │ (catch dynamic phases 5.1, 5.2) │ │
  │    └─────────────────────────────────┘ │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 3. Lifecycle (after all phases done)    │
  │    - ez:audit-milestone                 │
  │    - ez:complete-milestone              │
  │    - ez:cleanup                         │
  └─────────────────────────────────────────┘
       │
       ▼
  ✅ MILESTONE COMPLETE 🎉
```

---

## Daily Check-in (Setiap Hari Kerja)

### Situasi
- Lagi di tengah development
- Mau tau progress & blockers
- Butuh health score sprint

### Command

```bash
/ez:standup
```

### Output

```
## Daily Standup — 20 March 2026

### Yesterday
- Completed: Phase 2 Task 3 (API integration)
- Completed: Phase 2 Task 4 (Error handling)
- Started: Phase 3 planning

### Today (Planned)
- Execute Phase 3 Task 1 (Database schema)
- Execute Phase 3 Task 2 (Models & repositories)

### Blockers
- Waiting for API key from client (REQ-042)

### Velocity Trend
- Phase 1: 100% complete (3/3 tasks)
- Phase 2: 100% complete (5/5 tasks)
- Phase 3: 0% complete (0/4 tasks)

Sprint Health: 75/100 — SOME FRICTION
→ Recommendation: Resolve API key blocker before Phase 3 execution
```

---

## Cek Progress Visual

### Situasi
- Mau lihat progress bar visual
- Cek berapa % project complete

### Command

```bash
/ez:progress
```

### Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Milestone: v1.0.0 — MVP Launch

 [████████████░░░░░░░░] 60% Complete

 Phase 1: Project Setup          ✅ Complete
 Phase 2: Core Features          ✅ Complete
 Phase 3: Database Layer         ⏳ In Progress
 Phase 4: UI Components          ⏵ Pending
 Phase 5: Testing                ⏵ Pending
 Phase 6: Release Prep           ⏵ Pending

 Next: Phase 3 Task 2 (Models & repositories)
```

---

## Architecture Review (Sebelum Execute Phase Besar)

### Situasi
- Phase plan sudah dibuat
- Mau ensure arsitektur solid
- Cek technical debt sebelum coding

### Command

```bash
/ez:arch-review 3
```

### Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► ARCH REVIEW — Phase 3: Database Layer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Tech Lead Review: Phase 3 — ⚠️ WARNINGS

### BLOCKERS
None ✅

### WARNINGS
1. Repository pattern tidak konsisten di PLAN-002
   → Suggestion: Standardize interface di lib/repository.ts

2. Missing migration strategy untuk schema changes
   → Suggestion: Add PLAN-005 untuk database migrations

### ADVISORY
- Consider using connection pooling untuk production
- Add indexes pada frequently queried fields

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: APPROVED with warnings
Safe to execute, address warnings during implementation
```

---

## Gather Requirements (Untuk Phase yang Complex)

### Situasi
- Phase punya requirements complex
- Butuh BDD-style .feature files
- Mau clear acceptance criteria

### Command

```bash
# Interactive mode (agent akan interview kamu)
/ez:gather-requirements 4

# Auto mode (derive dari context yang ada)
/ez:gather-requirements 4 --auto
```

### Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► GATHERING REQUIREMENTS — Phase 4: UI Components
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning requirements agent...

Agent reads:
- .planning/STATE.md
- .planning/ROADMAP.md
- .planning/phases/04/04-CONTEXT.md

◆ Interview Mode

Q1: Component density preference?
  a) Compact (more data per screen)
  b) Comfortable (balanced) ← Recommended
  c) Spacious (more whitespace)

Q2: State management approach?
  a) Local state only
  b) Context API ← Recommended
  c) Redux/Zustand

[After interview completes]

Created: specs/features/phase-4/
  - authentication.feature
  - dashboard.feature
  - user-management.feature

Created: .planning/phases/04/04-ACCEPTANCE-CRITERIA.md

✅ Requirements gathered — INVEST validated
```

---

## Session Management (Handoff / Backup / Resume)

### Export Session

### Situasi
- Mau handoff ke team member
- Backup session untuk archival
- Mau lanjut di model lain (Claude → GPT)

### Command

```bash
# Export last session
/ez:export-session

# Export session tertentu
/ez:export-session abc-123-xyz --format json

# Export dengan custom path
/ez:export-session --output ~/backups/session-backup.md
```

### Output

```
Session exported successfully

Session ID: abc-123-xyz
Format: markdown
Output: .planning/sessions/export-abc-123-xyz.md
Size: 245 KB
```

---

### Import Session

### Situasi
- Dikirim session export dari team member
- Mau lanjut session dari backup
- Model handoff (import dari export)

### Command

```bash
/ez:import-session .planning/sessions/export-abc-123-xyz.json
```

### Output

```
Session imported successfully

Session ID: abc-123-xyz
Original model: Claude Sonnet 3.7
Imported: 156 messages
Context restored: ✅
```

---

### Resume Session

### Situasi
- Session sebelumnya terputus
- Mau lanjut dari checkpoint terakhir

### Command

```bash
# Resume last session
/ez:resume-session

# Resume session tertentu
/ez:resume-session abc-123-xyz
```

### Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► RESUME SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Session: abc-123-xyz
 Last active: 2 hours ago
 Phase: Phase 3 Task 2

 Context restored:
 - 156 messages loaded
 - 12 files in working set
 - Last command: /ez:execute-phase 3 --plan 2

 Ready to continue ✅
```

---

# 🚢 FASE 3: RELEASE PRODUCTION

## Situasi
- Semua phase complete
- Siap release production
- Butuh security gates & rollback plan

## Pilih Tier Release

| Tier | Pre-flight | Use Case |
|------|------------|----------|
| **mvp** | None | Quick release, internal tools, prototypes |
| **medium** | verify-work | Client projects, production apps |
| **enterprise** | verify-work + audit-milestone + arch-review | Mission-critical, regulated industries |

---

### Release MVP

```bash
/ez:release mvp v1.0.0
```

### Release Medium

```bash
/ez:release medium v1.0.0
```

**Auto pre-flight:**
```
[auto] Running verify-work before medium release...
```

### Release Enterprise

```bash
/ez:release enterprise v2.0.0
```

**Auto pre-flight:**
```
[auto] Running verify-work...
[auto] Running audit-milestone...
[auto] Running arch-review...
```

---

## Release Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    RELEASE PIPELINE                             │
└─────────────────────────────────────────────────────────────────┘

  /ez:release <tier> v1.0.0
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ [auto] Tier-based Pre-flight            │
  │ (verify-work, audit, arch-review)       │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ Step 1: Validate Semver                 │
  │ ✅ v1.0.0 is valid                      │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ Step 2: Check Current State             │
  │ - git status --short                    │
  │ - Current branch                        │
  │ - Current version                       │
  │ ❌ ERROR if uncommitted changes         │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ Step 3: Security Gates                  │
  │ Gate 1: No secrets in code              │
  │ Gate 2: No critical CVEs                │
  │ Gate 3: Dependencies scanned            │
  │ ❌ ERROR if any gate fails              │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ Step 4: Tier Checklist                  │
  │ MVP: Tests pass                         │
  │ Medium: + Docs complete                 │
  │ Enterprise: + Audit pass + Arch review  │
  │ ⚠️ Gaps → User decision                │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ Step 5: Create Release Branch           │
  │ git checkout -b release/v1.0.0          │
  │ ⚠️ If exists → Check HEAD              │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ Step 6: Generate Changelog              │
  │ Parse commits since last tag            │
  │ ⚠️ If no commits → Warn               │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ Step 7: Bump Version                    │
  │ Update package.json to v1.0.0           │
  │ ⚠️ If conflict → Suggest next version │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ Step 8: Write Rollback Plan             │
  │ Document revert steps                   │
  │ Commands to run                         │
  │ Expected state after rollback           │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ Step 9: Tag Release                     │
  │ git tag -a v1.0.0 -m "Release v1.0.0"   │
  │ ⚠️ If tag exists → Offer alternatives │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ ✅ RELEASE COMPLETE 🎉                  │
  │                                         │
  │ Next: git push --follow-tags            │
  │       Deploy to production              │
  └─────────────────────────────────────────┘
```

---

## Pre-flight Only (Dry Run)

### Situasi
- Mau cek apakah ready release
- Belum mau actual release

### Command

```bash
/ez:release preflight medium
```

### Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► PREFLIGHT — MEDIUM TIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ State Validation: Clean
✅ Security Gates: Passed
✅ Tier Checklist: 8/10 items

⚠️ Gaps Found:
  - API documentation incomplete
  - Changelog missing

Recommendation: Fix gaps before release
```

---

# 🚨 FASE 4: EMERGENCY HOTFIX

## Situasi
- Production bug ditemukan
- Butuh fix urgent
- Mau isolate fix dari ongoing work

---

## Start Hotfix

### Command

```bash
/ez:hotfix start critical-bug
```

### Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► HOTFIX STARTED: hotfix/critical-bug
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Branch:   hotfix/critical-bug
From:     main (v1.0.0)
Tier:     medium

Make your fix, commit it, then complete:
/ez:hotfix complete critical-bug v1.0.1

Example:
  Current: 1.0.0
  Next:    1.0.1
```

### Apa yang Terjadi

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOTFIX START                                 │
└─────────────────────────────────────────────────────────────────┘

  /ez:hotfix start <name>
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 1. Check Uncommitted Changes            │
  │ ❌ ERROR if dirty state                 │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 2. Checkout Main                        │
  │ git checkout main                       │
  │ ⚠️ ERROR if main not found             │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 3. Create Hotfix Branch                 │
  │ git checkout -b hotfix/{name}           │
  │ From: last tag or main                  │
  │ ⚠️ ERROR if branch exists              │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 4. Report to User                       │
  │ Display branch info                     │
  │ Suggest next version                    │
  │                                         │
  │ 🛑 STOP — Developer works on fix       │
  └─────────────────────────────────────────┘
```

---

## Complete Hotfix

### Command

```bash
/ez:hotfix complete critical-bug v1.0.1
```

### Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► HOTFIX COMPLETE: hotfix/critical-bug
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Merged to main
✅ Tagged: v1.0.1
✅ Merged to develop
✅ Deleted: hotfix/critical-bug

Hotfix deployed to production 🎉
```

### Apa yang Terjadi

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOTFIX COMPLETE                              │
└─────────────────────────────────────────────────────────────────┘

  /ez:hotfix complete <name> <version>
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 1. Validate State                       │
  │ - On hotfix branch?                     │
  │ - Clean git state?                      │
  │ ❌ ERROR if invalid                     │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 2. Merge to Main (atomic)               │
  │ git checkout main                       │
  │ git merge --no-ff hotfix/{name}         │
  │ ⚠️ Merge conflict → Manual resolution │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 3. Tag Release                          │
  │ git tag -a v{version}                   │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 4. Merge to Develop (GitFlow)           │
  │ git checkout develop                    │
  │ git merge --no-ff hotfix/{name}         │
  │ ⚠️ Merge conflict → Resolve/skip     │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 5. Delete Hotfix Branch                 │
  │ git branch -d hotfix/{name}             │
  └─────────────────────────────────────────┘
       │
       ▼
  ✅ COMPLETE
```

---

# 📊 DECISION TREE: KAPAN PAKAI COMMAND APA

```
┌─────────────────────────────────────────────────────────────────┐
│                    EZ AGENTS DECISION TREE                      │
└─────────────────────────────────────────────────────────────────┘

                              START
                                │
                                ▼
                    ┌───────────────────────┐
                    │ Project sudah ada?    │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                   NO                      YES
                    │                       │
                    ▼                       ▼
          ┌─────────────────┐     ┌───────────────────┐
          │ /ez:new-project │     │ Ada ROADMAP.md?   │
          └─────────────────┘     └─────────┬─────────┘
                                            │
                                  ┌─────────┴─────────┐
                                  │                   │
                                 NO                  YES
                                  │                   │
                                  ▼                   ▼
                        ┌─────────────────┐ ┌───────────────────┐
                        │ /ez:plan-phase 1│ │ Phase incomplete? │
                        └─────────────────┘ └─────────┬─────────┘
                                                      │
                                            ┌─────────┴─────────┐
                                            │                   │
                                           YES                 NO
                                            │                   │
                                            ▼                   ▼
                                  ┌─────────────────┐ ┌───────────────────┐
                                  │ Mau manual atau │ │ /ez:audit-milestone│
                                  │ autonomous?     │ └───────────────────┘
                                  └────────┬────────┘
                                           │
                                  ┌────────┴────────┐
                                  │                 │
                              MANUAL            AUTONOMOUS
                                  │                 │
                                  ▼                 ▼
                        ┌─────────────────┐ ┌───────────────────┐
                        │ /ez:execute-phase│ │ /ez:autonomous   │
                        │ --plan N         │ └───────────────────┘
                        └─────────────────┘
                                            │
                                            ▼
                                  ┌───────────────────┐
                                  │ During Development│
                                  └─────────┬─────────┘
                                            │
                          ┌─────────────────┼─────────────────┐
                          │                 │                 │
                          ▼                 ▼                 ▼
                  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
                  │ Daily check-in│ │ Need metrics  │ │ Requirements  │
                  │               │ │               │ │ complex?      │
                  └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
                          │                 │                 │
                          ▼                 ▼                 ▼
                  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
                  │ /ez:standup   │ │ /ez:progress  │ │ /ez:gather-   │
                  └───────────────┘ └───────────────┘ │ requirements  │
                                                      └───────────────┘
                                            │
                                            ▼
                                  ┌───────────────────┐
                                  │ All phases done?  │
                                  └─────────┬─────────┘
                                            │
                                  ┌─────────┴─────────┐
                                  │                   │
                                 YES                 NO
                                  │                   │
                                  │                   │ (continue loop)
                                  ▼                   │
                        ┌─────────────────┐           │
                        │ Ready release?  │           │
                        └────────┬────────┘           │
                                 │                    │
                                 ▼                    │
                        ┌────────┴────────┐           │
                        │                 │           │
                       YES               NO           │
                        │                 │           │
                        ▼                 │           │
              ┌─────────────────┐         │           │
              │ Choose tier:    │         │           │
              │ mvp/medium/ent  │         │           │
              └────────┬────────┘         │           │
                       │                  │           │
                       ▼                  │           │
              ┌─────────────────┐         │           │
              │ /ez:release     │         │           │
              │ <tier> <version>│         │           │
              └─────────────────┘         │           │
                                          │           │
                                          ▼           │
                                  ┌───────────────────┘
                                  │
                                  ▼
                        ┌───────────────────┐
                        │ Production bug?   │
                        └─────────┬─────────┘
                                  │
                        ┌─────────┴─────────┐
                        │                   │
                       YES                 NO
                        │                   │
                        ▼                   │
              ┌─────────────────┐           │
              │ /ez:hotfix start│           │
              │ <name>          │           │
              │                 │           │
              │ [developer fix] │           │
              │                 │           │
              │ /ez:hotfix      │           │
              │ complete        │           │
              └─────────────────┘           │
                                            │
                                            ▼
                                         CONTINUE
```

---

# 📌 COMMAND CHEATSHEET

## Project Initialization

```bash
/ez:new-project              # Start from zero
/ez:plan-phase 1             # Plan first phase
/ez:execute-phase 1          # Execute phase 1
/ez:execute-phase 1 --plan 2 # Execute specific task
```

## Autonomous Mode

```bash
/ez:autonomous              # Run all phases auto
/ez:autonomous --from 3     # Start from phase 3
```

## Daily Operations

```bash
/ez:standup                 # Daily standup report
/ez:progress                # Progress bar & metrics
/ez:arch-review 3           # Review phase 3 architecture
/ez:gather-requirements 4   # BDD requirements for phase 4
```

## Session Management

```bash
/ez:export-session                    # Export last session
/ez:export-session abc-123 --format json
/ez:import-session path/to/file.json  # Import session
/ez:resume-session                    # Resume last session
/ez:resume-session abc-123            # Resume specific
/ez:list-sessions                     # List all sessions
```

## Release

```bash
/ez:release mvp v1.0.0           # MVP release
/ez:release medium v1.0.0        # Medium release (+verify)
/ez:release enterprise v2.0.0    # Enterprise (+audit+arch)
/ez:release preflight medium     # Dry run only
```

## Hotfix

```bash
/ez:hotfix start critical-bug           # Create hotfix branch
/ez:hotfix complete critical-bug v1.0.1 # Merge, tag, sync
```

## Help

```bash
/ez:help                    # Full command reference
```

---

# 🎯 BEST PRACTICES

## 1. Start Small (MVP First)

```bash
# Jangan langsung enterprise
/ez:release mvp v1.0.0

# Setelah stable, upgrade tier
/ez:release medium v1.1.0
```

## 2. Use Autonomous untuk Production

```bash
# Learning phase: manual
/ez:execute-phase 1 --plan 1
/ez:execute-phase 1 --plan 2

# Production phase: autonomous
/ez:autonomous
```

## 3. Daily Standup Rutin

```bash
# Setiap hari sebelum coding
/ez:standup

# Cek blockers & health score
```

## 4. Arch Review untuk Phase Besar

```bash
# Sebelum execute phase complex
/ez:arch-review 5

# Address BLOCKERS & WARNINGS first
```

## 5. Export Session Periodically

```bash
# Backup sebelum major changes
/ez:export-session

# Handoff ke team member
/ez:import-session export.json
```

## 6. Hotfix Only for Production Bugs

```bash
# Bug di production
/ez:hotfix start gmail-login-fix

# Feature request → normal phase, bukan hotfix
```

---

# 🔧 TROUBLESHOOTING

## Error: "No ROADMAP.md found"

```bash
# Run initialization first
/ez:new-project
```

## Error: "Uncommitted changes"

```bash
# Commit or stash first
git add .
git commit -m "WIP"

# Then continue
/ez:release mvp v1.0.0
```

## Error: "Phase does not exist"

```bash
# Check ROADMAP.md
cat .planning/ROADMAP.md

# Plan phase first if missing
/ez:plan-phase 3
```

## Autonomous Mode Stuck

```bash
# Stop with Ctrl+C

# Check blockers in STATE.md
cat .planning/STATE.md

# Resume from specific phase
/ez:autonomous --from 5
```

## Session Import Failed

```bash
# Verify file is valid JSON
cat export.json | jq .

# Check version compatibility
# v2.x → v3.x may need migration
```

---

**Last Updated:** March 2026  
**Version:** EZ Agents v3.5.0
