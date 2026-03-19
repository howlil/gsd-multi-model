# EZ Agents v3.5 - Workflow Diagrams

## 1. RELEASE WORKFLOW (`/ez:release`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RELEASE WORKFLOW OVERVIEW                           │
└─────────────────────────────────────────────────────────────────────────────┘

  User Command: /ez:release <tier> <version>
  
  Tiers: mvp | medium | enterprise


┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: TIER-BASED PRE-FLIGHT (Auto-Invoke)                                  │
└──────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────────┐
                         │   Parse Arguments   │
                         │  tier + version     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  Check --no-auto    │
                         │  Check smart_orch   │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
     ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
     │     MVP        │   │    MEDIUM      │   │   ENTERPRISE   │
     │                │   │                │   │                │
     │ No pre-flight  │   │ verify-work    │   │ verify-work    │
     │                │   │                │   │ audit-milestone│
     │                │   │                │   │ arch-review    │
     └───────┬────────┘   └───────┬────────┘   └───────┬────────┘
             │                    │                    │
             └────────────────────┼────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  All auto-invocations   │
                    │  prefixed with [auto]   │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  STEP 2: INITIALIZE     │
                    └────────────┬────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 2-7: RELEASE PIPELINE                                                   │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────────────┐
    │                                                                      │
    ▼                                                                      │
┌─────────┐                                                                │
│ STEP 2  │────────────────────────────────────────────────────────┐       │
│ Validate│                                                        │       │
│ Semver  │                                                        │       │
└────┬────┘                                                        │       │
     │                                                             │       │
     │ ✅ Valid                                                    │       │
     ▼                                                             │       │
┌─────────┐                                                        │       │
│ STEP 3  │────────────────────────────────────────────────┐       │       │
│ Check   │                                                │       │       │
│ State   │                                                │       │       │
│ - git   │                                                │       │       │
│   status│                                                │       │       │
│ - branch│                                                │       │       │
│ - version│                                               │       │       │
└────┬────┘                                                │       │       │
     │                                                     │       │       │
     │ ✅ Clean state                                      │       │       │
     ▼                                                     │       │       │
┌─────────┐                                                │       │       │
│ STEP 4  │────────────────────────────────────────┐       │       │       │
│ Security│                                        │       │       │       │
│ Gates   │                                        │       │       │       │
│         │                                        │       │       │       │
│ Gate 1: │ No secrets in code                     │       │       │       │
│ Gate 2: │ No critical CVEs                       │       │       │       │
│ Gate 3: │ Dependencies scanned                   │       │       │       │
└────┬────┘                                        │       │       │       │
     │                                             │       │       │       │
     │ ✅ All gates pass                           │       │       │       │
     ▼                                             │       │       │       │
┌─────────┐                                        │       │       │       │
│ STEP 5  │────────────────────────────────┐       │       │       │       │
│ Tier    │                                │       │       │       │       │
│ Checklist│                               │       │       │       │       │
│         │                                │       │       │       │       │
│ MVP:    │ Tests pass                     │       │       │       │       │
│ Medium: │ + Docs complete                │       │       │       │       │
│ Ent:    │ + Audit pass + Arch review     │       │       │       │       │
└────┬────┘                                │       │       │       │       │
     │                                     │       │       │       │       │
     │ ✅ Checklist complete               │       │       │       │       │
     ▼                                     │       │       │       │       │
┌─────────┐                                │       │       │       │       │
│ STEP 6  │────────────────────────┐       │       │       │       │       │
│ Create  │                        │       │       │       │       │       │
│ Release │                        │       │       │       │       │       │
│ Branch  │                        │       │       │       │       │       │
│         │                        │       │       │       │       │       │
│ git     │                        │       │       │       │       │       │
│ checkout│                        │       │       │       │       │       │
│ -b      │                        │       │       │       │       │       │
│ release/│                        │       │       │       │       │       │
│ v{ver}  │                        │       │       │       │       │       │
└────┬────┘                        │       │       │       │       │       │
     │                             │       │       │       │       │       │
     │ ✅ Branch created           │       │       │       │       │       │
     ▼                             │       │       │       │       │       │
