# Product & UX Skills Index

**Version:** 1.0
**Category:** product

## Overview

Product & UX skills provide comprehensive guidance on user experience research, interface design, UX engineering, and product design strategy for building user-centered products without AI-slop generic design.

## Available Product & UX Skills

| Skill | Directory | Focus Area | Status |
|-------|-----------|------------|--------|
| **UX Research** | `ux-research/ux_research_v1/` | User interviews, usability testing, personas, journey mapping | ✅ Complete |
| **UI/UX Design** | `ui-ux-design/ui_ux_design_v1/` | Visual design, interaction design, design systems, accessibility | ✅ Complete |
| **UX Engineering** | `ux-engineering/ux_engineering_v1/` | Accessible components, keyboard navigation, design system implementation | ✅ Complete |
| **Product Design** | `product-design/product_design_v1/` | Design thinking, problem framing, solution exploration, outcome measurement | ✅ Complete |
| **Design System** | `design-system/design_system_v1/` | Design tokens, component libraries, theming, multi-style support | ✅ Complete |

## Product & UX Skill Categories

### Research & Discovery
- **UX Research**: Understanding users through qualitative and quantitative methods

### Design & Visual
- **UI/UX Design**: Creating beautiful, usable interfaces with design systems

### Implementation
- **UX Engineering**: Bridging design and development with accessible components

### Strategy
- **Product Design**: End-to-end product design from problem to outcome

## The Product Design Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCT DESIGN PROCESS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DISCOVER          DEFINE            DEVELOP           DELIVER              │
│  (Research)        (Frame)           (Explore)         (Validate)           │
│                                                                              │
│  ┌──────────┐     ┌──────────┐      ┌──────────┐     ┌──────────┐         │
│  │ UX       │────>│ Problem  │─────>│ Solution │────>│ Validated│         │
│  │ Research │     │ Framing  │      │ Design   │     │ Product  │         │
│  └──────────┘     └──────────┘      └──────────┘     └──────────┘         │
│       │                │                 │                │                │
│       v                v                 v                v                │
│  ┌──────────┐     ┌──────────┐      ┌──────────┐     ┌──────────┐         │
│  │ -Interviews│   │ -HMW     │      │ -Prototypes│   │ -Testing │         │
│  │ -Surveys   │   │ -Principles│    │ -Iterations│   │ -Specs   │         │
│  │ -Analytics │   │ -Metrics │      │ -Feedback │     │ -Handoff │         │
│  └──────────┘     └──────────┘      └──────────┘     └──────────┘         │
│                                                                              │
│                          UX ENGINEERING                                      │
│              (Accessible Implementation Throughout)                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Design Principles (No AI-Slop)

| Principle | Description | Application |
|-----------|-------------|-------------|
| **Intentional Design** | Every decision is deliberate, not generic | Custom solutions for specific problems |
| **Evidence-Based** | Decisions backed by research, not trends | User data over assumptions |
| **Accessibility First** | Inclusive from the start, not retrofitted | WCAG compliance built-in |
| **Context-Aware** | Design fits the specific use case | No copy-paste from Dribbble |
| **Systematic** | Consistent patterns, documented | Design systems over one-offs |

## Usage

```javascript
const { SkillRegistry } = require('./ez-agents/bin/lib/skill-registry');
const registry = new SkillRegistry();
await registry.load();

// Get all Product & UX skills
const productSkills = registry.findByCategory('product');

// Get specific skill
const researchSkill = registry.get('ux_research_v1');
const designSkill = registry.get('ui_ux_design_v1');
const engineeringSkill = registry.get('ux_engineering_v1');
const productDesignSkill = registry.get('product_design_v1');
```

## When to Apply Each Skill

| Phase | Primary Skill | Supporting Skills |
|-------|---------------|-------------------|
| **Discovery** | UX Research | Product Design |
| **Problem Definition** | Product Design | UX Research |
| **Solution Design** | UI/UX Design | Product Design |
| **Implementation** | UX Engineering | UI/UX Design |
| **Validation** | UX Research | UX Engineering |
| **Iteration** | All skills | - |

## Related Categories

- **Accessibility**: `governance/accessibility-wcag/accessibility_wcag_skill_v1/SKILL.md`
- **Frontend**: `stack/react/react_hooks_architecture_skill_v1/SKILL.md`
- **Testing**: `testing/TESTING-INDEX.md` (usability testing)

---

**Last Updated:** March 29, 2026
**Total Skills:** 4 Complete
