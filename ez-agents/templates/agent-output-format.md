<agent_output_format>
  <metadata>
    <version>1.0</version>
    <applies_to>All specialist agents (Architect, Backend, Frontend, QA, DevOps, Context Manager)</applies_to>
    <purpose>Ensure consistency across all agent outputs, enable cross-agent understanding, and provide audit trail for decisions</purpose>
  </metadata>

  <required_sections>
    <section id="1" name="Decision Log">
      All architectural and implementation decisions with rationale
    </section>
    <section id="2" name="Trade-off Analysis">
      Options considered, pros/cons, why chosen option selected
    </section>
    <section id="3" name="Artifacts Produced">
      Files created/modified with purpose
    </section>
    <section id="4" name="Skills Applied">
      Which skills guided the work
    </section>
    <section id="5" name="Verification Status">
      Self-check results before handoff
    </section>
  </required_sections>

  <section name="Decision Log">
    <purpose>
    Document all significant decisions made during task execution with full context and rationale.
    </purpose>

    <format>
## Decisions Made

### Decision {N}: {Decision Name}

**Context:** {Situation requiring decision}

**Options Considered:**
1. {Option A}
2. {Option B}
3. {Option C}

**Decision:** {Chosen option}

**Rationale:** {Why this option was selected}

**Trade-offs:**
- ✅ Pros: {Advantages}
- ❌ Cons: {Disadvantages}

**Skills Applied:** `{skill_id_1}`, `{skill_id_2}`

**Impact:** {What this decision affects}
    </format>

    <required_fields>
      <field name="Context">The situation or problem that required a decision</field>
      <field name="Options Considered">At least 2-3 alternatives that were evaluated</field>
      <field name="Decision">The chosen option (clearly stated)</field>
      <field name="Rationale">Explanation of why this option was selected</field>
      <field name="Trade-offs">Balanced view of advantages and disadvantages</field>
      <field name="Skills Applied">Skill IDs that guided this decision</field>
      <field name="Impact">What parts of the system are affected by this decision</field>
    </required_fields>

    <example>
### Decision 1: JWT-based Authentication

**Context:** Need stateless authentication for API endpoints

**Options Considered:**
1. Session-based authentication with server-side storage
2. JWT with refresh token rotation
3. OAuth2 with external identity provider

**Decision:** JWT with refresh token rotation

**Rationale:** Stateless authentication scales better, works well with microservices architecture, and refresh rotation provides security without server-side session storage

**Trade-offs:**
- ✅ Pros: Stateless, scalable, easy to distribute across services
- ❌ Cons: Token revocation requires blacklist, more complex client implementation

**Skills Applied:** `authentication_jwt_skill`, `security_architecture_skill`

**Impact:** All API endpoints will require JWT validation middleware
    </example>
  </section>

  <section name="Trade-off Analysis">
    <purpose>
    Provide detailed comparison of options for significant decisions, enabling future agents to understand why specific approaches were chosen.
    </purpose>

    <format>
## Trade-off Analysis

### {Decision/Topic}

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| {Option A} | - Pro 1<br>- Pro 2 | - Con 1<br>- Con 2 | {Low/Medium/High} | {When to choose} |
| {Option B} | - Pro 1<br>- Pro 2 | - Con 1<br>- Con 2 | {Low/Medium/High} | {When to choose} |
| {Option C} | - Pro 1<br>- Pro 2 | - Con 1<br>- Con 2 | {Low/Medium/High} | {When to choose} |

**Selected:** {Option}

**Key Factors:**
1. {Factor 1 that influenced decision}
2. {Factor 2 that influenced decision}

**Future Considerations:**
- {What might change this decision in the future}
- {Technical debt created that should be addressed}
    </format>

    <example>
### Trade-off Analysis

### Database Selection

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| PostgreSQL | - ACID compliant<br>- Rich data types<br>- JSON support | - More resources<br>- Complex setup | Medium | When data integrity is critical |
| MongoDB | - Flexible schema<br>- Horizontal scaling<br>- Developer friendly | - No transactions (older versions)<br>- Eventual consistency | Low | When schema flexibility is needed |
| MySQL | - Widely adopted<br>- Good performance<br>- Easy to setup | - Limited JSON support<br>- Scaling complexity | Low | When simplicity is preferred |

**Selected:** PostgreSQL

**Key Factors:**
1. Data integrity is critical for financial transactions
2. JSON support needed for flexible metadata
3. Team has PostgreSQL expertise

**Future Considerations:**
- Monitor query performance as data grows
- Consider read replicas for scaling reads
    </example>
  </section>

  <section name="Artifacts Produced">
    <purpose>
    List all files created or modified during task execution with their purpose.
    </purpose>

    <format>
## Artifacts Produced

### Files Created