┌─────────┐                        │       │       │       │       │       │
│ STEP 7  │────────────────┐       │       │       │       │       │       │
│ Generate│                │       │       │       │       │       │       │
│ Changelog│               │       │       │       │       │       │       │
│         │                │       │       │       │       │       │       │
│ Parse   │                │       │       │       │       │       │       │
│ commits │                │       │       │       │       │       │       │
│ since   │                │       │       │       │       │       │       │
│ last tag│                │       │       │       │       │       │       │
└────┬────┘                │       │       │       │       │       │       │
     │                     │       │       │       │       │       │       │
     │ ✅ Changelog ready  │       │       │       │       │       │       │
     ▼                     │       │       │       │       │       │       │
┌─────────┐                │       │       │       │       │       │       │
│ STEP 8  │────────┐       │       │       │       │       │       │       │
│ Bump    │        │       │       │       │       │       │       │       │
│ Version │        │       │       │       │       │       │       │       │
│         │        │       │       │       │       │       │       │       │
│ Update  │        │       │       │       │       │       │       │       │
│ package.│        │       │       │       │       │       │       │       │
│ json    │        │       │       │       │       │       │       │       │
└────┬────┘        │       │       │       │       │       │       │       │
     │             │       │       │       │       │       │       │       │
     │ ✅ Version  │       │       │       │       │       │       │       │
     │   bumped    │       │       │       │       │       │       │       │
     ▼             │       │       │       │       │       │       │       │
┌─────────┐        │       │       │       │       │       │       │       │
│ STEP 9  │───────┐│       │       │       │       │       │       │       │
│ Write   │       ││       │       │       │       │       │       │       │
│ Rollback│       ││       │       │       │       │       │       │       │
│ Plan    │       ││       │       │       │       │       │       │       │
│         │       ││       │       │       │       │       │       │       │
│ Document│       ││       │       │       │       │       │       │       │
│ revert  │       ││       │       │       │       │       │       │       │
│ steps   │       ││       │       │       │       │       │       │       │
└────┬────┘       ││       │       │       │       │       │       │       │
     │            ││       │       │       │       │       │       │       │
     │ ✅ Plan    ││       │       │       │       │       │       │       │
     │   written  ││       │       │       │       │       │       │       │
     ▼            ││       │       │       │       │       │       │       │
┌─────────┐       ││       │       │       │       │       │       │       │
│ STEP 10 │──────┼┤       │       │       │       │       │       │       │
│ Tag     │       ││       │       │       │       │       │       │       │
│ Release │       ││       │       │       │       │       │       │       │
│         │       ││       │       │       │       │       │       │       │
│ git tag │       ││       │       │       │       │       │       │       │
│ -a      │       ││       │       │       │       │       │       │       │
│ v{ver}  │       ││       │       │       │       │       │       │       │
└────┬────┘       ││       │       │       │       │       │       │       │
     │            ││       │       │       │       │       │       │       │
     │ ✅ Tagged  ││       │       │       │       │       │       │       │
     ▼            ││       │       │       │       │       │       │       │
┌─────────────────┴┴───────┴───────┴───────┴───────┴───────────────────────┐
│                         RELEASE COMPLETE 🎉                               │
└───────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ ERROR HANDLING AT EACH STEP                                                  │
└──────────────────────────────────────────────────────────────────────────────┘

  Step 2 (Semver): Invalid format → Error "Version must be X.Y.Z"
  
  Step 3 (State): Uncommitted changes → Error "Commit or stash first"
  
  Step 4 (Security): Gate fails → ERROR with details
                     ├─ Secrets found → List files
                     ├─ CVEs found → List packages
                     └─ Dependencies → Run audit
  
  Step 5 (Checklist): Gaps found → User decision
                      ├─ Continue anyway
                      ├─ Fix first
                      └─ Abort
  
  Step 6 (Branch): Branch exists → Check HEAD
                   ├─ Same as main → Delete & recreate
                   └─ Different → Error "Manual fix needed"
  
  Step 7 (Changelog): No commits → Warn "No changes"
                      → Offer bump anyway
  
  Step 8 (Version): Version conflict → Error "Already exists"
                    → Suggest next version
  
  Step 10 (Tag): Tag exists → Offer delete/recreate
                              → Offer different version
