# EZ Agents Skill Registry

## Overview

The skill registry is a file-based index of all available skills for EZ Agents.
Skills are organized by category and stored in SKILL.md format with comprehensive metadata.

## Directory Structure

```
skills/
├── stack/          # Framework-specific skills (Laravel, Next.js, etc.)
├── architecture/   # Pattern skills (monolith, microservices, etc.)
├── domain/         # Project type skills (POS, e-commerce, etc.)
├── operational/    # Maintenance skills (bug triage, rollback, etc.)
└── governance/     # Quality gate skills
```

## Categories

### Stack (stack)
Framework-specific skills with structure, workflow, and best practices.

**Supported Frameworks:**
- Laravel (PHP)
- Next.js (JavaScript/TypeScript)
- NestJS (TypeScript/Node.js)
- FastAPI (Python)
- Spring Boot (Java)
- React (JavaScript/TypeScript)
- Flutter (Dart)
- Django (Python)
- Express (Node.js)
- Vue (JavaScript/TypeScript)
- Angular (TypeScript)
- Svelte (JavaScript)

### Architecture (architecture)
Pattern-specific skills for system design decisions.

**Patterns:**
- Monolith
- Microservices
- Event-driven
- Queue-based
- Caching
- RBAC (Role-Based Access Control)
- API Gateway

### Domain (domain)
Project type skills for common business applications.

**Domains:**
- POS (Point of Sale)
- E-commerce
- SaaS (Software as a Service)
- LMS (Learning Management System)
- Booking systems
- Fintech
- Inventory management
- Dashboard
- CMS (Content Management System)
- ERP (Enterprise Resource Planning)

### Operational Skills (operational)
Maintenance and incident handling skills for operational excellence.

**Index:** [`skills/operational/OPERATIONAL-INDEX.md`](operational/OPERATIONAL-INDEX.md)

**8 operational skills:**
- Bug Triage and Prioritization (`bug-triage/bug_triage_v1/`)
- Refactor Planning (`refactor-planning/refactor_planning_v1/`)
- Migration Planning (`migration-planning/migration_planning_v1/`)
- Release Readiness Checklist (`release-readiness/release_readiness_v1/`)
- Rollback Planning (`rollback-planning/rollback_planning_v1/`)
- Production Incident Handling (`production-incident/production_incident_v1/`)
- Regression Testing (`regression-testing/regression_testing_v1/`)
- Code Review Checklist (`code-review-checklist/code_review_checklist_v1/`)

### Governance (governance)
Quality gate and compliance skills.

## Usage

### JavaScript API

```javascript
const { SkillRegistry } = require('./ez-agents/bin/lib/skill-registry');
const registry = new SkillRegistry();
await registry.load();

// Get a specific skill
const skill = registry.get('laravel_11_structure_skill_v2');

// Get all skills
const allSkills = registry.getAll();

// Filter by category
const stackSkills = registry.findByCategory('stack');

// Filter by tag
const laravelSkills = registry.findByTag('laravel');

// Search by keyword
const results = registry.search('laravel');
```

### Lazy Loading (with caching)

```javascript
const { LazySkillRegistry } = require('./ez-agents/bin/lib/skill-registry');
const registry = new LazySkillRegistry({ cacheTTL: 5 * 60 * 1000 }); // 5 minutes
await registry.load();

// Skills are cached for better performance
const skill = registry.get('laravel_11_structure_skill_v2');
```

### Skill Validation

```javascript
const { SkillValidator } = require('./ez-agents/bin/lib/skill-validator');
const validator = new SkillValidator();

const { valid, errors } = validator.validate(skill);
if (!valid) {
  console.error('Invalid skill:', errors);
}
```

## SKILL.md Format

Each skill is defined in a SKILL.md file with YAML frontmatter and structured body:

```yaml
---
name: laravel_11_structure_skill_v2
description: Laravel 11 project structure and conventions
version: 2.0.0
tags: [laravel, php, backend, framework, mvc]
stack: php/laravel-11
category: stack
triggers:
  keywords: [laravel, eloquent, blade]
  filePatterns: [composer.json, artisan]
prerequisites:
  - php_8.2_runtime
  - composer_package_manager
recommended_structure:
  directories:
    - app/Models
    - app/Http/Controllers
workflow:
  setup: [composer install, php artisan key:generate]
  generate: [php artisan make:model]
  test: [php artisan test]
best_practices:
  - Use Eloquent ORM for database operations
  - Follow PSR-12 coding standards
anti_patterns:
  - Avoid business logic in routes/web.php
scaling_notes: |
  For high-traffic applications:
  - Use Redis for session/cache drivers
when_not_to_use: |
  - Simple static sites
output_template: |
  ## Laravel Structure Decision
dependencies:
  - php: ">=8.2"
  - composer: ">=2.0"
---

<role>
Skill body with structured sections...
</role>
```

## Skill Naming Convention

Skills follow a versioned naming pattern:

```
{framework}_{version}_{pattern}_skill_v{major}
```

Examples:
- `laravel_11_structure_skill_v2`
- `nextjs_app_router_skill_v1`
- `pos_multi_branch_skill_v1`

## Version History

Skills support side-by-side versioning with changelog tracking in VERSIONS.md files.

## Related Documentation

- [SKILL-01 Requirement Specification](.planning/REQUIREMENTS.md)
- [Phase 35 Research](.planning/phases/35-skill-registry-core/35-RESEARCH.md)
- [Stack Skills Documentation](skills/stack/README.md)
