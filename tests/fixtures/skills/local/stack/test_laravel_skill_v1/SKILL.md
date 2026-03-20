---
name: test_laravel_skill_v1
description: Local override Laravel skill for testing
version: 1.0.0
tags: [laravel, php, backend, local]
stack: php/laravel-11
category: stack
triggers:
  keywords: [laravel, php, local]
  filePatterns: [composer.json]
prerequisites:
  - php_8.2_runtime
workflow:
  setup: [composer install]
  generate: [php artisan make:model]
  test: [php artisan test]
best_practices:
  - Use Eloquent ORM
  - Local override test
anti_patterns:
  - Avoid business logic in routes
---

<role>
Local override test skill
</role>