```

---

## 2. HOTFIX WORKFLOW (`/ez:hotfix`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HOTFIX WORKFLOW OVERVIEW                            │
└─────────────────────────────────────────────────────────────────────────────┘

  Commands:
  /ez:hotfix start <name>
  /ez:hotfix complete <name> <version>


┌──────────────────────────────────────────────────────────────────────────────┐
│ HOTFIX START                                                                │
└──────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │  /ez:hotfix start   │
                    │     <name>          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ 2a. Load State      │
                    │ - Current branch    │
                    │ - Current version   │
                    │ - Last tag          │
                    │ - Tier config       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ 2b. Check Changes   │
                    │ git status --short  │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
              ┌──────────┐         ┌──────────┐
              │ Changes  │         │  Clean   │
              │ exist    │         │  state   │
              └────┬─────┘         └────┬─────┘
                   │                    │
                   ▼                    │
              ┌─────────────────────────┘
              │ ERROR: "Stash or commit │
              │ current work first"     │
              │ (STOP)                  │
              │                         │
              │                         ▼
              │               ┌─────────────────────┐
              │               │ 2c. Create Branch   │
              │               │                     │
              │               │ SOURCE = last tag   │
              │               │          or main    │
              │               │                     │
              │               │ git checkout SOURCE │
              │               │ git checkout -b     │
              │               │   hotfix/{name}     │
              │               └──────────┬──────────┘
              │                          │
              │                          ▼
              │               ┌─────────────────────┐
              │               │ 2d. Report to User  │
              │               │                     │
              │               │ Display:            │
              │               │ - Branch name       │
              │               │ - Source & version  │
              │               │ - Next command      │
              │               │ - Suggested version │
              │               └──────────┬──────────┘
              │                          │
              │                          ▼
              │               ┌─────────────────────┐
              │               │   STOP - Developer  │
              │               │   works on fix      │
              │               │   commits changes   │
              │               └─────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ HOTFIX COMPLETE                                                             │
└──────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │ /ez:hotfix complete │
                    │  <name> <version>   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ 3a. Validate State  │
                    │                     │
                    │ - On hotfix branch? │
                    │ - Clean git state?  │
                    │ - Branch name match?│
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
              ┌──────────┐         ┌──────────┐
              │ Invalid  │         │  Valid   │
              └────┬─────┘         └────┬─────┘
                   │                    │
                   ▼                    │
              ERROR: Details            │
              (wrong branch,            │
               dirty state)             │
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │ 3b. Merge to Main   │
                              │                     │
                              │ git checkout main   │
                              │ git merge --no-ff   │
                              │   hotfix/{name}     │
                              └──────────┬──────────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                              ▼                     ▼
                        ┌──────────┐         ┌──────────────┐
                        │ Success  │         │ Merge Conflict│
                        └────┬─────┘         └──────┬───────┘
                             │                      │
                             │                      ▼
                             │                 ERROR: "Merge conflict"
                             │                 → Manual resolution
                             │                 → git merge --abort
                             │
                             ▼
                              ┌─────────────────────┐
                              │ 3c. Tag Release     │
                              │                     │
                              │ git tag -a          │
                              │   v{version}        │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │ 3d. Merge to Develop│
                              │   (GitFlow)         │
                              │                     │
                              │ git checkout develop│
                              │ git merge --no-ff   │
                              │   hotfix/{name}     │
                              └──────────┬──────────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                              ▼                     ▼
                        ┌──────────┐         ┌──────────────┐
                        │ Success  │         │ Merge Conflict│
                        └────┬─────┘         └──────┬───────┘
                             │                      │
                             │                      ▼
                             │                 Resolve or skip
                             │                 (develop sync)
                             │
                             ▼
                              ┌─────────────────────┐
                              │ 3e. Delete Branch   │
                              │                     │
                              │ git branch -d       │
                              │   hotfix/{name}     │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │   COMPLETE ✅       │
                              └─────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ HOTFIX EDGE CASES                                                           │
└──────────────────────────────────────────────────────────────────────────────┘

  1. Hotfix diverged from main
     → Rebase onto latest main before merge
  
  2. Tests fail on hotfix branch
     → Block merge
     → Offer: Run tests / Skip / Abort
  
  3. Multiple version targets
     → Cherry-pick to other release branches
     → Tag each separately
  
  4. Develop branch stale (weeks behind)
     → Warn before merging
     → Offer: Update develop first / Skip develop
  
  5. Wrong base branch
     → Detect: Commits not in main
     → Warn: "Wrong base"
     → Offer: Rebase onto correct base
```

