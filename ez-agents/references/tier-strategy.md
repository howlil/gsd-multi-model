# Tier Strategy Reference

Decision reference for git branching and release strategy per tier.

## Quick Decision Matrix

| Question | MVP | Medium | Enterprise |
|----------|-----|--------|------------|
| Git strategy | Trunk (tag main) | GitHub Flow | GitFlow |
| Release branch | None | `release/vX.Y.Z` | `release/vX.Y.Z` from develop |
| Hotfix to develop? | No | No | Yes |
| PR required? | No | Yes (optional) | Yes (required) |
| Coverage gate | 60% | 80% | 95% |
| Checklist items | 6 | 18 | 30 |
| MoSCoW scope | @must | @must + @should | All |
| Rollback window | 30 min | 15 min | 5 min |

## When to Use Each Tier

**MVP** — You need to ship NOW
- First public release
- Early access / beta
- Founder-driven sales demo
- Internal tool, no SLA

**Medium** — Real users, real consequences
- General availability
- Paying customers
- Public-facing product
- Team of 2-10 developers

**Enterprise** — Compliance matters
- Fortune 500 customers
- Regulated industry (finance, health, legal)
- SOC2 / GDPR required
- 24/7 SLA commitment

## Tier Promotion Path

```
Initial release → MVP v1.0.0
  ↓ (enough users to need reliability)
GA release → Medium v1.5.0
  ↓ (enterprise deal signed)
Enterprise → v2.0.0
```

Each promotion is additive — enterprise features are behind feature flags in the codebase from day one. Promotion just enables the flags and runs the stricter checklist.

## Feature Flag Convention

```javascript
// In code: guard enterprise/medium features
const ENABLE_SHOULD_FEATURES = process.env.ENABLE_SHOULD_FEATURES === 'true';
const ENABLE_COULD_FEATURES = process.env.ENABLE_COULD_FEATURES === 'true';

// MVP deploy: both = false (no overhead)
// Medium deploy: SHOULD = true
// Enterprise: SHOULD = true, COULD = true
```

## GitFlow (Enterprise) Branch Layout

```
main          ← production releases (tagged)
develop       ← integration branch
  feature/*   ← new features
  fix/*        ← bug fixes
release/vX.Y.Z ← release preparation (from develop → main)
hotfix/*      ← emergency production fixes (from main → main + develop)
```

## GitHub Flow (Medium) Branch Layout

```
main          ← production (deploy on merge)
  feature/*   ← all work branches
  release/vX.Y.Z ← optional: release prep branch
  hotfix/*    ← emergency fixes
```

## Trunk-Based (MVP) Branch Layout

```
main          ← production + development
  task/*      ← short-lived feature branches (optional)
              ← hotfix directly if needed
```

## Config Location

Tier is stored in `.planning/config.json`:

```json
{
  "release": {
    "tier": "mvp",
    "tiers": { ... }
  }
}
```

Update with: `node ez-tools.js tier-manager save-tier medium`
