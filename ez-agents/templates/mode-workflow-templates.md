<mode_workflow_templates>
  <metadata>
    <version>1.0</version>
    <purpose>Define workflow templates for each operation mode</purpose>
    <reference>bin/lib/mode-detector.cjs, bin/lib/mode-workflows.cjs</reference>
  </metadata>

  <mode id="MODE-01" name="Greenfield Mode">
    <characteristics>
      - Full freedom to choose architecture
      - Best practices from scratch
      - No legacy constraints
      - Full documentation required
    </characteristics>

    <workflow>
Project Brief
    ↓
Architect Agent: Full architecture design
    ↓
Skill Activation: 7 skills (full stack + architecture + domain)
    ↓
Backend/Frontend Agents: Implementation with best practices
    ↓
QA Agent: Full test coverage (unit + integration + E2E)
    ↓
DevOps Agent: Complete CI/CD + monitoring setup
    ↓
Context Manager: Full documentation
    </workflow>

    <configuration>
      <setting name="Ceremony">Full</setting>
      <setting name="Skill Limit">7</setting>
      <setting name="Gates">All (1-7)</setting>
      <setting name="Documentation">Complete</setting>
      <setting name="Testing">Full coverage</setting>
    </configuration>

    <guardrails>
      None - full freedom to choose approach.
    </guardrails>

    <when_to_use>
      - New project from scratch
      - No existing codebase constraints
      - Team has freedom to choose technologies
      - Time allows for comprehensive approach
    </when_to_use>
  </mode>

  <mode id="MODE-02" name="Existing Codebase Mode">
    <characteristics>
      - Respect current structure
      - Incremental improvements
      - Pattern consistency with existing code
      - Refactoring only when necessary
    </characteristics>

    <workflow>
Analyze existing codebase patterns
    ↓
Architect Agent: Review architecture compatibility
    ↓
Skill Activation: 6 skills (consistency focused)
    ↓
Backend/Frontend Agents: Implementation matching existing patterns
    ↓
QA Agent: Standard test coverage
    ↓
Context Manager: Update documentation
    </workflow>

    <configuration>
      <setting name="Ceremony">Standard</setting>
      <setting name="Skill Limit">6</setting>
      <setting name="Gates">1-5 (skip 6,7 for small changes)</setting>
      <setting name="Documentation">Standard</setting>
      <setting name="Testing">Standard</setting>
      <setting name="Pattern Consistency">Required</setting>
    </configuration>

    <guardrails>
      - No breaking changes without migration plan
      - New code matches existing patterns
      - Refactoring requires separate task
    </guardrails>

    <when_to_use>
      - Working within existing codebase
      - Must maintain consistency with current patterns
      - Small to medium changes
      - Legacy system constraints
    </when_to_use>
  </mode>

  <mode id="MODE-03" name="MVP Mode">
    <characteristics>
      - Minimum viable product focus
      - Speed over perfection
      - Essential features only
      - Technical debt acceptable
    </characteristics>

    <workflow>
Project Brief
    ↓
Architect Agent: Minimal architecture (just enough)
    ↓
Skill Activation: 5 skills (core only)
    ↓
Backend/Frontend Agents: Fast implementation
    ↓
QA Agent: Critical path testing only
    ↓
Context Manager: Minimal documentation
    </workflow>

    <configuration>
      <setting name="Ceremony">Minimal</setting>
      <setting name="Skill Limit">5</setting>
      <setting name="Gates">1-3 (critical only)</setting>
      <setting name="Documentation">Minimal</setting>
      <setting name="Testing">Critical paths</setting>
      <setting name="Speed Priority">Maximum</setting>
    </configuration>

    <guardrails>
      - Document technical debt created
      - No security shortcuts
      - Must work end-to-end
      - Plan for refactoring later
    </guardrails>

    <when_to_use>
      - Demo or pitch needed
      - Validate idea quickly
      - Time-critical release
      - Limited resources
    </when_to_use>
  </mode>

  <mode id="MODE-04" name="Enterprise Mode">
    <characteristics>
      - Full compliance required
      - Comprehensive documentation
      - All best practices
      - Zero tolerance for shortcuts
    </characteristics>

    <workflow>
Project Brief
    ↓
Architect Agent: Enterprise architecture review
    ↓
Skill Activation: 7 skills (all relevant)
    ↓
Backend/Frontend Agents: Implementation with full compliance
    ↓
QA Agent: Complete test coverage (100% critical)
    ↓
Security Agent: Security audit
    ↓
Compliance Agent: Compliance verification
    ↓
DevOps Agent: Enterprise CI/CD + monitoring
    ↓
