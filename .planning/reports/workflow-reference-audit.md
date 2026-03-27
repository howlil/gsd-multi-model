# Workflow Reference Audit Report

**Date:** 2026-03-27
**Audit:** Command Reference Validation
**Status:** ❌ **21 BROKEN REFERENCES FOUND**

---

## 🔴 Critical Issue: `/ez:research-phase` References

**Command Status:** ❌ **DELETED** (not in `commands/ez/` directory)

**References Found:** 21 occurrences across codebase

---

## 📋 Broken References by File

### **agents/ (2 references)**

| File | Line | Reference | Context |
|------|------|-----------|---------|
| `ez-planner.md` | 130 | `/ez:research-phase` | Suggests for niche domains |
| `ez-planner.md` | 1061 | `*-RESEARCH.md` | References research output |
| `ez-phase-researcher.md` | 17 | `/ez:research-phase` | Spawned by reference |

### **ez-agents/workflows/ (3 references)**

| File | Line | Reference | Context |
|------|------|-----------|---------|
| `transition.md` | 418 | `/ez:research-phase [X+1]` | Next step suggestion |
| `transition.md` | 443 | `/ez:research-phase [X+1]` | Next step suggestion |
| `resume-project.md` | 241 | `/ez:research-phase [N]` | Next step suggestion |

### **ez-agents/templates/ (6 references)**

| File | Line | Reference | Context |
|------|------|-----------|---------|
| `research-project/SUMMARY.md` | 100 | `research-phase` | Phase documentation |
| `discovery.md` | 7 | `/ez:research-phase` | Alternative suggestion |
| `discovery.md` | 145 | `/ez:research-phase` | Recommendation |
| `codebase/structure.md` | 169 | `research-phase.md` | Workflow reference |

### **ez-agents/references/ (3 references)**

| File | Line | Reference | Context |
|------|------|-----------|---------|
| `continuation-format.md` | 102 | `/ez:research-phase 2` | Example command |
| `continuation-format.md` | 131 | `/ez:research-phase 3` | Example command |
| `continuation-format.md` | 152 | `/ez:research-phase 3` | Recommendation |

### **CHANGELOG.md (7 references)**

Historical references (acceptable - historical record):
- Line 1056, 1165, 1255, 1261, 1326, 1905, 1917

---

## ✅ Valid Commands (Currently in `commands/ez/`)

```
add-tests.md              ✅ EXISTS
audit-milestone.md        ✅ EXISTS
complete-milestone.md     ✅ EXISTS
discuss-phase.md          ✅ EXISTS
execute-phase.md          ✅ EXISTS
help.md                   ✅ EXISTS
map-codebase.md           ✅ EXISTS
new-milestone.md          ✅ EXISTS
new-project.md            ✅ EXISTS
plan-phase.md             ✅ EXISTS
progress.md               ✅ EXISTS
quick.md                  ✅ EXISTS
resume-work.md            ✅ EXISTS
run-phase.md              ✅ EXISTS
settings.md               ✅ EXISTS
update.md                 ✅ EXISTS
verify-work.md            ✅ EXISTS
```

**Total:** 17 valid commands

---

## 🔧 Required Fixes

### **Priority 1: Agent Files (2 fixes)**

**File:** `agents/ez-planner.md`
- Line 130: Change `/ez:research-phase` → `/ez:discuss-phase` (for niche domains)
- Line 1061: Update comment (research still exists via integrated research)

**File:** `agents/ez-phase-researcher.md`
- Line 17: Change `/ez:research-phase` → `/ez:discuss-phase` (standalone mode)

---

### **Priority 2: Workflow Files (3 fixes)**

**File:** `ez-agents/workflows/transition.md`
- Lines 418, 443: Change `/ez:research-phase [X+1]` → `/ez:discuss-phase [X+1]`

**File:** `ez-agents/workflows/resume-project.md`
- Line 241: Change `/ez:research-phase [N]` → `/ez:discuss-phase [N]`

---

### **Priority 3: Template Files (6 fixes)**

**File:** `ez-agents/templates/research-project/SUMMARY.md`
- Line 100: Update reference (research is now integrated)

**File:** `ez-agents/templates/discovery.md`
- Lines 7, 145: Change `/ez:research-phase` → `/ez:discuss-phase`

**File:** `ez-agents/templates/codebase/structure.md`
- Line 169: Update workflow reference

**File:** `ez-agents/references/continuation-format.md`
- Lines 102, 131, 152: Change examples to `/ez:discuss-phase`

---

### **Priority 4: CHANGELOG.md (No action needed)**

Historical references are acceptable (historical record).

---

## 📊 Summary

| Category | Broken References | Action Required |
|----------|------------------|-----------------|
| **agents/** | 2 | ✅ Fix required |
| **workflows/** | 3 | ✅ Fix required |
| **templates/** | 6 | ✅ Fix required |
| **references/** | 3 | ✅ Fix required |
| **CHANGELOG.md** | 7 | ⚠️ Historical (no action) |
| **TOTAL** | **21** | **14 fixes needed** |

---

## ✅ Commands That DO Exist

All workflow references should point to these valid commands:

```bash
/ez:add-tests
/ez:audit-milestone
/ez:complete-milestone
/ez:discuss-phase        ← Use this instead of /ez:research-phase
/ez:execute-phase
/ez:help
/ez:map-codebase
/ez:new-milestone
/ez:new-project
/ez:plan-phase
/ez:progress
/ez:quick
/ez:resume-work
/ez:run-phase
/ez:settings
/ez:update
/ez:verify-work
```

---

## 🎯 Recommendation

**Replace all `/ez:research-phase` references with `/ez:discuss-phase`:**

**Rationale:**
- `discuss-phase` is the current command for domain investigation
- Research is now **integrated** into `plan-phase` (not standalone)
- `discuss-phase` produces `CONTEXT.md` (same as old `research-phase` produced `RESEARCH.md`)

**Migration:**
```
Old: /ez:research-phase [N]
New: /ez:discuss-phase [N]
```

---

*Audit completed: 2026-03-27*
*Status: Ready for fixes*