| File Path | Purpose | Size (lines) |
|-----------|---------|--------------|
| `{path}` | {Purpose description} | {N} |
| `{path}` | {Purpose description} | {N} |

### Files Modified

| File Path | Changes | Reason |
|-----------|---------|--------|
| `{path}` | {Summary of changes} | {Why modified} |
| `{path}` | {Summary of changes} | {Why modified} |

### Key Exports/Interfaces

```{language}
// From {file}
export {interface/function/class} {name} {
  // Brief description of purpose
}
```
    </format>

    <example>
## Artifacts Produced

### Files Created

| File Path | Purpose | Size (lines) |
|-----------|---------|--------------|
| `src/api/auth/login.ts` | POST endpoint for user login | 85 |
| `src/api/auth/refresh.ts` | POST endpoint for token refresh | 45 |
| `src/middleware/auth.ts` | JWT validation middleware | 62 |
| `src/models/user.ts` | User model with password hashing | 78 |

### Files Modified

| File Path | Changes | Reason |
|-----------|---------|--------|
| `src/routes/api.ts` | Added auth routes | Wire up new endpoints |
| `.env.example` | Added JWT_SECRET, TOKEN_EXPIRY | New environment variables |

### Key Exports/Interfaces

```typescript
// From src/middleware/auth.ts
export function validateJWT(req: Request, res: Response, next: NextFunction) {
  // Validates JWT token and attaches user to request
}

// From src/models/user.ts
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}
```
    </example>
  </section>

  <section name="Skills Applied">
    <purpose>
    Document which skills guided the work, enabling skill consistency validation and audit trail.
    </purpose>

    <format>
## Skills Applied

### Activated Skills ({N} skills)

| Category | Skill ID | How Applied |
|----------|----------|-------------|
| Stack | `{skill_id}` | {How this skill guided the work} |
| Architecture | `{skill_id}` | {How this skill guided the work} |
| Domain | `{skill_id}` | {How this skill guided the work} |
| Operational | `{skill_id}` | {How this skill guided the work} |
| Governance | `{skill_id}` | {How this skill guided the work} |

### Skill Activation Context

```json
{
  "task_id": "{task_id}",
  "agent": "{agent_name}",
  "skills": ["{skill_id_1}", "{skill_id_2}"],
  "context": {
    "stack": "{stack}",
    "architecture": "{architecture}",
    "domain": "{domain}",
    "mode": "{mode}"
  }
}
```
    </format>

    <example>
## Skills Applied

### Activated Skills (5 skills)

| Category | Skill ID | How Applied |
|----------|----------|-------------|
| Stack | `laravel_11_structure_skill_v2` | Followed Laravel 11 directory structure and conventions |
| Architecture | `repository_pattern_skill` | Implemented repository pattern for data access |
| Domain | `ecommerce_product_catalog_skill` | Applied e-commerce product catalog patterns |
| Operational | `testing_integration_skill` | Created integration tests for API endpoints |
| Governance | `api_rate_limiting_skill` | Implemented rate limiting on public endpoints |

### Skill Activation Context

```json
{
  "task_id": "39-02-T1",
  "agent": "ez-backend-agent",
  "skills": [
    "laravel_11_structure_skill_v2",
    "repository_pattern_skill",
    "ecommerce_product_catalog_skill",
    "testing_integration_skill",
    "api_rate_limiting_skill"
  ],
  "context": {
    "stack": "Laravel 11",
    "architecture": "modular-monolith",
    "domain": "e-commerce",
    "mode": "existing"
  }
}
```
    </example>
  </section>

  <section name="Verification Status">
    <purpose>
    Self-check results before handoff to next agent or phase.
    </purpose>

    <format>
## Verification Status

### Self-Check Results

- [ ] {Check 1 specific to agent type}
- [ ] {Check 2 specific to agent type}
- [ ] {Check 3 specific to agent type}
- [ ] Decision log complete
- [ ] Skills alignment verified
- [ ] Skill consistency validation passed

### Validation Report

```json
{
  "valid": true,
  "skillsValidated": {N},
  "errors": 0,
  "warnings": 0,
  "timestamp": "{ISO timestamp}"
}
```

### Ready for Handoff

**Status:** {ready | pending | blocked}

**Handoff To:** {next agent or phase}

