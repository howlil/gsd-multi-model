---
name: test_laravel_skill_v1
description: Test Laravel skill for unit testing
version: 1.0.0
tags: [laravel, php, backend]
stack: php/laravel-11
category: stack
triggers:
  keywords: [laravel, php]
  filePatterns: [composer.json]
prerequisites:
  - php_8.2_runtime
workflow:
  setup: [composer install]
  generate: [php artisan make:model]
  test: [php artisan test]
best_practices:
  - Use Eloquent ORM
anti_patterns:
  - Avoid business logic in routes
---

<role>
Test skill for unit testing
</role>
