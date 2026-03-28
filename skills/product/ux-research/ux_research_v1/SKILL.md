---
name: ux_research_v1
description: UX research methodologies, user interviews, usability testing, user personas, journey mapping, and evidence-based design research
version: 1.0.0
tags: [ux, ux-research, user-research, usability-testing, user-interviews, design-research, product-research]
category: product
triggers:
  keywords: [ux research, user research, usability testing, user interviews, user personas, journey mapping, user insights]
  filePatterns: [research/*.ts, ux-research/*.ts, user-testing/*.ts, personas/*.ts]
  commands: [ux research, usability testing, user interviews]
  projectArchetypes: [web-application, mobile-app, saas, e-commerce, enterprise-software]
  modes: [greenfield, redesign, optimization, discovery]
prerequisites:
  - design_thinking_basics
  - product_management_fundamentals
recommended_structure:
  directories:
    - src/research/
    - src/research/interviews/
    - src/research/surveys/
    - src/research/usability/
    - src/research/personas/
    - src/research/journeys/
workflow:
  setup:
    - Define research goals and questions
    - Select appropriate research methods
    - Recruit participants
    - Prepare research materials
  generate:
    - Conduct user interviews
    - Run usability tests
    - Analyze qualitative data
    - Synthesize insights
  test:
    - Validate findings with stakeholders
    - Test insights against data
    - Iterate on research questions
best_practices:
  - Start with clear research questions
  - Use mixed methods (qualitative + quantitative)
  - Recruit representative users
  - Avoid leading questions
  - Record and transcribe sessions
  - Synthesize findings systematically
  - Share insights broadly
  - Make research actionable
anti_patterns:
  - Research without clear goals
  - Only asking users what they want
  - Small unrepresentative samples
  - Confirmation bias in analysis
  - Insights without recommendations
  - Research not shared with team
  - One-time research only
tools:
  - UserTesting / UserZoom
  - Lookback / Maze
  - Dovetail / EnjoyHQ (analysis)
  - Optimal Workshop (card sorting)
  - SurveyMonkey / Typeform
  - Hotjar / FullStory (analytics)
metrics:
  - Research coverage
  - Time to insights
  - Insight adoption rate
  - Usability task success rate
  - System Usability Scale (SUS)
  - Net Promoter Score (NPS)
---

# UX Research Skill

## Overview

This skill provides comprehensive guidance on UX research methodologies, including user interviews, usability testing, field studies, surveys, card sorting, journey mapping, persona development, and synthesizing research into actionable design insights.

UX Research is the systematic investigation of users and their needs, behaviors, and contexts to inform design decisions. Evidence-based research prevents assumptions and ensures products solve real user problems.

## When to Use

- **New product development** (discover user needs)
- **Redesign projects** (understand pain points)
- **Feature planning** (validate concepts)
- **Usability issues** (identify problems)
- **Before major decisions** (reduce risk)
- **Continuous improvement** (ongoing optimization)

## When NOT to Use

- **Urgent bug fixes** (fix first, research later)
- **When data already exists** (review existing research)
- **Purely technical decisions** (use engineering judgment)

---

## Core Concepts

### 1. Research Method Selection Framework

```typescript
interface ResearchMethod {
  name: string;
  type: 'generative' | 'evaluative' | 'quantitative' | 'qualitative';
  phase: 'discover' | 'define' | 'develop' | 'deliver';
  effort: 'low' | 'medium' | 'high';
  participants: number;
  duration: string;
  outputs: string[];
  whenToUse: string[];
  limitations: string[];
}

const researchMethods: Record<string, ResearchMethod> = {
  userInterviews: {
    name: 'User Interviews',
    type: 'qualitative',
    phase: 'discover',
    effort: 'medium',
    participants: '5-8 per segment',
    duration: '2-3 weeks',
    outputs: ['User needs', 'Pain points', 'Mental models', 'Quotes'],
    whenToUse: [
      'Understanding user motivations',
      'Exploring problem space',
      'Gathering context on behaviors'
    ],
    limitations: [
      'Self-reported data (may not match actual behavior)',
      'Small sample size',
      'Time-intensive'
    ]
  },

  usabilityTesting: {
    name: 'Usability Testing',
    type: 'evaluative',
    phase: 'develop',
    effort: 'medium',
    participants: '5-8 per round',
    duration: '1-2 weeks',
    outputs: ['Usability issues', 'Task success rates', 'Time on task', 'Satisfaction scores'],
    whenToUse: [
      'Testing prototype or live product',
      'Identifying usability problems',
      'Validating design solutions'
    ],
    limitations: [
      'Lab setting may not reflect real usage',
      'Participants may behave differently when observed',
      'Requires working prototype'
    ]
  },

  fieldStudy: {
    name: 'Field Study / Contextual Inquiry',
    type: 'qualitative',
    phase: 'discover',
    effort: 'high',
    participants: '3-5',
    duration: '3-4 weeks',
    outputs: ['Contextual insights', 'Environmental factors', 'Workflow understanding'],
    whenToUse: [
      'Understanding real-world context',
      'Complex workflows',
      'Enterprise/B2B products'
    ],
    limitations: [
      'Very time-intensive',
      'Observer effect',
      'Difficult to scale'
    ]
  },

  survey: {
    name: 'Survey',
    type: 'quantitative',
    phase: 'discover',
    effort: 'low',
    participants: '100+',
    duration: '1-2 weeks',
    outputs: ['Statistical data', 'Trends', 'Segmentation'],
    whenToUse: [
      'Validating hypotheses at scale',
      'Gathering demographic data',
      'Measuring satisfaction'
    ],
    limitations: [
      'No context on why',
      'Response bias',
      'Limited depth'
    ]
  },

  cardSorting: {
    name: 'Card Sorting',
    type: 'qualitative',
    phase: 'define',
    effort: 'medium',
    participants: '15-20',
    duration: '1 week',
    outputs: ['Information architecture', 'Mental models', 'Category structures'],
    whenToUse: [
      'Designing navigation',
      'Organizing content',
      'Understanding mental models'
    ],
    limitations: [
      'Does not test actual navigation',
      'Artificial task',
      'May not reflect real usage'
    ]
  },

  treeTesting: {
    name: 'Tree Testing',
    type: 'evaluative',
    phase: 'develop',
    effort: 'medium',
    participants: '20-30',
    duration: '1 week',
    outputs: ['Findability metrics', 'Navigation paths', 'Confusion points'],
    whenToUse: [
      'Testing information architecture',
      'Validating navigation structure',
      'Before visual design'
    ],
    limitations: [
      'No visual context',
      'Does not test full interaction',
      'Limited to IA'
    ]
  },

  diaryStudy: {
    name: 'Diary Study',
    type: 'qualitative',
    phase: 'discover',
    effort: 'high',
    participants: '5-10',
    duration: '2-4 weeks',
    outputs: ['Longitudinal insights', 'Behavior patterns', 'Context over time'],
    whenToUse: [
      'Understanding behaviors over time',
      'Tracking habit formation',
      'Capturing in-the-moment experiences'
    ],
    limitations: [
      'Participant attrition',
      'Self-reporting bias',
      'Analysis complexity'
    ]
  },

  abTesting: {
    name: 'A/B Testing',
    type: 'quantitative',
    phase: 'deliver',
    effort: 'high',
    participants: '1000+',
    duration: '2-4 weeks',
    outputs: ['Statistical significance', 'Conversion rates', 'Behavior metrics'],
    whenToUse: [
      'Comparing design variations',
      'Optimizing conversion',
      'Validating impact'
    ],
    limitations: [
      'Requires high traffic',
      'Does not explain why',
      'Ethical considerations'
    ]
  }
};

class ResearchPlanner {
  selectMethods(
    researchGoal: string,
    phase: string,
    constraints: ResearchConstraints
  ): ResearchMethod[] {
    const suitableMethods = Object.values(researchMethods).filter(method => 
      method.phase === phase &&
      this.fitsConstraints(method, constraints)
    );

    // Recommend 2-3 methods for triangulation
    return suitableMethods.slice(0, 3);
  }

  private fitsConstraints(method: ResearchMethod, constraints: ResearchConstraints): boolean {
    if (constraints.timeline && method.duration > constraints.timeline) return false;
    if (constraints.budget && method.effort === 'high') return false;
    if (constraints.participants && method.participants > constraints.participants) return false;
    return true;
  }
}
```

### 2. User Interview Guide

```typescript
interface InterviewGuide {
  studyTitle: string;
  researchGoals: string[];
  participantCriteria: ParticipantCriteria;
  sections: InterviewSection[];
  consentScript: string;
  debriefQuestions: string[];
}

interface InterviewSection {
  name: string;
  duration: number; // minutes
  questions: InterviewQuestion[];
}

interface InterviewQuestion {
  id: string;
  text: string;
  type: 'opening' | 'behavior' | 'problem' | 'solution' | 'closing';
  probes?: string[];
  notes?: string;
}

// Example: User Interview Guide for E-commerce Checkout
const checkoutInterviewGuide: InterviewGuide = {
  studyTitle: 'E-commerce Checkout Experience Research',
  researchGoals: [
    'Understand current checkout behaviors',
    'Identify pain points in existing flow',
    'Explore attitudes toward payment options',
    'Gather feedback on proposed improvements'
  ],
  participantCriteria: {
    mustHave: [
      'Purchased online in last 3 months',
      'Age 18-65',
      'Uses mobile for shopping'
    ],
    niceToHave: [
      'Abandoned cart in last month',
      'Uses multiple payment methods'
    ],
    exclude: [
      'Works in e-commerce/UX',
      'Participated in research in last 3 months'
    ]
  },
  sections: [
    {
      name: 'Warm-up & Context',
      duration: 5,
      questions: [
        {
          id: 'w1',
          text: 'Tell me about the last thing you bought online.',
          type: 'opening',
          probes: ['What led you to buy it?', 'How did you find the product?']
        },
        {
          id: 'w2',
          text: 'How often do you shop online?',
          type: 'behavior',
          probes: ['What types of products?', 'Which devices do you use?']
        }
      ]
    },
    {
      name: 'Current Checkout Behavior',
      duration: 15,
      questions: [
        {
          id: 'b1',
          text: 'Walk me through your typical checkout process.',
          type: 'behavior',
          probes: [
            'What information do you expect to provide?',
            'What makes you trust a checkout?',
            'What would make you abandon?'
          ]
        },
        {
          id: 'b2',
          text: 'Tell me about a time you abandoned a checkout.',
          type: 'problem',
          probes: ['What happened?', 'How did you feel?', 'What would have helped?']
        }
      ]
    },
    {
      name: 'Pain Points & Frustrations',
      duration: 10,
      questions: [
        {
          id: 'p1',
          text: 'What frustrates you most about online checkout?',
          type: 'problem',
          probes: ['Can you give me a specific example?', 'How do you deal with this?']
        },
        {
          id: 'p2',
          text: 'Describe the best checkout experience you have had.',
          type: 'problem',
          probes: ['What made it great?', 'How did it differ from others?']
        }
      ]
    },
    {
      name: 'Reaction to Concepts (if applicable)',
      duration: 15,
      questions: [
        {
          id: 'c1',
          text: 'Show me what you think this is.',
          type: 'solution',
          probes: ['What would you expect to happen if you clicked here?']
        },
        {
          id: 'c2',
          text: 'How does this compare to what you expected?',
          type: 'solution',
          probes: ['What would make this more useful?', 'What concerns do you have?']
        }
      ]
    },
    {
      name: 'Wrap-up',
      duration: 5,
      questions: [
        {
          id: 'cl1',
          text: 'Is there anything we havent discussed that you think is important?',
          type: 'closing',
          probes: []
        },
        {
          id: 'cl2',
          text: 'Do you have any questions for me?',
          type: 'closing',
          probes: []
        }
      ]
    }
  ],
  consentScript: `
Thank you for participating in this research study. 

Before we begin, I want to explain what will happen:
- This interview will take about 45-60 minutes
- I will be asking about your experiences with online shopping
- With your permission, I would like to record this session for note-taking purposes
- Your participation is voluntary and you can stop at any time
- All information will be kept confidential

Do you have any questions? May we begin?
  `,
  debriefQuestions: [
    'On a scale of 1-10, how easy was it to complete the tasks?',
    'What was the most frustrating part?',
    'What was the most surprising part?',
    'Is there anything you expected that wasnt here?'
  ]
};

// Interview Best Practices
const interviewBestPractices = {
  before: [
    'Review guide thoroughly but stay flexible',
    'Test recording equipment',
    'Prepare consent forms',
    'Set up note-taking system',
    'Do a practice run with colleague'
  ],
  during: [
    'Build rapport first (5 min warm-up)',
    'Ask open-ended questions',
    'Use the 5 Whys technique',
    'Embrace silence (let them think)',
    'Avoid leading questions',
    'Watch for non-verbal cues',
    'Take timestamped notes'
  ],
  after: [
    'Write summary within 24 hours',
    'Tag key quotes and insights',
    'Note patterns across interviews',
    'Share findings with team',
    'Update research repository'
  ]
};
```

### 3. Usability Testing Framework

```typescript
interface UsabilityTestPlan {
  testTitle: string;
  testType: 'moderated' | 'unmoderated' | 'guerrilla';
  testFormat: 'in-person' | 'remote' | 'prototype' | 'live';
  tasks: UsabilityTask[];
  metrics: MetricDefinition[];
  successCriteria: SuccessCriteria;
}

interface UsabilityTask {
  id: string;
  scenario: string; // Context for the task
  taskDescription: string; // What to do
  successCriteria: string; // How to know it is complete
  criticality: 'critical' | 'important' | 'nice-to-have';
}

interface MetricDefinition {
  name: string;
  type: 'effectiveness' | 'efficiency' | 'satisfaction';
  howToMeasure: string;
}

interface SuccessCriteria {
  overallSuccessRate: number; // Target %
  criticalTaskSuccessRate: number;
  averageTimeOnTask: number; // seconds
  satisfactionScore: number; // Target SUS or similar
}

// Example: Usability Test Plan
const checkoutUsabilityTest: UsabilityTestPlan = {
  testTitle: 'Checkout Flow Usability Test',
  testType: 'moderated',
  testFormat: 'remote',
  tasks: [
    {
      id: 't1',
      scenario: 'You have found a product you want to buy. You need it delivered to your home address.',
      taskDescription: 'Please purchase this item and have it shipped to your home.',
      successCriteria: 'User reaches order confirmation page',
      criticality: 'critical'
    },
    {
      id: 't2',
      scenario: 'You want to use a discount code you received via email.',
      taskDescription: 'Apply the discount code SAVE10 to your order.',
      successCriteria: 'Discount is applied and total updates',
      criticality: 'critical'
    },
    {
      id: 't3',
      scenario: 'You want to track your order after purchase.',
      taskDescription: 'Find where you can track your order status.',
      successCriteria: 'User locates order tracking',
      criticality: 'important'
    }
  ],
  metrics: [
    {
      name: 'Task Success Rate',
      type: 'effectiveness',
      howToMeasure: 'Percentage of users who complete each task'
    },
    {
      name: 'Time on Task',
      type: 'efficiency',
      howToMeasure: 'Seconds from task start to completion'
    },
    {
      name: 'Error Rate',
      type: 'effectiveness',
      howToMeasure: 'Number of errors per task'
    },
    {
      name: 'System Usability Scale (SUS)',
      type: 'satisfaction',
      howToMeasure: 'Post-test 10-question survey'
    },
    {
      name: 'Single Ease Question (SEQ)',
      type: 'satisfaction',
      howToMeasure: '1-7 rating after each task'
    }
  ],
  successCriteria: {
    overallSuccessRate: 80,
    criticalTaskSuccessRate: 90,
    averageTimeOnTask: 120,
    satisfactionScore: 75 // SUS score
  }
};

// Usability Test Facilitator Guide
class UsabilityTestFacilitator {
  private testPlan: UsabilityTestPlan;
  private noteTaker: NoteTaker;

  async runSession(participant: Participant): Promise<TestResult> {
    const result: TestResult = {
      participantId: participant.id,
      tasks: [],
      issues: [],
      metrics: {}
    };

    // Introduction (5 min)
    await this.introduction(participant);

    // Pre-test questions (5 min)
    await this.preTestQuestions(participant);

    // Task execution
    for (const task of this.testPlan.tasks) {
      const taskResult = await this.runTask(task, participant);
      result.tasks.push(taskResult);
      
      // SEQ after each task
      const seq = await this.askSEQ(task);
      taskResult.satisfaction = seq;
    }

    // Post-test survey (10 min)
    result.metrics.sus = await this administerSUS();

    // Debrief (10 min)
    await this.debrief(participant);

    return result;
  }

  private async introduction(participant: Participant): Promise<void> {
    console.log(`
Welcome! Thank you for participating.

A few things before we start:
- I am testing the PRODUCT, not you. You cannot make mistakes.
- Please think aloud as you work through the tasks.
- If you get stuck, I may ask you what you expected to happen.
- This session is being recorded for note-taking purposes.

Do you have any questions before we begin?
    `);
  }

  private async runTask(task: UsabilityTask, participant: Participant): Promise<TaskResult> {
    const startTime = Date.now();
    let completed = false;
    let errors: string[] = [];
    let assistanceNeeded = 0;

    console.log(`\nTask ${task.id}: ${task.scenario}`);
    console.log(`Your goal: ${task.taskDescription}`);

    // Observe and take notes
    while (!completed) {
      // Observe behavior
      // Note errors
      // Track time
      // Provide minimal assistance if needed
    }

    return {
      taskId: task.id,
      completed,
      timeOnTask: Date.now() - startTime,
      errors,
      assistanceNeeded,
      path: [] // Sequence of actions taken
    };
  }

  private async askSEQ(task: UsabilityTask): Promise<number> {
    console.log(`\nOn a scale of 1-7, how difficult was that task?`);
    console.log('1 = Very Difficult, 7 = Very Easy');
    // Return rating
    return 0; // Placeholder
  }

  private async administerSUS(): Promise<number> {
    const susQuestions = [
      'I think I would like to use this system frequently.',
      'I found the system unnecessarily complex.',
      'I thought the system was easy to use.',
      'I think I would need technical support to use this system.',
      'I found the various functions were well integrated.',
      'I thought there was too much inconsistency in this system.',
      'I would imagine most people would learn to use this system quickly.',
      'I found the system very cumbersome to use.',
      'I felt very confident using the system.',
      'I needed to learn a lot of things before I could use this system.'
    ];

    // Collect ratings and calculate SUS score
    return 0; // Placeholder
  }
}
```

### 4. User Persona Development

```typescript
interface UserPersona {
  id: string;
  name: string; // Fictional name
  tagline: string; // One-line summary
  photo: string; // Representative image
  demographics: Demographics;
  bio: string; // Background story
  goals: Goal[];
  frustrations: Frustration[];
  behaviors: Behavior[];
  needs: Need[];
  scenarios: Scenario[];
  quotes: string[]; // Real quotes from research
  researchSources: string[]; // Where data came from
  priority: 'primary' | 'secondary' | 'tertiary';
  accessibilityNeeds?: string[];
}

interface Goal {
  description: string;
  motivation: string; // Why this matters
  priority: 'high' | 'medium' | 'low';
}

interface Frustration {
  description: string;
  currentWorkaround?: string;
  impact: 'high' | 'medium' | 'low';
}

interface Behavior {
  description: string;
  frequency: string;
  context: string;
}

interface Need {
  description: string;
  type: 'functional' | 'emotional' | 'social';
  currentMet: boolean;
}

interface Scenario {
  title: string;
  context: string;
  steps: string[];
  successCriteria: string;
}

// Example: E-commerce User Persona
const bargainHunterBeth: UserPersona = {
  id: 'persona-001',
  name: 'Bargain Hunter Beth',
  tagline: 'Will spend hours to save $10',
  photo: '/personas/beth.jpg',
  demographics: {
    age: 34,
    location: 'Suburban Chicago',
    occupation: 'Elementary School Teacher',
    income: '$52,000/year',
    education: 'Bachelors Degree',
    family: 'Married, 2 kids'
  },
  bio: `
Beth is a budget-conscious mom who takes pride in finding great deals. 
She shops online during her lunch break or after the kids go to bed. 
She follows deal accounts on social media and subscribes to deal 
newsletters. She is willing to try new stores if the price is right, 
but only if the return policy is clear and fair.
  `,
  goals: [
    {
      description: 'Find the best possible price',
      motivation: 'Needs to stretch household budget',
      priority: 'high'
    },
    {
      description: 'Feel confident in purchase decisions',
      motivation: 'Cannot afford mistakes',
      priority: 'high'
    },
    {
      description: 'Discover new products within budget',
      motivation: 'Wants variety without overspending',
      priority: 'medium'
    }
  ],
  frustrations: [
    {
      description: 'Hidden costs at checkout (shipping, taxes)',
      currentWorkaround: 'Adds items to cart early to see total',
      impact: 'high'
    },
    {
      description: 'Unclear return policies',
      currentWorkaround: 'Only shops at stores with known policies',
      impact: 'high'
    },
    {
      description: 'Out of stock items after adding to cart',
      currentWorkaround: 'Checks stock before adding to wishlist',
      impact: 'medium'
    }
  ],
  behaviors: [
    {
      description: 'Compares prices across 3-5 sites',
      frequency: 'Every purchase',
      context: 'Before checkout'
    },
    {
      description: 'Searches for coupon codes',
      frequency: 'Every purchase',
      context: 'Before checkout'
    },
    {
      description: 'Reads product reviews',
      frequency: 'Always',
      context: 'Before purchasing'
    },
    {
      description: 'Abandons cart if total exceeds expectation',
      frequency: 'Often',
      context: 'At checkout'
    }
  ],
  needs: [
    {
      description: 'See total cost early in the process',
      type: 'functional',
      currentMet: false
    },
    {
      description: 'Trust that she is getting a good deal',
      type: 'emotional',
      currentMet: false
    },
    {
      description: 'Clear, fair return policy',
      type: 'functional',
      currentMet: false
    },
    {
      description: 'Feel smart about her purchases',
      type: 'emotional',
      currentMet: true
    }
  ],
  scenarios: [
    {
      title: 'Back-to-School Shopping',
      context: 'Beth needs to buy school supplies and clothes for her two kids. She has a budget of $300 and needs to maximize value.',
      steps: [
        'Makes a list of needed items',
        'Checks multiple stores for sales',
        'Looks for coupon codes',
        'Compares total costs including shipping',
        'Reads reviews on unfamiliar brands',
        'Completes purchase'
      ],
      successCriteria: 'Stays within budget, gets all needed items, feels confident in quality'
    }
  ],
  quotes: [
    'I dont mind spending time if it means saving money.',
    'I hate when I get to checkout and the price suddenly doubles.',
    'If I cant return it easily, I am not buying it.',
    'I always check Honey before I checkout.'
  ],
  researchSources: [
    'User interviews (n=8)',
    'Survey responses (n=234)',
    'Analytics data',
    'Customer support tickets'
  ],
  priority: 'primary',
  accessibilityNeeds: [
    'Clear, readable fonts',
    'High contrast for outdoor viewing'
  ]
};

// Persona Creation Process
class PersonaCreator {
  async createPersonas(researchData: ResearchData[]): Promise<UserPersona[]> {
    // Step 1: Identify behavioral patterns
    const patterns = this.identifyPatterns(researchData);

    // Step 2: Group by behaviors (not demographics)
    const segments = this.groupByBehavior(patterns);

    // Step 3: Create persona for each primary segment
    const personas: UserPersona[] = [];
    for (const segment of segments) {
      if (segment.size >= 0.2) { // At least 20% of users
        personas.push(await this.createPersona(segment));
      }
    }

    return personas;
  }

  private identifyPattern(data: ResearchData[]): BehavioralPattern[] {
    // Analyze interview transcripts, survey data, analytics
    // Look for common behaviors, goals, pain points
    return [];
  }

  private groupByBehavior(patterns: BehavioralPattern[]): UserSegment[] {
    // Cluster users by behavioral similarity
    // Not by demographics!
    return [];
  }

  private async createPersona(segment: UserSegment): Promise<UserPersona> {
    // Synthesize data into persona format
    // Use real quotes from research
    // Create representative (not average) persona
    return {} as UserPersona;
  }
}

// Persona Validation Checklist
const personaValidationChecklist = [
  'Based on real research data (not assumptions)',
  'Represents a meaningful user segment (20%+ of users)',
  'Includes specific goals and frustrations',
  'Has representative quotes from real users',
  'Describes behaviors, not just demographics',
  'Actionable for design decisions',
  'Reviewed and validated by stakeholders',
  'Accessible and inclusive representation'
];
```

### 5. Journey Mapping

```typescript
interface JourneyMap {
  persona: UserPersona;
  scenario: string;
  stages: JourneyStage[];
  insights: Insight[];
  opportunities: Opportunity[];
  metrics: JourneyMetric[];
}

interface JourneyStage {
  name: string;
  description: string;
  actions: Action[];
  thoughts: string[];
  emotions: EmotionPoint[];
  touchpoints: Touchpoint[];
  painPoints: PainPoint[];
  opportunities: string[];
}

interface Action {
  description: string;
  channel: 'online' | 'in-person' | 'phone' | 'app';
  duration?: string;
}

interface EmotionPoint {
  rating: number; // 1-10
  label: string; // e.g., 'Frustrated', 'Delighted'
  reason: string;
}

interface Touchpoint {
  name: string;
  type: 'website' | 'app' | 'email' | 'social' | 'support' | 'product';
  quality: 'good' | 'neutral' | 'bad';
}

interface PainPoint {
  description: string;
  severity: 'critical' | 'major' | 'minor';
  frequency: 'always' | 'often' | 'sometimes';
  impact: string;
}

interface Opportunity {
  title: string;
  description: string;
  stage: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  owner?: string;
}

// Example: E-commerce Purchase Journey
const purchaseJourney: JourneyMap = {
  persona: bargainHunterBeth,
  scenario: 'Beth is shopping for back-to-school clothes for her kids',
  stages: [
    {
      name: 'Awareness',
      description: 'Beth realizes she needs to start shopping for school supplies',
      actions: [
        { description: 'Checks calendar for school start date', channel: 'offline' },
        { description: 'Makes list of needed items', channel: 'offline' },
        { description: 'Searches Google for back-to-school sales', channel: 'online' }
      ],
      thoughts: [
        'School starts in 3 weeks, I need to start shopping',
        'I hope I can find good deals this year',
        'Let me check what we already have at home'
      ],
      emotions: [
        { rating: 5, label: 'Neutral', reason: 'Task-oriented mindset' }
      ],
      touchpoints: [
        { name: 'Google Search', type: 'website', quality: 'good' },
        { name: 'Email newsletters', type: 'email', quality: 'good' }
      ],
      painPoints: [
        {
          description: 'Too many generic deals, hard to find specific items',
          severity: 'minor',
          frequency: 'often',
          impact: 'Wastes time filtering irrelevant deals'
        }
      ],
      opportunities: [
        'Create back-to-school shopping list builder',
        'Send personalized deal alerts based on previous purchases'
      ]
    },
    {
      name: 'Research',
      description: 'Beth compares options across multiple stores',
      actions: [
        { description: 'Visits 3-5 store websites', channel: 'online' },
        { description: 'Compares prices for same items', channel: 'online' },
        { description: 'Reads product reviews', channel: 'online' },
        { description: 'Checks social media for promo codes', channel: 'social' }
      ],
      thoughts: [
        'This store has better prices but shipping is expensive',
        'Are these reviews real?',
        'Let me check if there is a coupon code'
      ],
      emotions: [
        { rating: 4, label: 'Anxious', reason: 'Worried about making wrong choice' },
        { rating: 6, label: 'Hopeful', reason: 'Might find a good deal' }
      ],
      touchpoints: [
        { name: 'Store websites', type: 'website', quality: 'neutral' },
        { name: 'Review sites', type: 'website', quality: 'good' },
        { name: 'RetailMeNot', type: 'website', quality: 'good' }
      ],
      painPoints: [
        {
          description: 'Prices change between research and checkout',
          severity: 'major',
          frequency: 'sometimes',
          impact: 'Frustration, loss of trust'
        },
        {
          description: 'Fake or incentivized reviews',
          severity: 'major',
          frequency: 'often',
          impact: 'Cannot trust product quality assessments'
        }
      ],
      opportunities: [
        'Price match guarantee',
        'Verified purchase badges on reviews',
        'Price drop alerts for saved items'
      ]
    },
    {
      name: 'Purchase',
      description: 'Beth completes the checkout process',
      actions: [
        { description: 'Adds items to cart', channel: 'online' },
        { description: 'Enters shipping information', channel: 'online' },
        { description: 'Applies coupon code', channel: 'online' },
        { description: 'Reviews order total', channel: 'online' },
        { description: 'Completes payment', channel: 'online' }
      ],
      thoughts: [
        'Wait, where did the shipping cost come from?',
        'This is more than I expected',
        'Let me try this coupon code',
        'Is this site secure?'
      ],
      emotions: [
        { rating: 3, label: 'Frustrated', reason: 'Hidden costs at checkout' },
        { rating: 7, label: 'Satisfied', reason: 'Coupon code worked' },
        { rating: 8, label: 'Relieved', reason: 'Order confirmed' }
      ],
      touchpoints: [
        { name: 'Shopping cart', type: 'website', quality: 'neutral' },
        { name: 'Checkout flow', type: 'website', quality: 'bad' },
        { name: 'Payment gateway', type: 'website', quality: 'good' },
        { name: 'Order confirmation email', type: 'email', quality: 'good' }
      ],
      painPoints: [
        {
          description: 'Shipping cost shown only at final step',
          severity: 'critical',
          frequency: 'always',
          impact: 'Cart abandonment, frustration'
        },
        {
          description: 'Coupon code box hard to find',
          severity: 'minor',
          frequency: 'often',
          impact: 'Anxiety about missing savings'
        }
      ],
      opportunities: [
        'Show shipping calculator on product page',
        'Auto-apply best coupon code',
        'Progress indicator with cost breakdown'
      ]
    },
    {
      name: 'Delivery',
      description: 'Beth waits for and receives the order',
      actions: [
        { description: 'Checks order status', channel: 'online' },
        { description: 'Tracks package', channel: 'online' },
        { description: 'Receives delivery', channel: 'offline' }
      ],
      thoughts: [
        'Where is my package?',
        'Will it arrive before school starts?',
        'I hope everything is in stock'
      ],
      emotions: [
        { rating: 5, label: 'Impatient', reason: 'Waiting for delivery' },
        { rating: 8, label: 'Happy', reason: 'Package arrived' }
      ],
      touchpoints: [
        { name: 'Order status page', type: 'website', quality: 'good' },
        { name: 'Tracking email', type: 'email', quality: 'good' },
        { name: 'Delivery', type: 'offline', quality: 'good' }
      ],
      painPoints: [
        {
          description: 'No proactive delay notifications',
          severity: 'major',
          frequency: 'sometimes',
          impact: 'Anxiety, last-minute scrambling'
        }
      ],
      opportunities: [
        'Proactive delay notifications',
        'Delivery date guarantee or compensation'
      ]
    },
    {
      name: 'Post-Purchase',
      description: 'Beth evaluates her purchase decision',
      actions: [
        { description: 'Unpacks items', channel: 'offline' },
        { description: 'Checks quality', channel: 'offline' },
        { description: 'Tries on kids', channel: 'offline' },
        { description: 'Decides whether to keep or return', channel: 'offline' }
      ],
      thoughts: [
        'The quality is better than expected!',
        'This one does not fit, need to return',
        'The return process better be easy'
      ],
      emotions: [
        { rating: 9, label: 'Delighted', reason: 'Quality exceeded expectations' },
        { rating: 4, label: 'Concerned', reason: 'Might need to return' }
      ],
      touchpoints: [
        { name: 'Product packaging', type: 'product', quality: 'good' },
        { name: 'Product quality', type: 'product', quality: 'good' },
        { name: 'Return policy page', type: 'website', quality: 'neutral' }
      ],
      painPoints: [
        {
          description: 'Return policy hard to find',
          severity: 'major',
          frequency: 'always',
          impact: 'Anxiety about potential returns'
        }
      ],
      opportunities: [
        'Include return label in package',
        'Clear return policy on product page',
        'Easy online return initiation'
      ]
    }
  ],
  insights: [
    {
      title: 'Trust is built through transparency',
      description: 'Hidden costs at checkout destroy trust built during research phase',
      evidence: ['Emotional low at checkout', 'Multiple user quotes about hidden fees'],
      implication: 'Show all costs early, even if it reduces initial conversion'
    },
    {
      title: 'Deal-seeking is emotional, not just financial',
      description: 'Users derive satisfaction from feeling smart about deals',
      evidence: ['Quotes about pride in finding deals', 'Time spent on coupon search'],
      implication: 'Celebrate savings, show comparison to regular price'
    }
  ],
  opportunities: [
    {
      title: 'Transparent pricing calculator',
      description: 'Show total cost including shipping on product page',
      stage: 'Research',
      impact: 'high',
      effort: 'medium',
      owner: 'Product Team'
    },
    {
      title: 'Auto-apply best coupon',
      description: 'Automatically apply best available coupon at checkout',
      stage: 'Purchase',
      impact: 'high',
      effort: 'low',
      owner: 'Engineering Team'
    }
  ],
  metrics: [
    { name: 'Cart abandonment rate', current: 68, target: 50 },
    { name: 'Time to purchase', current: '4.2 days', target: '2 days' },
    { name: 'Customer satisfaction', current: 3.8, target: 4.5 }
  ]
};
```

### 6. Research Synthesis & Analysis

```typescript
interface ResearchFinding {
  id: string;
  title: string;
  description: string;
  type: 'insight' | 'pain-point' | 'need' | 'behavior' | 'attitude';
  confidence: 'high' | 'medium' | 'low';
  evidence: Evidence[];
  implications: string[];
  recommendations: string[];
  tags: string[];
}

interface Evidence {
  type: 'quote' | 'observation' | 'metric' | 'artifact';
  source: string; // Participant ID, analytics, etc.
  content: string;
  context: string;
}

class ResearchSynthesizer {
  private findings: ResearchFinding[] = [];

  // Affinity Diagramming
  async createAffinityDiagram(notes: ResearchNote[]): Promise<AffinityCluster[]> {
    // Step 1: Write each observation on a card
    const cards = notes.map(note => ({
      id: note.id,
      content: note.content,
      source: note.source
    }));

    // Step 2: Group similar cards (can use ML clustering)
    const clusters = this.clusterBySimilarity(cards);

    // Step 3: Name each cluster
    const namedClusters = clusters.map(cluster => ({
      ...cluster,
      name: this.generateClusterName(cluster),
      insights: this.extractInsights(cluster)
    }));

    return namedClusters;
  }

  // Thematic Analysis
  async performThematicAnalysis(transcripts: string[]): Promise<Theme[]> {
    // Step 1: Familiarization
    const familiarization = await this.readAndNote(transcripts);

    // Step 2: Generate initial codes
    const codes = await this.generateCodes(familiarization);

    // Step 3: Search for themes
    const themes = this.groupCodesIntoThemes(codes);

    // Step 4: Review themes
    const reviewedThemes = this.reviewAndRefine(themes);

    // Step 5: Define and name themes
    const finalThemes = this.defineAndNameThemes(reviewedThemes);

    return finalThemes;
  }

  // Jobs to be Done Analysis
  async analyzeJobsToBeDone(interviews: Interview[]): Promise<JobStory[]> {
    const jobStories: JobStory[] = [];

    for (const interview of interviews) {
      // Identify situations
      const situations = this.extractSituations(interview);

      for (const situation of situations) {
        // Identify motivation
        const motivation = this.extractMotivation(interview, situation);

        // Identify expected outcome
        const outcome = this.extractExpectedOutcome(interview, situation);

        jobStories.push({
          situation,
          motivation,
          expectedOutcome: outcome,
          evidence: interview.id
        });
      }
    }

    // Cluster similar job stories
    return this.clusterJobStories(jobStories);
  }

  // Generate Insights
  generateInsights(findings: ResearchFinding[]): Insight[] {
    const insights: Insight[] = [];

    // Look for patterns across findings
    const patterns = this.findPatterns(findings);

    for (const pattern of patterns) {
      insights.push({
        title: this.generateInsightTitle(pattern),
        description: this.generateInsightDescription(pattern),
        evidence: pattern.findings.flatMap(f => f.evidence),
        implications: this.generateImplications(pattern),
        confidence: this.calculateConfidence(pattern)
      });
    }

    return insights;
  }

  // Prioritize Recommendations
  prioritizeRecommendations(
    recommendations: Recommendation[],
    criteria: PrioritizationCriteria
  ): PrioritizedRecommendation[] {
    return recommendations.map(rec => ({
      ...rec,
      score: this.calculatePriorityScore(rec, criteria),
      priority: this.calculatePriority(rec, criteria)
    })).sort((a, b) => b.score - a.score);
  }
}

// Research Repository Structure
interface ResearchRepository {
  studies: ResearchStudy[];
  findings: ResearchFinding[];
  personas: UserPersona[];
  journeyMaps: JourneyMap[];
  insights: Insight[];
  tags: Tag[];
}

interface ResearchStudy {
  id: string;
  title: string;
  type: string;
  date: Date;
  participants: Participant[];
  goals: string[];
  methods: string[];
  findings: ResearchFinding[];
  artifacts: string[]; // Recordings, transcripts, notes
  researchers: string[];
  status: 'planned' | 'in-progress' | 'complete';
}

// Example: Research Finding
const checkoutFinding: ResearchFinding = {
  id: 'finding-001',
  title: 'Hidden Shipping Costs Cause Cart Abandonment',
  description: `
Users consistently express frustration and surprise when shipping costs 
are revealed only at the final checkout step. This leads to cart 
abandonment and decreased trust in the platform.
  `,
  type: 'pain-point',
  confidence: 'high',
  evidence: [
    {
      type: 'quote',
      source: 'Participant 3',
      content: 'Ugh, $12 for shipping? I was not expecting that. Let me check other sites.',
      context: 'Usability test, checkout task'
    },
    {
      type: 'quote',
      source: 'Participant 7',
      content: 'Why do they wait until the end to show me the real price?',
      context: 'Post-test interview'
    },
    {
      type: 'metric',
      source: 'Analytics',
      content: '68% cart abandonment rate, 34% exit at shipping step',
      context: 'Q4 2025 data'
    },
    {
      type: 'observation',
      source: 'Usability Test',
      content: '5 of 8 participants hesitated or expressed surprise at shipping cost',
      context: 'Checkout usability study'
    }
  ],
  implications: [
    'Users feel deceived by hidden costs',
    'Trust is damaged at critical conversion point',
    'Price comparison happens mid-checkout',
    'Free shipping threshold may be more important than product price'
  ],
  recommendations: [
    'Show shipping calculator on product page',
    'Display estimated total (including shipping) in cart',
    'Consider free shipping threshold prominently',
    'Test flat-rate shipping vs calculated'
  ],
  tags: ['checkout', 'shipping', 'cart-abandonment', 'trust', 'pricing']
};
```

---

## Best Practices

### 1. Triangulate Methods
```typescript
// ✅ Good: Multiple methods for confidence
const researchPlan = {
  discovery: [
    'User interviews (n=8)',
    'Survey (n=200+)',
    'Analytics review'
  ],
  validation: [
    'Usability testing (n=5)',
    'A/B test',
    'Follow-up interviews'
  ]
};

// ❌ Bad: Single method
const weakPlan = {
  discovery: ['Survey only'] // No context on why
};
```

### 2. Ask Open-Ended Questions
```typescript
// ✅ Good: Open-ended
'Walk me through the last time you...'
'Tell me more about that.'
'What was that experience like?'
'How did that make you feel?'

// ❌ Bad: Leading/closed
'Do you like this feature?' (Yes/No)
'Would you use this?' (Hypothetical)
'Don t you think this is better?' (Leading)
```

### 3. Synthesize Systematically
```typescript
// ✅ Good: Structured synthesis
const synthesis = {
  steps: [
    'Transcribe interviews',
    'Extract key quotes',
    'Affinity diagramming',
    'Identify themes',
    'Generate insights',
    'Create recommendations'
  ]
};

// ❌ Bad: Ad-hoc
const weakSynthesis = {
  steps: ['Read notes', 'Write summary'] // Missing rigor
};
```

---

## Anti-Patterns

### ❌ Asking Users What They Want
```typescript
// ❌ Bad: Users are not designers
'What features would you like?'
'How would you design this?'

// ✅ Good: Understand problems, not solutions
'Tell me about the last time you...'
'What was frustrating about that?'
'How do you currently solve this?'
```

### ❌ Confirmation Bias
```typescript
// ❌ Bad: Seeking validation only
'Only recruit users who like our product'
'Ignore negative feedback'
'Highlight only positive quotes'

// ✅ Good: Seek disconfirming evidence
'Recruit diverse users including critics'
'Actively look for contradictory data'
'Include negative findings in report'
```

### ❌ Research Without Action
```typescript
// ❌ Bad: Report sits on shelf
const weakOutcome = {
  deliverable: '50-page PDF',
  audience: 'Stakeholders only',
  action: 'None'
};

// ✅ Good: Actionable insights
const strongOutcome = {
  deliverable: 'Insight cards + recommendations',
  audience: 'Entire product team',
  action: 'Prioritized backlog items',
  followUp: 'Review in 4 weeks'
};
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Research Coverage** | 100% of major features | Informed decisions |
| **Time to Insights** | <2 weeks | Speed of learning |
| **Insight Adoption Rate** | >70% | Research impact |
| **Task Success Rate** | >80% | Usability |
| **SUS Score** | >68 (above average) | Overall usability |
| **NPS** | Track trend | Loyalty indicator |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **UserTesting** | Remote usability testing | Quick turnaround |
| **Lookback** | Live usability testing | Moderated sessions |
| **Dovetail** | Research analysis | Qualitative synthesis |
| **Optimal Workshop** | IA testing | Card sorting, tree testing |
| **Maze** | Prototype testing | Unmoderated tests |
| **Hotjar** | Behavioral analytics | Heatmaps, recordings |
| **Typeform** | Surveys | Beautiful surveys |

---

## Implementation Checklist

### Planning
- [ ] Research questions defined
- [ ] Methods selected appropriately
- [ ] Participant criteria defined
- [ ] Recruitment planned
- [ ] Materials prepared

### Execution
- [ ] Consent forms ready
- [ ] Recording equipment tested
- [ ] Interview guide rehearsed
- [ ] Note-taking system ready
- [ ] Sessions recorded

### Analysis
- [ ] Transcripts completed
- [ ] Affinity diagramming done
- [ ] Themes identified
- [ ] Insights synthesized
- [ ] Recommendations prioritized

### Sharing
- [ ] Report created
- [ ] Insights shared with team
- [ ] Recommendations added to backlog
- [ ] Stakeholders briefed
- [ ] Repository updated

---

## Related Skills

- **UI/UX Design**: `skills/product/ui-ux-design/ui_ux_design_v1/SKILL.md`
- **UX Engineering**: `skills/product/ux-engineering/ux_engineering_v1/SKILL.md`
- **Product Design**: `skills/product/product-design/product_design_v1/SKILL.md`
- **Accessibility WCAG**: `skills/governance/accessibility-wcag/accessibility_wcag_skill_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