---

## 3. EXPORT/IMPORT SESSION WORKFLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SESSION EXPORT WORKFLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  Command: /ez:export-session [session_id] [format] [output_path]
  
  Defaults: session_id='last', format='markdown'


                    ┌─────────────────────┐
                    │  Parse Parameters   │
                    │ - session_id        │
                    │ - format            │
                    │ - output_path       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  2. Resolve Session │
                    │                     │
                    │ if session_id='last'│
                    │   getLastSession()  │
                    │ else                │
                    │   loadSession(id)   │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
              ┌──────────┐         ┌──────────┐
              │  null    │         │  valid   │
              └────┬─────┘         └────┬─────┘
                   │                    │
                   ▼                    │
              ERROR: "No sessions       │
              found"                    │
                   │                    │
                   │                    ▼
                   │          ┌─────────────────────┐
                   │          │ 3. Validate Format  │
                   │          │                     │
                   │          │ ['markdown','json'] │
                   │          └──────────┬──────────┘
                   │                     │
                   │          ┌──────────┴──────────┐
                   │          │                     │
                   │          ▼                     ▼
                   │    ┌──────────┐         ┌──────────┐
                   │    │  Valid   │         │ Invalid  │
                   │    └────┬─────┘         └────┬─────┘
                   │         │                    │
                   │         │                    ▼
                   │         │               ERROR: "Format must
                   │         │                      be markdown
                   │         │                      or json"
                   │         │
                   │         ▼
                   │    ┌─────────────────────┐
                   │    │ 4. Generate Path    │
                   │    │                     │
                   │    │ if !output_path:    │
                   │    │   .planning/sessions│
                   │    │   /export-{id}.{ext}│
                   │    └──────────┬──────────┘
                   │               │
                   │               ▼
                   │    ┌─────────────────────┐
                   │    │ 5. Export           │
                   │    │                     │
                   │    │ exporter.exportTo   │
                   │    │ File(session_id,    │
                   │    │   format, path)     │
                   │    └──────────┬──────────┘
                   │               │
                   │    ┌──────────┴──────────┐
                   │    │                     │
                   │    ▼                     ▼
                   │ ┌──────┐         ┌──────────────┐
                   │ │Error │         │   Success    │
                   │ └──┬───┘         └──────┬───────┘
                   │    │                    │
                   │    │                    ▼
                   │    │          ┌─────────────────────┐
                   │    │          │ 6. Verify Output    │
                   │    │          │                     │
                   │    │          │ - File exists?      │
                   │    │          │ - Size > 0?         │
                   │    │          └──────────┬──────────┘
                   │    │                     │
                   │    │          ┌──────────┴──────────┐
                   │    │          │                     │
                   │    │          ▼                     ▼
                   │    │    ┌──────────┐         ┌──────────┐
                   │    │    │  Fail    │         │  Pass    │
                   │    │    └────┬─────┘         └────┬─────┘
                   │    │         │                    │
                   │    │         │                    ▼
                   │    │         │          ┌─────────────────────┐
                   │    │         │          │ 7. Log Success      │
                   │    │         │          │ 8. Return Result    │
                   │    │         │          └─────────────────────┘
                   │    │         │
                   │    │         ▼
                   │    │    ERROR: "Export
                   │    │            failed"
                   │    │
                   │    │
                   ▼    ▼
              ERROR: "Session
              not found"


