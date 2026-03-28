# Metrics Schema Reference

Schema for `.planning/metrics.json` — the EZ Agents success metrics store.

## Full Schema

```json
{
  "schema_version": "2.0",
  "project": "project-name",
  "updated": "2026-03-28T00:00:00Z",

  "phase_metrics": [
    {
      "phase": 18,
      "phase_name": "session-memory",
      "plans_total": 4,
      "plans_completed": 4,
      "velocity_min": 24,
      "defect_density": 0.12,
      "bdd_pass_rate": 0.84,
      "bdd_must_passing": 8,
      "bdd_must_total": 9,
      "deviation_count": 2,
      "completed_at": "2026-03-19T00:00:00Z"
    }
  ],

  "project_metrics": {
    "requirements_coverage_pct": 78,
    "test_coverage_pct": 74,
    "bdd_scenarios_total": 60,
    "bdd_scenarios_passing": 45,
    "bdd_scenarios_must": 25,
    "bdd_scenarios_must_passing": 24
  },

  "agent_metrics": {
    "total_token_cost_usd": 18.40,
    "avg_cost_per_plan": 0.27,
    "deviation_rate": 0.15,
    "avg_plans_per_phase": 3.2,
    "avg_velocity_min_per_plan": 22
  },

  "business_metrics": {
    "time_to_first_ship_days": 95,
    "hotfixes_deployed": 0,
    "milestones_shipped": 1,
    "current_tier": "medium",
    "phases_total": 29,
    "phases_completed": 18
  },

  "product_metrics": {
    "north_star": {
      "name": "Weekly Active Teams",
      "definition": "Teams with 3+ members who complete 5+ tasks/week",
      "current": 45,
      "target": 100,
      "timeline": "Q2 2026"
    },
    "heart_metrics": {
      "happiness": {
        "metric": "NPS",
        "current": 35,
        "target": 50,
        "measurement": "In-app survey"
      },
      "engagement": {
        "metric": "DAU/MAU",
        "current": 0.28,
        "target": 0.40,
        "measurement": "Analytics"
      },
      "adoption": {
        "metric": "Signups per week",
        "current": 45,
        "target": 100,
        "measurement": "Analytics"
      },
      "retention": {
        "metric": "D7 Retention",
        "current": 0.42,
        "target": 0.60,
        "measurement": "Cohort analysis"
      },
      "task_success": {
        "metric": "Task Completion Rate",
        "current": 0.78,
        "target": 0.95,
        "measurement": "Funnel analysis"
      }
    },
    "feature_adoption": [
      {
        "feature": "Social Login",
        "adoption_rate": 0.35,
        "target": 0.60,
        "launched": "2026-02-15"
      }
    ],
    "okrs": {
      "objective": "Achieve product-market fit for team collaboration",
      "key_results": [
        {"kr": "Weekly Active Teams from 45 to 100", "current": 45, "target": 100, "progress": 0.45},
        {"kr": "D7 Retention from 42% to 60%", "current": 0.42, "target": 0.60, "progress": 0.35},
        {"kr": "NPS from 35 to 50", "current": 35, "target": 50, "progress": 0.33}
      ],
      "confidence": 0.65,
      "quarter": "Q2 2026"
    }
  },

  "speed_metrics": {
    "lead_time_minutes": {
      "description": "First commit → Production",
      "target": "< 60 minutes",
      "current": 45,
      "trend": "improving"
    },
    "cycle_time_hours": {
      "description": "Start coding → Done",
      "target": "< 24 hours",
      "current": 18,
      "trend": "stable"
    },
    "deployment_frequency_per_day": {
      "description": "Deploys per day",
      "target": "On-demand",
      "current": 3.5,
      "trend": "improving"
    }
  },

  "quality_metrics": {
    "code_review_coverage_pct": {
      "description": "PRs with review / Total PRs",
      "target": "100%",
      "current": 85,
      "trend": "stable"
    },
    "review_depth_avg_comments": {
      "description": "Avg comments per PR",
      "target": "> 3",
      "current": 4.2,
      "trend": "improving"
    },
    "defect_density_per_kloc": {
      "description": "Bugs per 1000 lines",
      "target": "< 1.0",
      "current": 0.8,
      "trend": "improving"
    }
  },

  "maintainability_metrics": {
    "code_churn_pct_14d": {
      "description": "Changed lines / Total lines in 14 days",
      "target": "< 20%",
      "current": 15,
      "trend": "stable",
      "risk_level": "LOW"
    },
    "tech_debt_ratio_pct": {
      "description": "Hours fixing debt / Total hours",
      "target": "< 10%",
      "current": 8,
      "trend": "improving"
    },
    "debt_markers_count": {
      "description": "TODO/FIXME/HACK comments",
      "target": "< 50",
      "current": 23,
      "trend": "improving"
    },
    "debt_age_days_avg": {
      "description": "Avg age of debt markers",
      "target": "< 30 days",
      "current": 18,
      "trend": "stable"
    },
    "cyclomatic_complexity_avg": {
      "description": "Avg complexity per function",
      "target": "< 10",
      "current": 7.5,
      "trend": "stable"
    }
  }
}
```