**Notes:** {Any special considerations for next agent}
    </format>

    <agent_specific_checks>
      <agent name="Architect Agent">
        <check>Architecture aligns with project goals</check>
        <check>API contracts are complete and consistent</check>
        <check>Technical debt is documented</check>
        <check>Decision log complete</check>
        <check>Skills alignment verified</check>
        <check>Skill consistency validation passed</check>
      </agent>

      <agent name="Backend Agent">
        <check>API endpoints match contracts</check>
        <check>Database migrations are reversible</check>
        <check>Tests pass with good coverage</check>
        <check>Decision log complete</check>
        <check>Skills alignment verified</check>
        <check>Skill consistency validation passed</check>
      </agent>

      <agent name="Frontend Agent">
        <check>Components are accessible (WCAG 2.1 AA)</check>
        <check>State management is consistent</check>
        <check>API integration handles errors</check>
        <check>Decision log complete</check>
        <check>Skills alignment verified</check>
        <check>Skill consistency validation passed</check>
      </agent>

      <agent name="QA Agent">
        <check>Test coverage meets requirements</check>
        <check>Critical paths are tested</check>
        <check>Edge cases are covered</check>
        <check>Decision log complete</check>
        <check>Skills alignment verified</check>
        <check>Skill consistency validation passed</check>
      </agent>

      <agent name="DevOps Agent">
        <check>Pipelines execute successfully</check>
        <check>Infrastructure deploys correctly</check>
        <check>Monitoring is configured</check>
        <check>Decision log complete</check>
        <check>Skills alignment verified</check>
        <check>Skill consistency validation passed</check>
      </agent>

      <agent name="Context Manager">
        <check>State is accurately tracked</check>
        <check>Documentation is complete</check>
        <check>Traceability is maintained</check>
        <check>Decision log complete</check>
        <check>Skills alignment verified</check>
        <check>Skill consistency validation passed</check>
      </agent>
    </agent_specific_checks>
  </section>

  <complete_example>
# Task Completion Report: Authentication API Implementation

## Decisions Made

### Decision 1: JWT-based Authentication

**Context:** Need stateless authentication for API endpoints

**Options Considered:**
1. Session-based authentication with server-side storage
2. JWT with refresh token rotation
3. OAuth2 with external identity provider

**Decision:** JWT with refresh token rotation

**Rationale:** Stateless authentication scales better, works well with microservices architecture

**Trade-offs:**
- ✅ Pros: Stateless, scalable, easy to distribute
- ❌ Cons: Token revocation requires blacklist

**Skills Applied:** `authentication_jwt_skill`, `security_architecture_skill`

**Impact:** All API endpoints will require JWT validation

## Trade-off Analysis

### Token Storage Strategy

| Option | Pros | Cons | Complexity |
|--------|------|------|------------|
| localStorage | Easy to implement | XSS vulnerable | Low |
| httpOnly cookie | XSS protected | CSRF protection needed | Medium |
| memory only | Most secure | Lost on refresh | Low |

**Selected:** httpOnly cookie with CSRF token

## Artifacts Produced

### Files Created

| File Path | Purpose | Lines |
|-----------|---------|-------|
| `src/api/auth/login.ts` | Login endpoint | 85 |
| `src/api/auth/refresh.ts` | Token refresh | 45 |
| `src/middleware/auth.ts` | JWT validation | 62 |

## Skills Applied

### Activated Skills (5 skills)

| Category | Skill ID | How Applied |
|----------|----------|-------------|
| Stack | `express_js_architecture_skill` | Followed Express.js middleware patterns |
| Architecture | `authentication_jwt_skill` | Implemented JWT with refresh rotation |
| Domain | `user_management_skill` | Applied user authentication patterns |
| Operational | `testing_unit_skill` | Created unit tests for auth logic |
| Governance | `security_backend_skill` | Implemented security best practices |

## Verification Status

### Self-Check Results

- [x] API endpoints match contracts
- [x] Tests pass with 85% coverage
- [x] Security best practices followed
- [x] Decision log complete
- [x] Skills alignment verified
- [x] Skill consistency validation passed

### Validation Report

```json
{
  "valid": true,
  "skillsValidated": 5,
  "errors": 0,
  "warnings": 0,
  "timestamp": "2026-03-21T10:30:00Z"
}
```

**Status:** ready

**Handoff To:** ez-frontend-agent

**Notes:** JWT tokens expire in 15 minutes, refresh tokens expire in 7 days
  </complete_example>

  <validation_rules>
    The output validator (`bin/lib/output-validator.cjs`) checks for:

    <required_sections_check level="error">
      - Decision Log section present
      - Trade-off Analysis section present
      - Artifacts Produced section present
      - Skills Applied section present
      - Verification Status section present
    </required_sections_check>

    <required_fields_check level="error">
      - Each decision has: Context, Options, Decision, Rationale
      - Trade-off analysis has comparison table
      - Artifacts list files with purposes
      - Skills section lists 3-7 skill IDs
      - Verification has self-check results
    </required_fields_check>

    <warnings level="warning">
      - Less than 3 skills activated
      - More than 7 skills activated
      - Missing impact statement on decisions
      - Incomplete verification checklist
    </warnings>

    <suggestions level="info">
      - Consider adding more options to trade-off analysis
      - Consider documenting edge cases in artifacts
      - Consider adding skill activation context JSON
    </suggestions>
  </validation_rules>
</agent_output_format>
