---
name: product_design_v1
description: Product design strategy, design thinking, problem framing, solution exploration, and end-to-end product design process
version: 1.0.0
tags: [product-design, design-thinking, strategy, problem-framing, solution-design, end-to-end-design]
category: product
triggers:
  keywords: [product design, design thinking, product strategy, problem framing, solution design, design process]
  filePatterns: [product/*.ts, strategy/*.ts, design-process/*.ts]
  commands: [product design, design thinking, strategy session]
  projectArchetypes: [saas, mobile-app, web-application, enterprise-software, marketplace]
  modes: [discovery, strategy, execution, iteration]
prerequisites:
  - ux_research_v1
  - ui_ux_design_v1
  - product_management_fundamentals
recommended_structure:
  directories:
    - src/product/
    - src/product/strategy/
    - src/product/discovery/
    - src/product/delivery/
workflow:
  setup:
    - Define product vision
    - Understand business context
    - Identify stakeholders
    - Plan design process
  generate:
    - Problem discovery
    - Solution exploration
    - Prototype and test
    - Iterate based on feedback
  test:
    - Validate problem-solution fit
    - Test usability
    - Measure outcomes
best_practices:
  - Start with problem, not solution
  - Involve users throughout
  - Consider business viability
  - Design for feasibility
  - Document design decisions
  - Measure impact post-launch
  - Iterate based on data
anti_patterns:
  - Solution-first thinking
  - Designing in isolation
  - Ignoring business constraints
  - No validation before build
  - Vanity metrics over outcomes
  - One-and-done design
tools:
  - Miro / FigJam (workshops)
  - Figma (design)
  - UserTesting (validation)
  - Amplitude / Mixpanel (analytics)
metrics:
  - Problem-solution fit score
  - User satisfaction (CSAT, NPS)
  - Task success rate
  - Feature adoption
  - Business outcome metrics
---

# Product Design Skill

## Overview

This skill provides comprehensive guidance on product design - the end-to-end process of understanding user problems, exploring solutions, and delivering products that are desirable for users, viable for business, and feasible to build.

Product Design goes beyond UI/UX to encompass strategy, problem framing, solution exploration, and outcome measurement. It connects user needs with business goals through thoughtful design.

## When to Use

- **New product development** (greenfield)
- **Feature planning** (what to build next)
- **Product strategy** (direction setting)
- **Problem validation** (before building)
- **Design leadership** (process improvement)

## When NOT to Use

- **Incremental improvements** (use optimization process)
- **Bug fixes** (fix first, design later)
- **When problem is well-understood** (execute known solution)

---

## Core Concepts

### 1. Double Diamond Design Process

```typescript
interface DoubleDiamondPhase {
  name: 'Discover' | 'Define' | 'Develop' | 'Deliver';
  type: 'divergent' | 'convergent';
  activities: string[];
  outputs: string[];
  questions: string[];
}

const doubleDiamond: DoubleDiamondPhase[] = [
  {
    name: 'Discover',
    type: 'divergent',
    activities: [
      'User interviews',
      'Market research',
      'Competitive analysis',
      'Stakeholder interviews',
      'Data analysis',
      'Contextual inquiry'
    ],
    outputs: [
      'Research findings',
      'User insights',
      'Market understanding',
      'Problem space map'
    ],
    questions: [
      'What is the problem space?',
      'Who are the users?',
      'What are their needs?',
      'What exists today?'
    ]
  },
  {
    name: 'Define',
    type: 'convergent',
    activities: [
      'Synthesis workshop',
      'Affinity mapping',
      'Problem framing',
      'HMW questions',
      'Prioritization'
    ],
    outputs: [
      'Problem statement',
      'Design principles',
      'Success metrics',
      'Scope definition'
    ],
    questions: [
      'What problem are we solving?',
      'For whom?',
      'Why does it matter?',
      'How will we measure success?'
    ]
  },
  {
    name: 'Develop',
    type: 'divergent',
    activities: [
      'Ideation workshop',
      'Sketching',
      'Prototyping',
      'Concept testing',
      'Feasibility review'
    ],
    outputs: [
      'Concept options',
      'Prototypes',
      'User feedback',
      'Technical assessment'
    ],
    questions: [
      'How might we solve this?',
      'What are the options?',
      'What do users prefer?',
      'What is buildable?'
    ]
  },
  {
    name: 'Deliver',
    type: 'convergent',
    activities: [
      'Solution refinement',
      'Usability testing',
      'Design specification',
      'Handoff',
      'Launch planning'
    ],
    outputs: [
      'Final design',
      'Specifications',
      'Test results',
      'Launch plan'
    ],
    questions: [
      'What is the best solution?',
      'Does it work for users?',
      'Is it ready to build?',
      'How do we launch?'
    ]
  }
];

// Process Application
class ProductDesignProcess {
  async run(phase: DoubleDiamondPhase): Promise<PhaseResult> {
    const result: PhaseResult = {
      phase: phase.name,
      activitiesCompleted: [],
      outputsGenerated: [],
      questionsAnswered: []
    };

    for (const activity of phase.activities) {
      const output = await this.executeActivity(activity);
      result.activitiesCompleted.push(activity);
      result.outputsGenerated.push(output);
    }

    return result;
  }
}
```

### 2. Problem Framing

```typescript
interface ProblemFrame {
  // The user
  who: {
    description: string;
    segment: string;
    characteristics: string[];
  };

  // The need/opportunity
  need: {
    description: string;
    context: string;
    currentBehavior: string;
    painPoints: string[];
  };

  // The insight
  insight: {
    description: string;
    evidence: string[];
    implication: string;
  };

  // The value
  value: {
    userValue: string;
    businessValue: string;
    whyNow: string;
  };
}

// Problem Statement Template
function createProblemStatement(frame: ProblemFrame): string {
  return `
${frame.who.description} needs to ${frame.need.description} 
because ${frame.insight.description}.

Currently, they ${frame.need.currentBehavior} which leads to 
${frame.need.painPoints.join(', ')}.

Solving this will ${frame.value.userValue} for users and 
${frame.value.businessValue} for the business.
  `.trim();
}

// Example: E-commerce Problem Frame
const ecommerceProblemFrame: ProblemFrame = {
  who: {
    description: 'Budget-conscious online shoppers',
    segment: 'Price-sensitive consumers',
    characteristics: [
      'Compare prices across multiple sites',
      'Use coupon codes',
      'Abandon carts when total exceeds expectation'
    ]
  },
  need: {
    description: 'Know the total cost early in the shopping process',
    context: 'During product research and cart building',
    currentBehavior: 'Add items to cart to see shipping costs, then abandon if too high',
    painPoints: [
      'Shipping costs revealed only at checkout',
      'Cannot compare total costs across sites',
      'Feel deceived by hidden fees'
    ]
  },
  insight: {
    description: 'Hidden costs at checkout are the #1 reason for cart abandonment',
    evidence: [
      '68% cart abandonment rate in our analytics',
      'User interviews: "I hate surprise shipping costs"',
      'Survey: 82% would pay more for upfront pricing'
    ],
    implication: 'Transparency builds trust and increases conversion'
  },
  value: {
    userValue: 'Make informed decisions, avoid surprises, feel in control',
    businessValue: 'Increase conversion by 15%, reduce support tickets, build loyalty',
    whyNow: 'Competitors implementing transparent pricing, losing price-sensitive segment'
  }
};

// How Might We Questions
function generateHMWQuestions(frame: ProblemFrame): string[] {
  return [
    `How might we help ${frame.who.segment} ${frame.need.description}?`,
    `How might we eliminate ${frame.need.painPoints[0]}?`,
    `How might we make ${frame.insight.description} work for users?`,
    `How might we deliver ${frame.value.userValue}?`
  ];
}
```

### 3. Solution Exploration

```typescript
interface SolutionOption {
  id: string;
  name: string;
  description: string;
  concept: string; // Visual or written concept
  pros: string[];
  cons: string[];
  feasibility: 'high' | 'medium' | 'low';
  desirability: 'high' | 'medium' | 'low';
  viability: 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large';
  impact: 'low' | 'medium' | 'high';
}

// Solution Comparison Matrix
interface SolutionMatrix {
  criteria: SolutionCriterion[];
  options: SolutionOption[];
}

interface SolutionCriterion {
  name: string;
  weight: number; // 1-5
  description: string;
}

function evaluateSolutions(
  options: SolutionOption[],
  criteria: SolutionCriterion[]
): RankedOption[] {
  return options.map(option => {
    const scores = criteria.map(criterion => {
      const score = option[criterion.name.toLowerCase() as keyof SolutionOption];
      return (score as unknown as number) * criterion.weight;
    });

    return {
      option,
      totalScore: scores.reduce((a, b) => a + b, 0),
      scores: Object.fromEntries(
        criteria.map((c, i) => [c.name, scores[i]])
      )
    };
  }).sort((a, b) => b.totalScore - a.totalScore);
}

// Example: Checkout Solutions
const checkoutSolutions: SolutionOption[] = [
  {
    id: 'sol-1',
    name: 'Shipping Calculator on Product Page',
    description: 'Allow users to calculate shipping before adding to cart',
    concept: 'Add zip code input on product page, show shipping options',
    pros: [
      'Early cost transparency',
      'Reduces cart abandonment',
      'Relatively simple to implement'
    ],
    cons: [
      'Adds complexity to product page',
      'May slow down browsing',
      'Requires address early'
    ],
    feasibility: 'high',
    desirability: 'high',
    viability: 'high',
    effort: 'small',
    impact: 'medium'
  },
  {
    id: 'sol-2',
    name: 'Cart-Level Shipping Estimator',
    description: 'Show shipping estimate in cart before checkout',
    concept: 'Add shipping calculator in cart drawer/page',
    pros: [
      'Context is appropriate (have items)',
      'Does not interrupt browsing',
      'Common pattern users understand'
    ],
    cons: [
      'Still requires cart add first',
      'May be missed by users',
      'Multiple items complicate calculation'
    ],
    feasibility: 'high',
    desirability: 'medium',
    viability: 'high',
    effort: 'small',
    impact: 'medium'
  },
  {
    id: 'sol-3',
    name: 'Free Shipping Threshold Banner',
    description: 'Show progress toward free shipping',
    concept: 'Banner showing "$X more for free shipping"',
    pros: [
      'Encourages larger orders',
      'Clear value proposition',
      'Positive framing'
    ],
    cons: [
      'Does not solve transparency issue',
      'May feel manipulative',
      'Only works with free shipping offer'
    ],
    feasibility: 'high',
    desirability: 'medium',
    viability: 'high',
    effort: 'small',
    impact: 'low'
  },
  {
    id: 'sol-4',
    name: 'All-In Pricing Display',
    description: 'Show product price + estimated shipping together',
    concept: '$29.99 + ~$5.99 shipping = ~$35.98 total',
    pros: [
      'Maximum transparency',
      'Easy comparison shopping',
      'Builds trust'
    ],
    cons: [
      'Complex to implement accurately',
      'Shipping varies by many factors',
      'May show higher total upfront'
    ],
    feasibility: 'low',
    desirability: 'high',
    viability: 'medium',
    effort: 'large',
    impact: 'high'
  }
];

// After evaluation, select best option(s)
const ranked = evaluateSolutions(checkoutSolutions, [
  { name: 'desirability', weight: 5, description: 'User want this?' },
  { name: 'feasibility', weight: 4, description: 'Can we build this?' },
  { name: 'viability', weight: 4, description: 'Should we build this?' },
  { name: 'impact', weight: 5, description: 'Will this move metrics?' },
  { name: 'effort', weight: 3, description: 'How much work?' }
]);
```

### 4. Prototyping Strategy

```typescript
interface PrototypePlan {
  fidelity: 'low' | 'mid' | 'high';
  purpose: string;
  whatToTest: string[];
  whatToIgnore: string[];
  successCriteria: string[];
  participants: number;
  method: string;
}

// Fidelity Selection
function selectFidelity(phase: string, question: string): 'low' | 'mid' | 'high' {
  if (phase === 'discover' || question.startsWith('What')) {
    return 'low'; // Explore concepts
  }
  if (phase === 'develop' || question.startsWith('How')) {
    return 'mid'; // Test interactions
  }
  if (phase === 'deliver' || question.startsWith('Does')) {
    return 'high'; // Validate final
  }
  return 'mid';
}

// Low Fidelity Prototype (Sketch/Whiteboard)
const lowFiPlan: PrototypePlan = {
  fidelity: 'low',
  purpose: 'Explore multiple concepts quickly',
  whatToTest: [
    'Overall concept understanding',
    'Information hierarchy',
    'Flow between screens'
  ],
  whatToIgnore: [
    'Visual design',
    'Exact wording',
    'Interaction details'
  ],
  successCriteria: [
    'Users understand the concept',
    'Users can follow the flow',
    'Users prefer this approach'
  ],
  participants: 5,
  method: 'Moderated, think-aloud'
};

// Mid Fidelity Prototype (Wireframe/Clickable)
const midFiPlan: PrototypePlan = {
  fidelity: 'mid',
  purpose: 'Test interaction patterns and flow',
  whatToTest: [
    'Navigation patterns',
    'Information architecture',
    'Task completion flow',
    'Feature discoverability'
  ],
  whatToIgnore: [
    'Final visual polish',
    'Edge cases',
    'Performance'
  ],
  successCriteria: [
    'Users can complete key tasks',
    'Navigation is intuitive',
    'No major usability issues'
  ],
  participants: 8,
  method: 'Moderated or unmoderated'
};

// High Fidelity Prototype (Pixel-perfect)
const hiFiPlan: PrototypePlan = {
  fidelity: 'high',
  purpose: 'Validate final design before development',
  whatToTest: [
    'Visual clarity',
    'Microcopy effectiveness',
    'Edge case handling',
    'Overall experience'
  ],
  whatToIgnore: [
    'Backend functionality',
    'Real data (use realistic mock data)'
  ],
  successCriteria: [
    'Task success rate > 80%',
    'SUS score > 75',
    'No critical usability issues'
  ],
  participants: 10,
  method: 'Moderated with A/B options'
};
```

### 5. Design Decision Documentation

```typescript
interface DesignDecisionRecord {
  id: string;
  title: string;
  date: string;
  status: 'proposed' | 'accepted' | 'rejected' | 'deprecated';
  
  // Context
  context: {
    problem: string;
    background: string;
    constraints: string[];
  };
  
  // Decision
  decision: {
    what: string;
    rationale: string;
    alternatives: {
      option: string;
      whyNotChosen: string;
    }[];
  };
  
  // Impact
  impact: {
    onUsers: string;
    onBusiness: string;
    onEngineering: string;
    onDesign: string;
  };
  
  // Validation
  validation: {
    howToMeasure: string;
    successMetrics: string[];
    reviewDate: string;
  };
  
  // Stakeholders
  stakeholders: {
    author: string;
    reviewers: string[];
    approver: string;
  };
}

// Example: Navigation Decision
const navigationDDR: DesignDecisionRecord = {
  id: 'DDR-001',
  title: 'Primary Navigation Structure',
  date: '2026-03-29',
  status: 'accepted',
  
  context: {
    problem: 'Users cannot find key features; current navigation is overloaded with 12+ items',
    background: 'Analytics show 40% bounce rate on homepage; user testing reveals navigation confusion',
    constraints: [
      'Must support mobile responsive',
      'Cannot restructure entire IA',
      'Must launch within Q2'
    ]
  },
  
  decision: {
    what: 'Consolidate to 5-7 primary nav items, move secondary to "More" menu',
    rationale: `
      Research shows users prefer fewer, clearer options. 
      Card sorting indicates natural grouping into 5 categories.
      Competitive analysis shows 5-7 items is standard.
    `,
    alternatives: [
      {
        option: 'Mega menu with all options visible',
        whyNotChosen: 'Overwhelming for users; mobile implementation complex'
      },
      {
        option: 'Hamburger menu on desktop',
        whyNotChosen: 'Reduces discoverability; desktop users expect visible nav'
      },
      {
        option: 'Keep current, improve labels',
        whyNotChosen: 'Does not address root cause of too many options'
      }
    ]
  },
  
  impact: {
    onUsers: 'Easier to find features; reduced cognitive load',
    onBusiness: 'Expected 20% increase in feature discovery',
    onEngineering: 'Moderate effort; 2 sprints',
    onDesign: 'Need to audit all pages for nav dependencies'
  },
  
  validation: {
    howToMeasure: 'A/B test new nav vs current',
    successMetrics: [
      'Feature discovery rate +20%',
      'Navigation click-through +15%',
      'Task success rate >85%'
    ],
    reviewDate: '2026-05-29'
  },
  
  stakeholders: {
    author: 'Design Team',
    reviewers: ['Product', 'Engineering', 'Marketing'],
    approver: 'VP Product'
  }
};
```

### 6. Outcome Measurement

```typescript
interface OutcomeFramework {
  // What we want to achieve
  outcome: {
    description: string;
    timeframe: string;
    owner: string;
  };
  
  // How we measure it
  metrics: {
    primary: Metric;
    secondary: Metric[];
    guardrail: Metric[]; // Metrics we do not want to decrease
  };
  
  // Baseline and target
  targets: {
    baseline: number;
    target: number;
    stretch: number;
  };
  
  // How we track
  tracking: {
    instrumentation: string;
    dashboard: string;
    reviewCadence: string;
  };
}

interface Metric {
  name: string;
  definition: string;
  formula?: string;
  source: string;
  frequency: 'real-time' | 'daily' | 'weekly' | 'monthly';
}

// Example: Checkout Improvement Outcome
const checkoutOutcome: OutcomeFramework = {
  outcome: {
    description: 'Reduce cart abandonment and increase checkout completion',
    timeframe: 'Q2 2026',
    owner: 'Checkout Team'
  },
  
  metrics: {
    primary: {
      name: 'Checkout Completion Rate',
      definition: 'Percentage of users who start checkout and complete purchase',
      formula: 'Purchases / Checkout Starts * 100',
      source: 'Analytics (Amplitude)',
      frequency: 'daily'
    },
    secondary: [
      {
        name: 'Cart Abandonment Rate',
        definition: 'Percentage of users who add to cart but do not purchase',
        formula: '(Add to Cart - Purchases) / Add to Cart * 100',
        source: 'Analytics',
        frequency: 'daily'
      },
      {
        name: 'Average Order Value',
        definition: 'Average purchase amount',
        formula: 'Revenue / Purchases',
        source: 'Analytics',
        frequency: 'daily'
      }
    ],
    guardrail: [
      {
        name: 'Customer Support Tickets',
        definition: 'Checkout-related support tickets',
        source: 'Zendesk',
        frequency: 'weekly'
      },
      {
        name: 'Refund Rate',
        definition: 'Percentage of orders refunded',
        source: 'Analytics',
        frequency: 'weekly'
      }
    ]
  },
  
  targets: {
    baseline: 45, // Current completion rate
    target: 55,   // Goal: +10 points
    stretch: 60   // Stretch: +15 points
  },
  
  tracking: {
    instrumentation: 'Checkout funnel events tracked in Amplitude',
    dashboard: 'https://amplitude.com/dashboard/checkout',
    reviewCadence: 'Weekly in team standup, monthly with stakeholders'
  }
};

// Post-Launch Review Template
interface PostLaunchReview {
  launchDate: string;
  feature: string;
  
  // Results
  results: {
    whatWorked: string[];
    whatDidNotWork: string[];
    surprises: string[];
  };
  
  // Metrics
  metrics: {
    target: number;
    actual: number;
    achieved: boolean;
    analysis: string;
  }[];
  
  // Learnings
  learnings: {
    aboutUsers: string[];
    aboutProduct: string[];
    aboutProcess: string[];
  };
  
  // Next Steps
  nextSteps: {
    iterate: string[];
    doubleDown: string[];
    stop: string[];
  };
}
```

---

## Best Practices

### 1. Problem Before Solution
```typescript
// ✅ Good: Start with problem
const process = {
  first: 'Understand the problem',
  second: 'Validate it is worth solving',
  third: 'Explore solutions',
  fourth: 'Test and iterate'
};

// ❌ Bad: Solution-first
const badProcess = {
  first: 'We want to build X',
  second: 'Find users who might want it',
  third: 'Build it',
  fourth: 'Hope they come'
};
```

### 2. Involve Users Throughout
```typescript
// ✅ Good: Continuous user involvement
const userInvolvement = {
  discover: 'Interviews, observation',
  define: 'Validation of problem framing',
  develop: 'Concept testing, prototype testing',
  deliver: 'Usability testing, beta program'
};

// ❌ Bad: One-time research
const badInvolvement = {
  research: '2 weeks at start',
  rest: 'No user contact until launch'
};
```

### 3. Measure Outcomes Not Output
```typescript
// ✅ Good: Outcome-focused
const outcomeMetrics = {
  measure: [
    'Task success rate',
    'User satisfaction',
    'Business impact'
  ],
  notMeasure: [
    'Features shipped',
    'Velocity',
    'Lines of code'
  ]
};
```

---

## Anti-Patterns

### ❌ HIPPO Design (Highest Paid Person's Opinion)
```typescript
// ❌ Bad: Design by executive whim
const decision = executive.opinion; // No research, no testing

// ✅ Good: Evidence-based decisions
const decision = research + userFeedback + data;
```

### ❌ Local Optimization
```typescript
// ❌ Bad: Optimizing one part, hurting whole
optimize(checkoutButton); // Green button converts better
// But overall trust decreases

// ✅ Good: System-level thinking
optimize(overallExperience); // Consider full journey
```

### ❌ No Validation Before Build
```typescript
// ❌ Bad: Build first, validate never
build();
ship();
pray();

// ✅ Good: Validate before investing
research();
prototype();
test();
then.build();
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Problem-Solution Fit** | >70% | Validated need |
| **User Satisfaction** | >4.0/5.0 | Experience quality |
| **Task Success Rate** | >85% | Usability |
| **Feature Adoption** | Track | Value delivery |
| **Business Outcome** | Meet target | Viability |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **Miro** | Workshops | Remote collaboration |
| **Figma** | Design | Prototyping |
| **UserTesting** | Validation | Quick feedback |
| **Amplitude** | Analytics | Outcome tracking |
| **Hotjar** | Behavior | User insights |

---

## Implementation Checklist

### Discovery
- [ ] User research completed
- [ ] Problem space understood
- [ ] Stakeholder alignment
- [ ] Success metrics defined

### Definition
- [ ] Problem statement written
- [ ] HMW questions framed
- [ ] Design principles set
- [ ] Scope agreed

### Development
- [ ] Multiple concepts explored
- [ ] Prototypes tested
- [ ] User feedback incorporated
- [ ] Feasibility confirmed

### Delivery
- [ ] Final design validated
- [ ] Handoff complete
- [ ] Launch plan ready
- [ ] Measurement configured

### Post-Launch
- [ ] Outcomes measured
- [ ] Review conducted
- [ ] Learnings documented
- [ ] Next iteration planned

---

## Related Skills

- **UX Research**: `skills/product/ux-research/ux_research_v1/SKILL.md`
- **UI/UX Design**: `skills/product/ui-ux-design/ui_ux_design_v1/SKILL.md`
- **UX Engineering**: `skills/product/ux-engineering/ux_engineering_v1/SKILL.md`
- **Product Management**: (coming soon)

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