Context Manager: Complete documentation
    </workflow>

    <configuration>
      <setting name="Ceremony">Full</setting>
      <setting name="Skill Limit">7</setting>
      <setting name="Gates">All (1-7)</setting>
      <setting name="Documentation">Complete + Compliance</setting>
      <setting name="Testing">100% critical, 80% overall</setting>
      <setting name="Compliance">Required</setting>
      <setting name="Security Audit">Required</setting>
    </configuration>

    <guardrails>
      - All compliance requirements met
      - Security audit passed
      - Full documentation required
      - No technical debt without approval
    </guardrails>

    <when_to_use>
      - Enterprise customers
      - Regulated industry (finance, health)
      - SOC2 / GDPR required
      - 24/7 SLA commitment
    </when_to_use>
  </mode>

  <mode id="MODE-05" name="Bug Fix Mode">
    <characteristics>
      - Targeted fix only
      - Minimal changes
      - Quick turnaround
      - Regression testing critical
    </characteristics>

    <workflow>
Bug Report
    ↓
QA Agent: Reproduce and isolate bug
    ↓
Backend/Frontend Agents: Minimal fix
    ↓
QA Agent: Regression testing
    ↓
Context Manager: Update docs if needed
    </workflow>

    <configuration>
      <setting name="Ceremony">Minimal</setting>
      <setting name="Skill Limit">4</setting>
      <setting name="Gates">1, 2, 5 (bug fix only)</setting>
      <setting name="Documentation">Fix notes only</setting>
      <setting name="Testing">Regression + affected areas</setting>
      <setting name="Speed Priority">High</setting>
    </configuration>

    <guardrails>
      - Fix must not introduce new bugs
      - Regression tests must pass
      - Document root cause
      - Consider if refactoring needed
    </guardrails>

    <when_to_use>
      - Production bug
      - Critical issue blocking users
      - Small, targeted fix
      - Hotfix release
    </when_to_use>
  </mode>

  <mode id="MODE-06" name="Refactoring Mode">
    <characteristics>
      - Improve existing code
      - No new features
      - Maintain behavior
      - Improve quality metrics
    </characteristics>

    <workflow>
Code Quality Review
    ↓
Architect Agent: Identify refactoring opportunities
    ↓
Skill Activation: 6 skills (quality focused)
    ↓
Backend/Frontend Agents: Incremental refactoring
    ↓
QA Agent: Ensure no behavior change
    ↓
Context Manager: Update documentation
    </workflow>

    <configuration>
      <setting name="Ceremony">Standard</setting>
      <setting name="Skill Limit">6</setting>
      <setting name="Gates">1-5 (quality gates)</setting>
      <setting name="Documentation">Update as needed</setting>
      <setting name="Testing">100% - no regression allowed</setting>
      <setting name="Quality Metrics">Must improve</setting>
    </configuration>

    <guardrails>
      - No behavior changes
      - All tests must pass
      - Document what changed and why
      - Measure quality improvement
    </guardrails>

    <when_to_use>
      - Technical debt reduction
      - Performance improvement
      - Code quality improvement
      - Prepare for new features
    </when_to_use>
  </mode>

  <mode_selection_guide>
    <decision_matrix>
      | Factor | Greenfield | Existing | MVP | Enterprise | Bug Fix | Refactoring |
      |--------|------------|----------|-----|------------|---------|-------------|
      | New codebase | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
      | Speed priority | Medium | Medium | High | Low | High | Low |
      | Quality priority | High | High | Low | Highest | Medium | Highest |
      | Documentation | Full | Standard | Minimal | Complete | Minimal | Standard |
      | Testing | Full | Standard | Critical | Complete | Regression | Full |
      | Compliance | Standard | Standard | Minimal | Full | Standard | Standard |
    </decision_matrix>

    <selection_questions>
      1. Is this a new codebase or existing?
         - New → Greenfield, MVP, or Enterprise
         - Existing → Existing, Bug Fix, or Refactoring
      
      2. What is the speed priority?
         - Maximum → MVP
         - High → Bug Fix
         - Medium → Greenfield or Existing
         - Low → Enterprise or Refactoring
      
      3. What is the quality priority?
         - Highest → Enterprise
         - High → Greenfield, Refactoring
         - Medium → Bug Fix, Existing
         - Low → MVP
      
      4. Are there compliance requirements?
         - Yes, full → Enterprise
         - Yes, standard → Greenfield, Existing
         - No → MVP, Bug Fix, Refactoring
    </selection_questions>
  </mode_selection_guide>
</mode_workflow_templates>