## Field Definitions

### phase_metrics[]

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `phase` | int | ez-executor | Phase number |
| `plans_total` | int | ez-executor | Plans in phase |
| `plans_completed` | int | ez-executor | Plans with SUMMARY.md |
| `velocity_min` | int | ez-executor | Minutes from first to last commit in phase |
| `defect_density` | float | ez-executor | Deviations / tasks executed |
| `bdd_pass_rate` | float | ez-verifier | @must scenarios passing / total @must |
| `deviation_count` | int | ez-executor | Auto-fix deviations logged |

### project_metrics

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `requirements_coverage_pct` | int | ez-executor | % of REQUIREMENTS.md checked off |
| `test_coverage_pct` | int | ez-verifier | From coverage tool output |
| `bdd_scenarios_passing` | int | ez-verifier | Scenarios with green status |

### agent_metrics

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `total_token_cost_usd` | float | metrics-tracker | Accumulated from state.record-metric |
| `avg_cost_per_plan` | float | metrics-tracker | total / plans_completed |
| `deviation_rate` | float | metrics-tracker | total_deviations / total_tasks |

### business_metrics

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `time_to_first_ship_days` | int | ez-release-agent | Days from project init to first release |
| `hotfixes_deployed` | int | ez-release-agent | Hotfixes tagged and pushed |
| `current_tier` | string | tier-manager | mvp / medium / enterprise |

### speed_metrics (NEW - 10x Engineer Standards)

| Field | Type | Source | Description | Target |
|-------|------|--------|-------------|--------|
| `lead_time_minutes` | int | ez-executor | First commit → Production | < 60 min |
| `cycle_time_hours` | int | ez-executor | Start coding → Done | < 24 hours |
| `deployment_frequency_per_day` | float | ez-release-agent | Deploys per day | On-demand |

**Why these matter (DORA 2025 research):**
- Lead Time < 60 min = Elite performer
- Cycle Time < 24 hours = Fast iteration
- Deployment Frequency = Ability to ship on-demand

### quality_metrics (NEW - 10x Engineer Standards)

| Field | Type | Source | Description | Target |
|-------|------|--------|-------------|--------|
| `code_review_coverage_pct` | int | ez-verifier | PRs reviewed / Total PRs | 100% |
| `review_depth_avg_comments` | float | ez-verifier | Avg comments per PR | > 3 |
| `defect_density_per_kloc` | float | ez-executor | Bugs per 1000 lines | < 1.0 |

**Why these matter (Google SWE standards):**
- Code Review 100% = No code without review
- Review Depth > 3 = Meaningful reviews, not rubber-stamp
- Defect Density < 1.0 = High quality code

### maintainability_metrics (NEW - 10x Engineer Standards)

| Field | Type | Source | Description | Target |
|-------|------|--------|-------------|--------|
| `code_churn_pct_14d` | int | CodeChurnAnalyzer | Changed lines / Total in 14d | < 20% |
| `tech_debt_ratio_pct` | float | TechDebtAnalyzer | Debt hours / Total hours | < 10% |
| `debt_markers_count` | int | TechDebtAnalyzer | TODO/FIXME/HACK count | < 50 |
| `debt_age_days_avg` | int | TechDebtAnalyzer | Avg age of debt | < 30 days |
| `cyclomatic_complexity_avg` | float | CodeComplexityAnalyzer | Avg complexity per function | < 10 |

