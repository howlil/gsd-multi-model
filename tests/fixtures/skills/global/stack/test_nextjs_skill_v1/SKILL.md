---
name: test_nextjs_skill_v1
description: Test Next.js skill for unit testing
version: 1.0.0
tags: [nextjs, react, frontend]
stack: javascript/nextjs-14
category: stack
triggers:
  keywords: [nextjs, react]
  filePatterns: [next.config.js]
prerequisites:
  - nodejs_18_runtime
workflow:
  setup: [npm install]
  generate: [npx create-next-app]
  test: [npm run test]
best_practices:
  - Use App Router
anti_patterns:
  - Don't use useEffect for data fetching
---

<role>
Test skill for unit testing
</role>