┌──────────────────────────────────────────────────────────────────────────────┐
│                    SESSION IMPORT WORKFLOW                                    │
└──────────────────────────────────────────────────────────────────────────────┘

  Command: /ez:import-session <file_path> [--model <source_model>]


                    ┌─────────────────────┐
                    │  Parse Parameters   │
                    │ - file_path (req)   │
                    │ - source_model (opt)│
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ 2. Validate Input   │
                    │                     │
                    │ - File exists?      │
                    │ - Is .json?         │
                    │ - Valid JSON?       │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
              ┌──────────┐         ┌──────────┐
              │ Invalid  │         │  Valid   │
              └────┬─────┘         └────┬─────┘
                   │                    │
                   ▼                    │
              ERROR: Details            │
              (not found,               │
               not json,                │
               malformed)               │
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │ 3. Import Session   │
                              │                     │
                              │ importer.import(    │
                              │   file_path,        │
                              │   options)          │
                              └──────────┬──────────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                              ▼                     ▼
                        ┌──────────┐         ┌──────────────┐
                        │  Error   │         │   Success    │
                        └────┬─────┘         └──────┬───────┘
                             │                      │
                             │                      ▼
                             │            ┌─────────────────────┐
                             │            │ 4. Validate Session │
                             │            │                     │
                             │            │ - Required fields   │
                             │            │ - session_chain     │
                             │            │ - Warnings for      │
                             │            │   missing links     │
                             │            └──────────┬──────────┘
                             │                       │
                             │                       ▼
                             │             ┌─────────────────────┐
                             │             │ 5. Store Session    │
                             │             │                     │
                             │             │ mgr.saveSession()   │
                             │             └──────────┬──────────┘
                             │                        │
                             │                        ▼
                             │             ┌─────────────────────┐
                             │             │ 6. Log & Return     │
                             │             └─────────────────────┘
                             │
                             ▼
                        ERROR: "Import
                        failed"
                        + validation errors
                        + suggested fix


┌──────────────────────────────────────────────────────────────────────────────┐
│ SESSION EXPORT/IMPORT EDGE CASES                                            │
└──────────────────────────────────────────────────────────────────────────────┘

  EXPORT:
  1. Session file locked by another process
     → Retry with exponential backoff (3 attempts)
     → Error: "Session locked, try again later"
  
  2. Output path not writable (permissions)
     → Detect before write
     → Suggest alternative: ~/exports/
  
  3. Session too large (>100MB)
     → Warn user
     → Offer compression
     → Offer split into chunks
  
  IMPORT:
  4. Version mismatch (v2 → v3)
     → Detect schema version
     → Run migration if available
     → Error if no migration path
  
  5. Circular import (A imports B, B imports A)
     → Track import chain
     → Detect cycle
     → Error: "Circular dependency detected"
  
  6. Missing linked sessions in chain
     → Warn: "Missing linked session: {id}"
     → Continue anyway (soft warning)