**Why these matter (Clean Code / Code Complete):**
- Code Churn < 20% = Stable code, high churn = 2x bug risk
- Tech Debt < 10% = Sustainable pace
- Debt Age < 30 days = Debt addressed quickly
- Complexity < 10 = Maintainable functions

## Capture Points

| Metric | When Captured | Who Captures |
|--------|---------------|--------------|
| velocity_min | After SUMMARY.md created | ez-executor (state record-metric) |
| deviation_count | During execution | ez-executor (per deviation Rule 1-3) |
| defect_density | After plan completes | ez-executor (computed) |
| bdd_pass_rate | After VERIFICATION.md | ez-verifier (metrics record-bdd) |
| test_coverage_pct | After verification | ez-verifier (from coverage tool) |
| requirements_coverage_pct | After mark-complete | ez-executor (computed from REQUIREMENTS.md) |
| total_token_cost_usd | Ongoing | ez-executor (from state.record-metric cost field) |
| hotfixes_deployed | After hotfix tag | ez-release-agent |
| **lead_time_minutes** | After deployment | **ez-executor (NEW)** |
| **cycle_time_hours** | After task complete | **ez-executor (NEW)** |
| **deployment_frequency** | After each deploy | **ez-release-agent (NEW)** |
| **code_review_coverage** | After PR merge | **ez-verifier (NEW)** |
| **code_churn_pct** | Every 14 days | **CodeChurnAnalyzer (NEW)** |
| **tech_debt_ratio** | After each phase | **TechDebtAnalyzer (enhanced)** |
| **debt_markers_count** | After each phase | **TechDebtAnalyzer (enhanced)** |
| **cyclomatic_complexity** | After execution | **CodeComplexityAnalyzer (existing)** |

## Dashboard Output

```
/ez:stats  →  enhanced dashboard

PROGRESS:  Phase 18/29 (62%) | Requirements 78% | BDD 80%
VELOCITY:  22 min/plan avg | Trend: ↑ IMPROVING
QUALITY:   Coverage 74% | Defect density 0.12 | Deviation 15%
COSTS:     $18.40 total | $0.27/plan | Est. remaining: ~$3.00
RELEASE:   Tier: Medium | Hotfixes: 0 | Blockers: 0

─── PRODUCT METRICS ──────────────────────────────────────────
NORTH STAR: Weekly Active Teams — 45 → 100 (45% to goal)
HEART:     Happiness 35 → 50 | Engagement 28% → 40% | Retention 42% → 60%
OKRs:      "Achieve PMF" — Confidence 65% (Q2 2026)
FEATURES:  Social Login 35% adoption (target 60%)
─────────────────────────────────────────────────────────────

─── 10x ENGINEER METRICS ───────────────────────────────────
SPEED:     Lead Time 45 min ✅ | Cycle Time 18h ✅ | Deploys 3.5/day ✅
QUALITY:   Review Coverage 85% ⚠️ | Review Depth 4.2 ✅ | Defects 0.8/KLOC ✅
MAINTAIN:  Churn 15% ✅ | Tech Debt 8% ✅ | Debt Age 18d ✅ | Complexity 7.5 ✅
─────────────────────────────────────────────────────────────

10x Score: 85/100 (Good — 3 metrics need improvement)
Product Score: 45/100 (Needs work — focus on retention)
```

## 10x Engineer Score Calculation

```
10x Score = (Speed Score + Quality Score + Maintainability Score) / 3

Speed Score (33%):
- Lead Time < 60 min → +33
- Cycle Time < 24h → +33
- Deploys > 1/day → +34

Quality Score (33%):
- Review Coverage = 100% → +34
- Review Depth > 3 → +33
- Defect Density < 1.0 → +33

Maintainability Score (33%):
- Code Churn < 20% → +20
- Tech Debt < 10% → +20
- Debt Markers < 50 → +20
- Debt Age < 30d → +20
- Complexity < 10 → +20

Score Interpretation:
- 90-100: Elite (top 5% of engineers)
- 75-89: Good (top 20%)
- 50-74: Average
- < 50: Needs improvement
```
