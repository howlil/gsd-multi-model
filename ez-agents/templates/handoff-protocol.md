<handoff_protocol>
  <metadata>
    <version>1.0</version>
    <purpose>Standardized handoff protocol for transferring skills and context between agents</purpose>
    <reference>bin/lib/skill-handoff.cjs</reference>
  </metadata>

  <handoff_record_format>
## Skill Handoff Record

**From Agent:** {agent-name}
**To Agent:** {next-agent-name}
**Phase:** {phase-number}
**Task:** {task-id}
**Timestamp:** {ISO timestamp}

### Context Transferred
- Project state: {STATE.md snapshot reference}
- Decisions made: {DECISIONS.md entries}
- Skills active: [list of skill IDs]
- Artifacts produced: [file paths]

### Continuity Requirements
- Must maintain: {specific patterns/approaches}
- Must not change: {locked decisions}
- Must validate: {specific checks}

### Handoff Checkpoint
**Type:** {checkpoint-type: sequential|parallel|interrupted}
**Status:** {ready-for-handoff|pending|blocked}
**Verification:** {self-check results}
  </handoff_record_format>

  <handoff_types>
    <type name="Sequential Handoff">
      <description>Standard flow where agents work in sequence</description>
      
      <flow>Architect → Backend → Frontend → QA → DevOps</flow>
      
      <use_cases>
        - Feature development from design to deployment
        - Phase execution with clear stage boundaries
      </use_cases>
      
      <example>
Architect designs authentication → Backend implements → Frontend integrates → QA tests
      </example>
    </type>

    <type name="Parallel Handoff">
      <description>Multiple agents work on same feature with shared context</description>
      
      <flow>Backend + Frontend work simultaneously</flow>
      
      <use_cases>
        - Full-stack feature development
        - Independent components that can be developed in parallel
      </use_cases>
      
      <example>
Backend creates API endpoints while Frontend builds UI components
Both agents share API contract documentation
      </example>
    </type>

    <type name="Interrupted Handoff">
      <description>Agent A stops at checkpoint, Agent B continues</description>
      
      <flow>Agent A → (interruption) → Agent B</flow>
      
      <use_cases>
        - Agent unavailable
        - Priority change
        - Recovery from failure
      </use_cases>
      
      <example>
Backend Agent starts implementation but gets blocked on auth
DevOps Agent continues with CI/CD setup while waiting
      </example>
    </type>
  </handoff_types>

  <continuity_requirements>
    <section name="Must Maintain">
      Patterns and approaches that must continue:
      
      <format>
- Must maintain: Repository pattern for data access
- Must maintain: JWT authentication with refresh rotation
- Must maintain: Modular monolith architecture
      </format>
    </section>

    <section name="Must Not Change">
      Locked decisions from previous agent:
      
      <format>
- Must not change: Database schema (PostgreSQL with specific tables)
- Must not change: Authentication approach (JWT, not sessions)
- Must not change: API versioning strategy (URL-based)
      </format>
    </section>

    <section name="Must Validate">
      Checks receiving agent must perform:
      
      <format>
- Must validate: All API endpoints return consistent error format
- Must validate: Frontend handles all API error cases
- Must validate: Tests cover critical user flows
      </format>
    </section>
  </continuity_requirements>

  <examples>
    <example id="1" name="Architect → Backend (User Authentication)">
      <from>ez-architect-agent</from>
      <to>ez-backend-agent</to>
      <task>Implement user authentication</task>
      
      <context_transferred>
- Project state: STATE.md snapshot at 2026-03-21T10:00:00Z
- Decisions: JWT auth, PostgreSQL, Redis for token blacklist
- Skills: modular_monolith, authentication_jwt, postgresql_schema
- Artifacts: ARCHITECTURE.md, API-CONTRACTS.md
      </context_transferred>
      
      <continuity_requirements>
- Must maintain: JWT authentication approach
- Must maintain: Modular structure
- Must implement: Token blacklist
- Must not change: Database choice (PostgreSQL)
      </continuity_requirements>
      
      <skill_activation>
To Backend: Activate skills: laravel_11, api_design_rest, authentication_jwt, redis_caching, testing_unit
      </skill_activation>
    </example>

    <example id="2" name="Backend → Frontend (User Dashboard)">
      <from>ez-backend-agent</from>
      <to>ez-frontend-agent</to>
      <task>Build user dashboard</task>
      
      <context_transferred>
- API contracts: /api/v1/users, /api/v1/dashboard
- Data models: User, Dashboard, Metrics
- Authentication: JWT required on all endpoints
      </context_transferred>
      
      <continuity_requirements>
- Must use: Provided API contracts
- Must implement: Auth flow with token refresh
- Must match: Data models in frontend state
      </continuity_requirements>
      
      <skill_activation>
To Frontend: Activate skills: nextjs_app_router, state_management, api_integration, authentication_jwt, testing_component
      </skill_activation>
    </example>

    <example id="3" name="Frontend → QA (Dashboard Testing)">
      <from>ez-frontend-agent</from>
      <to>ez-qa-agent</to>
      <task>Test dashboard functionality</task>
      
      <context_transferred>
- Components: DashboardLayout, MetricCard, Chart
- User flows: Login, View dashboard, Refresh data
- Edge cases: Empty state, Loading state, Error state
      </context_transferred>
      
      <continuity_requirements>
- Must test: All user flows documented
- Must verify: Accessibility compliance (WCAG 2.1 AA)
- Must validate: Error handling on all API calls
      </continuity_requirements>
      
      <skill_activation>
To QA: Activate skills: testing_playwright, accessibility_testing, api_testing, regression_testing, quality_gates
      </skill_activation>
    </example>
  </examples>

  <validation>
    <pre_handoff_checklist>
      Sending agent must verify:
      <check>All artifacts committed</check>
      <check>Decision log complete</check>
      <check>Skills documented</check>
      <check>Continuity requirements clear</check>
      <check>Self-check passed</check>
    </pre_handoff_checklist>

    <post_handoff_checklist>
      Receiving agent must verify:
      <check>All context received</check>
      <check>Continuity requirements understood</check>
      <check>Skills activated appropriately</check>
      <check>Ready to continue work</check>
    </post_handoff_checklist>
  </validation>

  <skill_memory>
    Skills used in project are tracked for consistency:
    
    <format>
```json
{
  "projectId": "project-xyz",
  "skillMemory": [
    {
      "phase": "39",
      "task": "auth-implementation",
      "skills": ["authentication_jwt_skill", "laravel_11_structure_skill_v2"],
      "timestamp": "2026-03-21T10:00:00Z",
      "agent": "ez-backend-agent"
    }
  ]
}
```
    </format>
    
    <purpose>Ensure consistent skill usage across phases for coherence.</purpose>
  </skill_memory>
</handoff_protocol>
