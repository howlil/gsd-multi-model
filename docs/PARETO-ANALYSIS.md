# EZ Agents - Pareto Analysis (80/20 Rule)

> **Prinsip Pareto:** 20% command akan memberikan 80% value. Fokus pada yang penting, abaikan yang jarang dipakai.

---

## 📊 COMMAND FREQUENCY ANALYSIS

### 🔥 THE VITAL 20% (Gunakan 80% waktu)

| Rank | Command | Frequency | Kapan Dipakai |
|------|---------|-----------|---------------|
| 1 | `/ez:autonomous` | 35% | Jalankan semua phase otomatis |
| 2 | `/ez:execute-phase` | 25% | Execute task individual |
| 3 | `/ez:new-project` | 10% | Start project baru |
| 4 | `/ez:plan-phase` | 10% | Plan phase sebelum execute |

**Total: 80% usage**

---

### ⚡ THE USEFUL 30% (Gunakan 15% waktu)

| Rank | Command | Frequency | Kapan Dipakai |
|------|---------|-----------|---------------|
| 5 | `/ez:standup` | 8% | Daily check-in |
| 6 | `/ez:progress` | 5% | Cek progress visual |
| 7 | `/ez:release` | 2% | Release production |

**Total: 15% usage**

---

### 🐢 THE TRIVIAL 50% (Gunakan 5% waktu)

| Rank | Command | Frequency | Kapan Dipakai |
|------|---------|-----------|---------------|
| 8 | `/ez:hotfix` | 2% | Emergency production bug |
| 9 | `/ez:arch-review` | 1% | Review arsitektur phase besar |
| 10 | `/ez:gather-requirements` | 1% | Complex phase requirements |
| 11 | `/ez:export-session` | 0.5% | Handoff / backup |
| 12 | `/ez:import-session` | 0.3% | Import dari handoff |
| 13 | `/ez:resume-session` | 0.2% | Resume session terputus |
| 14 | `/ez:list-sessions` | <0.1% | List session history |

**Total: 5% usage**

---

## 🎯 PARETO BREAKDOWN

```
┌─────────────────────────────────────────────────────────────────┐
│                    EZ AGENTS PARETO CHART                       │
└─────────────────────────────────────────────────────────────────┘

 100% │                                        ░░░░░░░░░░░░░░░░░░░
      │                                        ░  THE TRIVIAL 50% ░
  80% │████████████████████████████████████████░  (5% usage)      ░
      │████████████████████████████████████████░░░░░░░░░░░░░░░░░░░
      │████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
      │████░  THE USEFUL 30%  ░░░░░░░░░░░░░░░░░░
  60% │████░  (15% usage)     ░░░░░░░░░░░░░░░░░░
      │████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
      │████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
      │████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  40% │████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
      │████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
      │████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
      │████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  20% │████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
      │████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
      │████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
      │████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
   0% └─────────────────────────────────────────┘
         ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
         THE VITAL 20%
         (80% usage)
         
         █ = High frequency
         ░ = Low frequency
```

---

## ✅ COMMAND YANG SERING DIPAKAI (FOKUS DISINI)

### 1. `/ez:autonomous` — 35% usage

**Kenapa sering:**
- Satu command jalankan SEMUA phase
- Default mode untuk production work
- Loop otomatis: discuss → plan → execute → verify

**Kapan dipakai:**
```bash
# Setelah semua phase di-plan
/ez:autonomous

# Resume dari phase tertentu
/ez:autonomous --from 3
```

**Kapan TIDAK dipakai:**
- Project baru pertama kali (plan dulu)
- Mau kontrol manual per task
- Debugging issue spesifik

---

### 2. `/ez:execute-phase` — 25% usage

**Kenapa sering:**
- Execute task individual dalam mode manual
- Granular control per task
- Learning & debugging

**Kapan dipakai:**
```bash
# Execute task 1 dari phase 1
/ez:execute-phase 1 --plan 1

# Execute task 2 dari phase 1
/ez:execute-phase 1 --plan 2
```

**Kapan TIDAK dipakai:**
- Mode autonomous (auto execute semua)
- Phase belum di-plan

---

### 3. `/ez:new-project` — 10% usage

**Kenapa 10%:**
- Hanya sekali per project
- Tapi CRITICAL — tanpa ini tidak bisa mulai

**Kapan dipakai:**
```bash
# Project baru dari nol
/ez:new-project
```

**Kapan TIDAK dipakai:**
- Project sudah ada ROADMAP.md
- Lanjut project existing

---

### 4. `/ez:plan-phase` — 10% usage

**Kenapa 10%:**
- Sekali per phase (biasanya 5-10 phase per project)
- Required sebelum execute

**Kapan dipakai:**
```bash
# Plan phase 1
/ez:plan-phase 1

# Plan phase 2 setelah phase 1 complete
/ez:plan-phase 2
```

**Kapan TIDAK dipakai:**
- Phase sudah ada PLAN.md
- Mode autonomous (auto-plan)