```

---

## 4. GATHER REQUIREMENTS WORKFLOW (`/ez:gather-requirements`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 GATHER REQUIREMENTS WORKFLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

  Command: /ez:gather-requirements [phase] [--auto]


                    ┌─────────────────────┐
                    │  1. Initialize      │
                    │  init plan-phase    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  2. Parse Arguments │
                    │  - Phase number     │
                    │  - --auto flag      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  3. Check Phase     │
                    │     Exists in       │
                    │     ROADMAP.md      │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
              ┌──────────┐         ┌──────────┐
              │ Not found│         │  Found   │
              └────┬─────┘         └────┬─────┘
                   │                    │
                   ▼                    │
              ERROR: "Phase does        │
              not exist in ROADMAP"     │
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │ 4. Check Existing   │
                              │    .feature Files   │
                              │                     │
                              │ ls specs/features/  │
                              │ find *.feature      │
                              └──────────┬──────────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                              ▼                     ▼
                        ┌──────────┐         ┌──────────┐
                        │  Exists  │         │   None   │
                        └────┬─────┘         └────┬─────┘
                             │                    │
                             │                    │
                             ▼                    │
                    ┌─────────────────┐           │
                    │ Check ACCEPTANCE│           │
                    │ -CRITERIA.md    │           │
                    └────────┬────────┘           │
                             │                    │
                             ▼                    │
                    ┌─────────────────────────────┘
                    │ Ask User:
                    │ 1. Regenerate (replace)
                    │ 2. Extend (append)
                    │ 3. View existing
                    │
                    │ [User selects option]
                    │
                    ▼
          ┌─────────────────────┐
          │ 5. Spawn            │
          │ ez-requirements-agent│
          │                     │
          │ Mode: interactive   │
          │       --auto        │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │ Agent reads:        │
          │ - STATE.md          │
          │ - ROADMAP.md        │
          │ - REQUIREMENTS.md   │
          │ - CONTEXT.md (opt)  │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │ Agent interviews    │
          │ user (interactive)  │
          │ or derives from     │
          │ context (--auto)    │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │ Produce:            │
          │ - .feature files    │
          │ - ACCEPTANCE-       │
          │   CRITERIA.md       │
          │ - INVEST validation │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │ Commit artifacts    │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │ COMPLETE ✅         │
          └─────────────────────┘
```

---

## 5. ARCH REVIEW WORKFLOW (`/ez:arch-review`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ARCH REVIEW WORKFLOW                                     │
└─────────────────────────────────────────────────────────────────────────────┘

  Command: /ez:arch-review [phase]


                    ┌─────────────────────┐
                    │  1. Initialize      │
                    │  init plan-phase    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  2. Validate        │
                    │  - Phase dir exists │
                    │  - PLAN.md files    │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
              ┌──────────┐         ┌──────────┐
              │ No plans │         │  Valid   │
              └────┬─────┘         └────┬─────┘
                   │                    │
                   ▼                    │
              ERROR: "No plans          │
              found. Run /ez:plan-      │
              phase first"              │
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │ 3. Spawn Tech Lead  │
                              │    Review Agent     │
                              │                     │
                              │ Task(prompt=        │
                              │   "Review arch of   │
                              │   Phase {N}",       │
                              │   subagent_type=    │
                              │   "ez-tech-lead",   │
                              │   model={planner})  │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │ Agent reads:        │
                              │ - All PLAN.md files │
                              │                     │
                              │ Agent checks:       │
                              │ - Pattern drift     │
                              │ - Technical debt    │
                              │ - Security issues   │
                              │ - Design conflicts  │
                              │ - Dependencies      │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │ 4. Present Results  │
                              │                     │
                              │ BLOCKERS (must fix) │
                              │ WARNINGS (should)   │
                              │ ADVISORY (consider) │
                              └──────────┬──────────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                              ▼                     ▼
                        ┌──────────┐         ┌──────────┐
                        │BLOCKER   │         │ APPROVED │
                        │  found   │         │          │
                        └────┬─────┘         └────┬─────┘
                             │                    │
                             ▼                    │
                        Highlight: "Fix           │
                        before /ez:execute-       │
                        phase"                    │
                                                  │
                                                  ▼
                                            Confirm: "Safe to
                                            execute phase"
```

---

## 6. STANDUP WORKFLOW (`/ez:standup`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STANDUP WORKFLOW                                         │
└─────────────────────────────────────────────────────────────────────────────┘

  Command: /ez:standup [phase]


                    ┌─────────────────────┐
                    │  1. Initialize      │
                    │  init progress      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  2. Gather Data     │
                    │                     │
                    │ - state-snapshot    │
                    │ - roadmap analyze   │
                    │ - progress bar      │
                    │ - Recent SUMMARY.md │
                    │   (3-5 files)       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  3. Calculate       │
                    │     Sprint Health   │
                    │                     │
                    │ Score 0-100:        │
                    │ - Velocity: 30pts   │
                    │ - Blockers: 30pts   │
                    │ - Requirements: 20pt│
                    │ - Deviation: 20pts  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  4. Generate Report │
                    │                     │
                    │ ## Daily Standup    │
                    │                     │
                    │ ### Yesterday       │
                    │ {SUMMARY.md one     │
                    │  liners}            │
                    │                     │
                    │ ### Today (Planned) │
                    │ {next phase/plans}  │
                    │                     │
                    │ ### Blockers        │
                    │ {from STATE.md}     │
                    │                     │
                    │ ### Velocity Trend  │
                    │ {completion rate}   │
                    │                     │
                    │ Sprint Health:      │
                    │ {score}/100         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Status Thresholds: │
                    │                     │
                    │ 80-100: HEALTHY     │
                    │ 60-79:  FRICTION    │
                    │ 40-59:  STRUGGLING  │
                    │ <40:    AT RISK     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Display Report     │
                    └─────────────────────┘
```

