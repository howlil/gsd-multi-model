<continuation_format>
  <metadata>
    <purpose>Standard format for presenting next steps after completing a command or workflow</purpose>
    <applies_to>All workflows and commands</applies_to>
  </metadata>

  <core_structure>
---
## ▶ Next Up

**{identifier}: {name}** — {one-line description}

`{command to copy-paste}`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**

- `{alternative option 1}` — description
- `{alternative option 2}` — description

---
  </core_structure>

  <format_rules>
    <rule id="1">
      **Always show what it is** — name + description, never just a command path
    </rule>
    
    <rule id="2">
      **Pull context from source** — ROADMAP.md for phases, PLAN.md `<objective>` for plans
    </rule>
    
    <rule id="3">
      **Command in inline code** — backticks, easy to copy-paste, renders as clickable link
    </rule>
    
    <rule id="4">
      **`/clear` explanation** — always include, keeps it concise but explains why
    </rule>
    
    <rule id="5">
      **"Also available" not "Other options"** — sounds more app-like
    </rule>
    
    <rule id="6">
      **Visual separators** — `---` above and below to make it stand out
    </rule>
  </format_rules>

  <variants>
    <variant name="Execute Next Plan">
---
## ▶ Next Up

**02-03: Refresh Token Rotation** — Add /api/auth/refresh with sliding expiry

`/ez:execute-phase 2`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**

- Review plan before executing
- `/ez:list-phase-assumptions 2` — check assumptions

---
    </variant>

    <variant name="Execute Final Plan in Phase">
      Add note that this is the last plan and what comes after:
      
---
## ▶ Next Up

**02-03: Refresh Token Rotation** — Add /api/auth/refresh with sliding expiry

<sub>Final plan in Phase 2</sub>

`/ez:execute-phase 2`

<sub>`/clear` first → fresh context window</sub>

---

**After this completes:**

- Phase 2 → Phase 3 transition
- Next: **Phase 3: Core Features** — User dashboard and settings

---
    </variant>

    <variant name="Plan a Phase">
---
## ▶ Next Up

**Phase 2: Authentication** — JWT login flow with refresh tokens

`/ez:plan-phase 2`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**

- `/ez:discuss-phase 2` — gather context first
- `/ez:discuss-phase 2` — investigate unknowns
- Review roadmap

---
    </variant>

    <variant name="Phase Complete, Ready for Next">
      Show completion status before next action:
      
---
## ✓ Phase 2 Complete

3/3 plans executed

## ▶ Next Up

**Phase 3: Core Features** — User dashboard, settings, and data export

`/ez:plan-phase 3`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**

- `/ez:discuss-phase 3` — gather context first
- `/ez:discuss-phase 3` — investigate unknowns
- Review what Phase 2 built

---
    </variant>

    <variant name="Multiple Equal Options">
      When there's no clear primary action:
      
---
## ▶ Next Up

**Phase 3: Core Features** — User dashboard, settings, and data export

**To plan directly:** `/ez:plan-phase 3`

**To discuss context first:** `/ez:discuss-phase 3`

**To research unknowns:** `/ez:discuss-phase 3`

<sub>`/clear` first → fresh context window</sub>

---
    </variant>

    <variant name="Milestone Complete">
---
## 🎉 Milestone v1.0 Complete

All 4 phases shipped

## ▶ Next Up

**Start v1.1** — questioning → research → requirements → roadmap

`/ez:new-milestone`

<sub>`/clear` first → fresh context window</sub>

---
    </variant>
  </variants>

  <pulling_context>
    <source name="phases" from="ROADMAP.md">
```markdown
### Phase 2: Authentication

**Goal**: JWT login flow with refresh tokens
```

**Extract:** `**Phase 2: Authentication** — JWT login flow with refresh tokens`
    </source>

    <source name="plans" from="ROADMAP.md">
```markdown
Plans:

- [ ] 02-03: Add refresh token rotation
```

**Extract:** `**02-03: Refresh Token Rotation** — Add /api/auth/refresh with sliding expiry`
    </source>

    <source name="plans" from="PLAN.md objective">
```xml
<objective>
Add refresh token rotation with sliding expiry window.
Purpose: Extend session lifetime without compromising security.
</objective>
```

**Extract:** `**02-03: Refresh Token Rotation** — Add /api/auth/refresh with sliding expiry`
    </source>
  </pulling_context>

  <anti_patterns>
    <pattern name="Command-only (no context)">
      **Don't:**
```markdown
## To Continue

Run `/clear`, then paste:

/ez:execute-phase 2
```

**Why:** User has no idea what 02-03 is about.
    </pattern>

    <pattern name="Missing /clear explanation">
      **Don't:**
```markdown
/ez:plan-phase 3

Run /clear first.
```

**Why:** Doesn't explain why. User might skip it.
    </pattern>

    <pattern name="Other options language">
      **Don't:**
```markdown
Other options:

- Review roadmap
```

**Why:** Sounds like an afterthought. Use "Also available:" instead.
    </pattern>

    <pattern name="Fenced code blocks for commands">
      **Don't:**
```markdown
```
/ez:plan-phase 3
```
```

**Why:** Fenced blocks inside templates create nesting ambiguity. Use inline backticks instead.
    </pattern>
  </anti_patterns>
</continuation_format>