---

## ⚠️ COMMAND YANG JARANG DIPAKAI (TAU SAJA)

### 5. `/ez:standup` — 8% usage

**Kenapa jarang:**
- Hanya untuk daily check-in
- Bisa diganti dengan baca STATE.md manual

**Kapan dipakai:**
```bash
# Setiap hari sebelum coding
/ez:standup
```

**Kapan TIDAK dipakai:**
- Solo project (tidak perlu report)
- Sprint pendek (<1 minggu)

---

### 6. `/ez:progress` — 5% usage

**Kenapa jarang:**
- Progress sudah terlihat di autonomous mode
- Hanya untuk visual check

**Kapan dipakai:**
```bash
# Mau lihat progress bar
/ez:progress
```

**Kapan TIDAK dipakai:**
- Autonomous mode (progress auto-displayed)
- Phase tunggal

---

### 7. `/ez:release` — 2% usage

**Kenapa jarang:**
- Hanya di END of milestone/project
- Mungkin sekali per bulan/quarter

**Kapan dipakai:**
```bash
# Release production
/ez:release mvp v1.0.0
```

**Kapan TIDAK dipakai:**
- Masih development
- Internal project tidak release

---

### 8. `/ez:hotfix` — 2% usage

**Kenapa jarang:**
- HANYA untuk production bug emergency
- Semoga tidak sering terjadi!

**Kapan dipakai:**
```bash
# Production bug ditemukan
/ez:hotfix start gmail-login-fix

# Setelah fix complete
/ez:hotfix complete gmail-login-fix v1.0.1
```

**Kapan TIDAK dipakai:**
- Feature development (pakai normal phase)
- Bug di development (fix langsung)

---

### 9. `/ez:arch-review` — 1% usage

**Kenapa jarang:**
- Hanya untuk phase COMPLEX/CRITICAL
- Phase simple tidak perlu review

**Kapan dipakai:**
```bash
# Phase 5: Database architecture (complex)
/ez:arch-review 5

# Phase 3: Security implementation (critical)
/ez:arch-review 3
```

**Kapan TIDAK dipakai:**
- Phase simple (UI tweaks, refactors)
- MVP / prototype

---

### 10. `/ez:gather-requirements` — 1% usage

**Kenapa jarang:**
- Requirements sudah di-gather di `/ez:new-project`
- Hanya untuk phase yang VERY complex

**Kapan dipakai:**
```bash
# Phase 4: User management (complex BDD needs)
/ez:gather-requirements 4
```

**Kapan TIDAK dipakai:**
- Requirements sudah clear
- Phase technical (infrastructure, refactors)

---

### 11-14. Session Management — <1% usage

**Kenapa sangat jarang:**
- Hanya untuk team collaboration
- Solo developer hampir tidak pernah pakai

| Command | Kapan Dipakai |
|---------|---------------|
| `/ez:export-session` | Handoff ke team member |
| `/ez:import-session` | Terima handoff dari team |
| `/ez:resume-session` | Session terputus (crash) |
| `/ez:list-sessions` | Audit session history |

---

## 📋 MINIMAL WORKFLOW (Pareto Optimized)

### Untuk SOLO DEVELOPER (90% project)

```bash
# 1. Initialize
/ez:new-project

# 2. Plan first phase
/ez:plan-phase 1

# 3. Run autonomous (execute ALL phases)
/ez:autonomous

# 4. Release
/ez:release mvp v1.0.0
```

**Total: 4 commands** — Ini yang perlu dihafal!

---

### Untuk TEAM (8% project)

```bash
# 1-4. Same as solo

# 5. Handoff
/ez:export-session

# 6. Team member import
/ez:import-session export.json

# 7. Daily sync
/ez:standup
```

**Total: 7 commands**

---

### Untuk ENTERPRISE (2% project)

```bash
# 1-4. Same as solo

# 5. Arch review untuk critical phases
/ez:arch-review 3
/ez:arch-review 5

# 6. Gather requirements untuk complex phases
/ez:gather-requirements 4

# 7. Enterprise release
/ez:release enterprise v2.0.0

# 8. Hotfix (jika ada production bug)
/ez:hotfix start critical-bug
/ez:hotfix complete critical-bug v2.0.1
```

**Total: 10-12 commands**

---

## 🎯 REKOMENDASI

### Untuk PEMULA

**Hafalkan 4 command ini dulu:**

```bash
/ez:new-project       # Start
/ez:plan-phase 1      # Plan
/ez:autonomous        # Execute all
/ez:release mvp v1.0.0 # Release
```

**Ignore dulu:**
- `/ez:standup`
- `/ez:progress`
- `/ez:arch-review`
- `/ez:gather-requirements`
- `/ez:export-session`
- `/ez:import-session`
- `/ez:hotfix`

---

### Untuk INTERMEDIATE

**Tambahkan:**

```bash
/ez:standup           # Daily check
/ez:progress          # Visual progress
/ez:execute-phase N --plan M  # Manual control
```

