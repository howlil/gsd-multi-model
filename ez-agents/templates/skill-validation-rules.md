<skill_validation_rules>
  <metadata>
    <version>1.0</version>
    <purpose>Define validation rules for skill best practices and anti-patterns</purpose>
    <reference>bin/lib/skill-consistency-validator.cjs</reference>
  </metadata>

  <validation_rule_format>
    Each skill has:
    - **Best Practices** — Must-have patterns (warning if missing)
    - **Anti-Patterns** — Must-not-have patterns (error if detected)
  </validation_rule_format>

  <category name="Stack Skills">
    <skill id="laravel_11_structure_skill_v2">
      <best_practices>
        - `app/Models/` directory for Eloquent models
        - `app/Http/Controllers/` for controllers
        - `routes/api.php` for API routes
        - Service classes in `app/Services/`
        - Repository pattern in `app/Repositories/`
      </best_practices>

      <anti_patterns>
        <pattern severity="ERROR">Business logic in `routes/web.php`</pattern>
        <pattern severity="ERROR">Direct `DB::query()` calls in controllers</pattern>
        <pattern severity="WARNING">Fat controllers (&gt;200 lines)</pattern>
      </anti_patterns>
    </skill>

    <skill id="nextjs_app_router_skill">
      <best_practices>
        - Server Components for data fetching
        - Client Components for interactivity
        - Route Handlers for API endpoints
        - Proper use of `use client` directive
      </best_practices>

      <anti_patterns>
        <pattern severity="ERROR">Using `getServerSideProps` with App Router</pattern>
        <pattern severity="WARNING">Client Components where Server would suffice</pattern>
      </anti_patterns>
    </skill>

    <skill id="express_js_architecture_skill">
      <best_practices>
        - Middleware pattern for cross-cutting concerns
        - Router modularization
        - Error handling middleware
        - Async/await for async operations
      </best_practices>

      <anti_patterns>
        <pattern severity="ERROR">Callback hell in route handlers</pattern>
        <pattern severity="WARNING">Monolithic route files (&gt;500 lines)</pattern>
      </anti_patterns>
    </skill>
  </category>

  <category name="Architecture Skills">
    <skill id="authentication_jwt_skill">
      <best_practices>
        - Password hashing with bcrypt/argon2
        - Token expiration configured
        - Refresh token rotation
        - Rate limiting on auth endpoints
      </best_practices>

      <anti_patterns>
        <pattern severity="ERROR">Hardcoded secrets in code</pattern>
        <pattern severity="ERROR">Tokens stored in localStorage</pattern>
        <pattern severity="WARNING">Missing rate limiting on auth endpoints</pattern>
      </anti_patterns>
    </skill>

    <skill id="repository_pattern_skill">
      <best_practices>
        - Interface abstraction for repositories
        - Single responsibility per repository
        - Dependency injection for repository usage
      </best_practices>

      <anti_patterns>
        <pattern severity="ERROR">Direct database access in controllers</pattern>
        <pattern severity="WARNING">Repository doing business logic</pattern>
      </anti_patterns>
    </skill>

    <skill id="microservices_architecture_skill">
      <best_practices>
        - Service isolation with bounded contexts
        - API gateway for external access
        - Inter-service communication via RPC or message queue
      </best_practices>

      <anti_patterns>
        <pattern severity="ERROR">Shared database between services</pattern>
        <pattern severity="ERROR">Synchronous coupling between critical services</pattern>
        <pattern severity="WARNING">Missing circuit breakers</pattern>
      </anti_patterns>
    </skill>
  </category>

  <category name="Domain Skills">
    <skill id="ecommerce_product_catalog_skill">
      <best_practices>
        - Product variants support
        - Category hierarchy
        - Search indexing
        - Inventory tracking
      </best_practices>

      <anti_patterns>
        <pattern severity="ERROR">Hardcoded product types</pattern>
        <pattern severity="WARNING">Missing inventory synchronization</pattern>
      </anti_patterns>
    </skill>

    <skill id="user_management_skill">
      <best_practices>
        - Email verification flow
        - Password reset flow
        - Account lockout after failed attempts
        - Audit logging for sensitive actions
      </best_practices>

      <anti_patterns>
        <pattern severity="ERROR">Plain text passwords</pattern>
        <pattern severity="ERROR">Missing email verification</pattern>
        <pattern severity="WARNING">No account lockout policy</pattern>
      </anti_patterns>
    </skill>
  </category>

  <category name="Operational Skills">
    <skill id="testing_unit_skill">
      <best_practices>
        - Test file naming: `*.test.ts` or `*.spec.ts`
        - Arrange-Act-Assert pattern
        - Mock external dependencies
        - Test edge cases
      </best_practices>

      <anti_patterns>
        <pattern severity="ERROR">Tests with no assertions</pattern>
        <pattern severity="ERROR">Testing implementation instead of behavior</pattern>
        <pattern severity="WARNING">Tests dependent on execution order</pattern>
      </anti_patterns>
    </skill>

    <skill id="testing_integration_skill">
      <best_practices>
        - Test database isolation
        - API contract testing
        - End-to-end flow testing
        - Test data cleanup
      </best_practices>

      <anti_patterns>
        <pattern severity="ERROR">Tests using production database</pattern>
        <pattern severity="ERROR">Tests leaving data behind</pattern>
        <pattern severity="WARNING">Flaky tests (non-deterministic)</pattern>
      </anti_patterns>
    </skill>

    <skill id="ci_cd_github_actions_skill">
      <best_practices>
        - Workflow files in `.github/workflows/`
        - Job separation (build, test, deploy)
        - Caching for dependencies
        - Environment-specific deployments
      </best_practices>

      <anti_patterns>
        <pattern severity="ERROR">Hardcoded secrets in workflow</pattern>
        <pattern severity="ERROR">Deploying on every commit to main</pattern>
        <pattern severity="WARNING">Missing test job</pattern>
      </anti_patterns>
    </skill>
  </category>

  <category name="Governance Skills">
    <skill id="api_rate_limiting_skill">
      <best_practices>
        - Rate limit headers in response
        - Different limits for auth/non-auth users
        - Graceful degradation
        - Clear error messages
      </best_practices>

      <anti_patterns>
        <pattern severity="ERROR">No rate limiting on public endpoints</pattern>
        <pattern severity="ERROR">Rate limiting only on auth endpoints</pattern>
        <pattern severity="WARNING">Missing rate limit headers</pattern>
      </anti_patterns>
    </skill>

    <skill id="security_backend_skill">
      <best_practices>
        - Input validation on all endpoints
        - SQL injection prevention
        - XSS prevention
        - CSRF protection
        - Security headers
      </best_practices>

      <anti_patterns>
        <pattern severity="ERROR">SQL query concatenation</pattern>
        <pattern severity="ERROR">Missing input validation</pattern>
        <pattern severity="ERROR">No HTTPS enforcement</pattern>
        <pattern severity="WARNING">Missing security headers</pattern>
      </anti_patterns>
    </skill>
  </category>

  <validation_process>
    <step name="Pre-Commit Validation">
      Run before committing code:
      
      <command>node bin/lib/skill-consistency-validator.cjs --pre-commit</command>
      
      <checks>
        - Best practices followed
        - No ERROR anti-patterns
        - Skill activation documented
      </checks>
    </step>

    <step name="Phase Completion Validation">
      Run at phase completion:
      
      <command>node bin/lib/skill-consistency-validator.cjs --phase {phase_number}</command>
      
      <checks>
        - All skills validated
        - Consistency across tasks
        - No WARNING anti-patterns without justification
      </checks>
    </step>

    <step name="Milestone Audit">
      Run at milestone completion:
      
      <command>node bin/lib/skill-consistency-validator.cjs --milestone {milestone_version}</command>
      
      <checks>
        - Full skill audit
        - Cross-phase consistency
        - Technical debt from anti-patterns documented
      </checks>
    </step>
  </validation_process>

  <severity_levels>
    <level name="ERROR">
      - Must fix before commit
      - Blocks handoff
      - Requires immediate attention
      - Examples: Security vulnerabilities, data corruption risks
    </level>

    <level name="WARNING">
      - Should fix soon
      - Document if deferred
      - Requires justification
      - Examples: Code quality issues, missing best practices
    </level>

    <level name="INFO">
      - Suggestion for improvement
      - No action required
      - Consider for future refactoring
      - Examples: Optimization opportunities, style suggestions
    </level>
  </severity_levels>

  <validation_report_format>
    <format>
```json
{
  "valid": true,
  "phase": "{phase_number}",
  "timestamp": "{ISO timestamp}",
  "skillsValidated": {N},
  "summary": {
    "errors": 0,
    "warnings": 0,
    "info": 0
  },
  "findings": [
    {
      "severity": "ERROR|WARNING|INFO",
      "skill": "{skill_id}",
      "rule": "{rule_description}",
      "location": "{file_path}:{line}",
      "message": "{description}",
      "fix": "{suggested fix}"
    }
  ]
}
```
    </format>
  </validation_report_format>
</skill_validation_rules>