---

## 7. WORKFLOW RELATIONSHIP MAP

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EZ AGENTS WORKFLOW ECOSYSTEM                             │
└─────────────────────────────────────────────────────────────────────────────┘


  PROJECT INITIALIZATION
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │  /ez:new-project ──► /ez:plan-phase ──► /ez:execute-phase              │
  │       │                    │                       │                    │
  │       │                    │                       │                    │
  │       ▼                    ▼                       ▼                    │
  │  Creates:            Creates:              Executes:                     │
  │  - PROJECT.md        - PLAN.md             - Tasks in loop               │
  │  - ROADMAP.md        - Tasks               - Produces code               │
  │  - config.json       - Estimates           - Creates .feature            │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  MILESTONE/PHASE EXECUTION
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │  /ez:autonomous ──► Loops through all phases                           │
  │       │                                                               │
  │       ├──► /ez:discuss-phase (or smart_discuss)                       │
  │       ├──► /ez:plan-phase                                             │
  │       ├──► /ez:execute-phase (task loop)                              │
  │       │                                                                │
  │       └──► Verification ──► Lifecycle                                  │
  │              │                    │                                    │
  │              │                    ├──► /ez:audit-milestone            │
  │              │                    ├──► /ez:complete-milestone         │
  │              │                    └──► /ez:cleanup                    │
  │              │                                                           │
  │              ▼                                                           │
  │         VERIFICATION.md                                                   │
  │         - passed                                                          │
  │         - human_needed                                                    │
  │         - gaps_found                                                      │
  │                                                                           │
  └─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  QUALITY & VERIFICATION
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │  /ez:gather-requirements ──► .feature files                            │
  │       │                                                               │
  │       ▼                                                               │
  │  /ez:arch-review ──► BLOCKER/WARNING/ADVISORY                         │
  │       │                                                               │
  │       ▼                                                               │
  │  /ez:progress ──► Sprint health score                                 │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  RELEASE & MAINTENANCE
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │  /ez:release ──► Tier-based release                                   │
  │       │                                                                 │
  │       ├──► [auto] verify-work (medium+)                                │
  │       ├──► [auto] audit-milestone (enterprise)                         │
  │       ├──► [auto] arch-review (enterprise)                             │
  │       │                                                                 │
  │       ▼                                                                 │
  │  Security gates → Checklist → Branch → Changelog → Tag                 │
  │                                                                         │
  │  /ez:hotfix start ──► Developer fixes ──► /ez:hotfix complete          │
  │       │                                              │                  │
  │       ▼                                              ▼                  │
  │  Create hotfix branch                         Merge to main             │
  │                                               Tag release               │
  │                                               Merge to develop          │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  SESSION MANAGEMENT
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │  /ez:export-session ──► Export to markdown/JSON                       │
  │       │                                                               │
  │       ▼                                                               │
  │  /ez:import-session ──► Import from JSON                              │
  │       │                                                               │
  │       ▼                                                               │
  │  /ez:resume-session ──► Continue from checkpoint                      │
  │       │                                                               │
  │       ▼                                                               │
  │  /ez:list-sessions ──► Show session history                           │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  DAILY OPERATIONS
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │  /ez:standup ──► Yesterday/Today/Blockers/Health                       │
  │       │                                                                 │
  │       ▼                                                                 │
  │  /ez:progress ──► Progress bar + velocity                              │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
```