---

### Untuk ADVANCED / TEAM LEAD

**Tambahkan:**

```bash
/ez:arch-review N          # Critical phase review
/ez:gather-requirements N  # Complex requirements
/ez:export-session         # Team handoff
/ez:hotfix start/complete  # Emergency fixes
```

---

## 📊 DECISION MATRIX

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMMAND DECISION MATRIX                      │
└─────────────────────────────────────────────────────────────────┘

                    │ Solo  │ Team  │Enterprise│  PRIORITY
────────────────────┼───────┼───────┼──────────┼────────────
/ez:autonomous      │  ✅   │  ✅   │    ✅    │  MUST KNOW
/ez:execute-phase   │  ✅   │  ✅   │    ✅    │  MUST KNOW
/ez:new-project     │  ✅   │  ✅   │    ✅    │  MUST KNOW
/ez:plan-phase      │  ✅   │  ✅   │    ✅    │  MUST KNOW
/ez:release         │  ✅   │  ✅   │    ✅    │  MUST KNOW
────────────────────┼───────┼───────┼──────────┼────────────
/ez:standup         │  ⚪   │  ✅   │    ✅    │  NICE TO HAVE
/ez:progress        │  ⚪   │  ✅   │    ✅    │  NICE TO HAVE
/ez:export-session  │  ⚪   │  ✅   │    ✅    │  TEAM ONLY
/ez:import-session  │  ⚪   │  ✅   │    ✅    │  TEAM ONLY
────────────────────┼───────┼───────┼──────────┼────────────
/ez:arch-review     │  ⚪   │  ⚪   │    ✅    │  ENTERPRISE
/ez:gather-reqs     │  ⚪   │  ⚪   │    ✅    │  ENTERPRISE
/ez:hotfix          │  ⚪   │  ⚪   │    ✅    │  EMERGENCY
────────────────────┼───────┼───────┼──────────┼────────────

✅ = Use regularly
⚪ = Use rarely / never
```

---

## 🧠 MENTAL MODEL

```
┌─────────────────────────────────────────────────────────────────┐
│                    EZ AGENTS LEARNING CURVE                     │
└─────────────────────────────────────────────────────────────────┘

 Week 1: Learn the VITAL 20%
 ┌─────────────────────────────────────┐
 │ /ez:new-project                     │
 │ /ez:plan-phase                      │
 │ /ez:autonomous                      │
 │ /ez:execute-phase                   │
 │ /ez:release                         │
 └─────────────────────────────────────┘
         │
         ▼ 80% value achieved
         
 Week 2-4: Add USEFUL 30% (as needed)
 ┌─────────────────────────────────────┐
 │ /ez:standup      (if daily sync)    │
 │ /ez:progress     (if visual needed) │
 └─────────────────────────────────────┘
         │
         ▼ 95% value achieved
         
 Month 2+: Learn TRIVIAL 50% (rare cases)
 ┌─────────────────────────────────────┐
 │ /ez:arch-review  (critical phases)  │
 │ /ez:gather-reqs  (complex reqs)     │
 │ /ez:hotfix       (emergencies)      │
 │ /ez:export/import (team handoff)    │
 └─────────────────────────────────────┘
         │
         ▼ 100% mastery
```

---

## 💡 KEY INSIGHTS

### 1. **Autonomous Mode adalah Game Changer**

```
35% usage = /ez:autonomous

Kenapa? Karena:
- Satu command = semua phase
- Tidak perlu manual execute
- Auto handle verification
- Auto handle lifecycle
```

### 2. **Session Management = Overhead untuk Solo Dev**

```
<1% usage = export/import/resume

Kenapa?
- Solo dev: tidak perlu handoff
- Session auto-saved
- Resume automatic
```

### 3. **Hotfix = Semoga Tidak Dipakai**

```
2% usage = /ez:hotfix

Jika sering pakai hotfix:
→ Problem di development workflow
→ Tidak cukup testing
→ Release terlalu cepat
```

### 4. **Arch Review & Gather Requirements = Optional**

```
1-2% usage = arch-review + gather-requirements

Pakai HANYA jika:
- Phase sangat complex
- Requirements ambiguous
- Critical for security/stability
```

---

## 🎓 FINAL RECOMMENDATION

### Untuk 95% Developer (Solo / Small Team)

**Hafalkan 5 command:**

```bash
/ez:new-project
/ez:plan-phase 1
/ez:autonomous
/ez:release mvp v1.0.0
/ez:help              # Kalau lupa
```

**Ignore everything else** — pelajari kalau benar-benar butuh.

---

### Untuk 5% Developer (Enterprise / Regulated)

**Tambahkan:**

```bash
/ez:arch-review
/ez:gather-requirements
/ez:hotfix
```

**Session management** — hanya jika team > 3 orang.

---

**Remember:** More commands ≠ More productive. Focus on the vital 20%.

---

**Last Updated:** March 2026  
**Version:** EZ Agents v3.5.0
