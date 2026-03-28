---
name: ui_ux_design_v1
description: UI/UX design principles, visual design, interaction design, design systems, accessibility, and human-centered design without AI-slop
version: 1.0.0
tags: [ui, ux, design, visual-design, interaction-design, design-systems, accessibility, human-centered-design]
category: product
triggers:
  keywords: [ui design, ux design, visual design, interaction design, design system, accessibility design, interface design]
  filePatterns: [design/*.ts, ui/*.tsx, components/*.tsx, styles/*.css]
  commands: [ui design, ux design, design review]
  projectArchetypes: [web-application, mobile-app, saas, e-commerce, design-system]
  modes: [greenfield, redesign, optimization, design-system]
prerequisites:
  - ux_research_v1
  - accessibility_wcag_skill_v1
recommended_structure:
  directories:
    - src/design/
    - src/design/tokens/
    - src/design/components/
    - src/design/patterns/
    - src/design/guidelines/
workflow:
  setup:
    - Define design principles
    - Audit existing design
    - Establish design tokens
    - Create component inventory
  generate:
    - Design component library
    - Create interaction patterns
    - Build design documentation
    - Implement accessibility
  test:
    - Design review sessions
    - Accessibility audits
    - Visual regression tests
    - User testing
best_practices:
  - Design with real content (no lorem ipsum)
  - Prioritize accessibility from start
  - Build reusable components
  - Document design decisions
  - Test with real users
  - Maintain design consistency
  - Design for all states (loading, error, empty)
anti_patterns:
  - AI-generated generic designs
  - Style over substance
  - Inconsistent patterns
  - Ignoring accessibility
  - Designing in isolation
  - No design documentation
  - Copying trends without purpose
tools:
  - Figma / Sketch
  - Storybook
  - Chromatic (visual testing)
  - axe DevTools
  - Style Dictionary
metrics:
  - Design consistency score
  - Component reuse rate
  - Accessibility compliance
  - Design-to-dev handoff time
  - User task success rate
---

# UI/UX Design Skill

## Overview

This skill provides comprehensive guidance on UI/UX design principles, visual design fundamentals, interaction design patterns, design systems, accessibility implementation, and human-centered design practices. It emphasizes thoughtful, intentional design over AI-generated generic solutions.

Great UI/UX design is invisible - it enables users to accomplish their goals without friction. This skill covers the principles and practices for creating interfaces that are beautiful, usable, and accessible.

## When to Use

- **New product design** (establish foundation)
- **Redesign projects** (improve usability)
- **Design system creation** (ensure consistency)
- **Accessibility improvements** (inclusive design)
- **Before development** (reduce rework)
- **Design debt reduction** (improve consistency)

## When NOT to Use

- **Internal tools** with limited users (minimal viable design)
- **Prototypes for validation** (speed over polish)
- **When established design system exists** (use existing patterns)

---

## Core Concepts

### 1. Design Principles Framework

```typescript
interface DesignPrinciple {
  name: string;
  description: string;
  rationale: string;
  examples: {
    good: string[];
    bad: string[];
  };
  measurement: string; // How to know we are following this
}

// Example: Core Design Principles
const designPrinciples: DesignPrinciple[] = [
  {
    name: 'Clarity Over Cleverness',
    description: 'Users should understand immediately what to do, not decode our interface.',
    rationale: `
Every moment of confusion is friction. Users come to accomplish tasks, 
not to figure out our interface. Clear, obvious design reduces cognitive 
load and helps users succeed faster.
    `,
    examples: {
      good: [
        'Button labels that describe the action ("Save Changes" not "Submit")',
        'Form labels above fields (not placeholder-only)',
        'Error messages that explain how to fix the problem',
        'Icons with text labels for important actions'
      ],
      bad: [
        'Mystery meat navigation (icons without labels)',
        'Clever copy that obscures meaning',
        'Hidden actions behind gestures without hints',
        'Using icons where text would be clearer'
      ]
    },
    measurement: 'Task completion rate, time on task, support tickets'
  },
  {
    name: 'Consistency Creates Confidence',
    description: 'Similar things should look and behave similarly throughout the product.',
    rationale: `
Consistency reduces learning curve and builds user confidence. When 
patterns are predictable, users can focus on their task instead of 
relearning the interface.
    `,
    examples: {
      good: [
        'Same button styles for same actions across all pages',
        'Consistent form validation behavior',
        'Uniform spacing and typography scales',
        'Predictable navigation patterns'
      ],
      bad: [
        'Different button styles for primary actions',
        'Inconsistent form error handling',
        'Multiple typography systems',
        'Navigation that changes between sections'
      ]
    },
    measurement: 'Design audit scores, component reuse rate'
  },
  {
    name: 'Accessibility Is Not Optional',
    description: 'Design for the full range of human ability from the start.',
    rationale: `
15% of the global population has a disability. Accessible design benefits 
everyone - parents holding babies, people with temporary injuries, users 
in bright sunlight. It is also legally required in many contexts.
    `,
    examples: {
      good: [
        'Color contrast meeting WCAG AA standards',
        'Keyboard navigable interfaces',
        'Screen reader compatible components',
        'Focus indicators on interactive elements'
      ],
      bad: [
        'Text that fails contrast requirements',
        'Actions only available via mouse',
        'Images without alt text',
        'Custom controls without ARIA labels'
      ]
    },
    measurement: 'WCAG compliance level, screen reader testing'
  },
  {
    name: 'Content First, Design Second',
    description: 'Design with real content, not lorem ipsum and perfect mock data.',
    rationale: `
Real content is messy - long names, short answers, missing data. Designing 
with real content reveals edge cases and ensures the design works in 
production, not just in mocks.
    `,
    examples: {
      good: [
        'Designing with longest expected user names',
        'Testing layouts with empty states',
        'Considering error state designs',
        'Accounting for user-generated content variability'
      ],
      bad: [
        'Lorem ipsum in all mockups',
        'Perfect 10-word headlines only',
        'No consideration for empty states',
        'Designs that break with real data'
      ]
    },
    measurement: 'Design-to-production variance, content fit issues'
  },
  {
    name: 'Progressive Disclosure',
    description: 'Show only what is needed now, reveal more as needed.',
    rationale: `
Too much information overwhelms users. Show the essential information 
and actions first, then provide paths to more detail for those who need it.
    `,
    examples: {
      good: [
        'Basic search first, advanced filters on demand',
        'Summary view with expandable details',
        'Multi-step forms for complex tasks',
        'Contextual help, not walls of text'
      ],
      bad: [
        'All form fields visible at once',
        'Every feature on the dashboard',
        'Long scrolling pages of options',
        'Help documentation as first view'
      ]
    },
    measurement: 'Feature discovery rate, user confusion points'
  }
];

// Design Principle Application
class DesignPrincipleChecker {
  async reviewDesign(
    designArtifacts: DesignArtifact[],
    principles: DesignPrinciple[]
  ): Promise<DesignReview> {
    const violations: PrincipleViolation[] = [];

    for (const principle of principles) {
      const violationsForPrinciple = await this.checkPrinciple(
        designArtifacts,
        principle
      );
      violations.push(...violationsForPrinciple);
    }

    return {
      passed: violations.length === 0,
      violations,
      score: this.calculateScore(violations, designArtifacts.length)
    };
  }

  private async checkPrinciple(
    artifacts: DesignArtifact[],
    principle: DesignPrinciple
  ): Promise<PrincipleViolation[]> {
    const violations: PrincipleViolation[] = [];

    switch (principle.name) {
      case 'Clarity Over Cleverness':
        violations.push(...this.checkClarity(artifacts));
        break;
      case 'Consistency Creates Confidence':
        violations.push(...this.checkConsistency(artifacts));
        break;
      case 'Accessibility Is Not Optional':
        violations.push(...this.checkAccessibility(artifacts));
        break;
      // ... etc
    }

    return violations;
  }
}
```

### 2. Visual Design Fundamentals

```typescript
interface DesignTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  borders: BorderTokens;
  shadows: ShadowTokens;
  breakpoints: BreakpointTokens;
  zIndices: ZIndexTokens;
}

interface ColorTokens {
  // Semantic color names, not literal
  primary: {
    main: string;
    light: string;
    dark: string;
    contrast: string; // For text on primary
  };
  secondary: {
    main: string;
    light: string;
    dark: string;
  };
  success: {
    main: string;
    light: string;
    dark: string;
  };
  warning: {
    main: string;
    light: string;
    dark: string;
  };
  error: {
    main: string;
    light: string;
    dark: string;
  };
  neutral: {
    white: string;
    gray100: string;
    gray200: string;
    gray300: string;
    gray400: string;
    gray500: string;
    gray600: string;
    gray700: string;
    gray800: string;
    gray900: string;
    black: string;
  };
}

// Example Design Tokens
const designTokens: DesignTokens = {
  colors: {
    primary: {
      main: '#0066CC', // Blue
      light: '#3399FF',
      dark: '#004C99',
      contrast: '#FFFFFF'
    },
    secondary: {
      main: '#6B7280', // Gray
      light: '#9CA3AF',
      dark: '#4B5563'
    },
    success: {
      main: '#059669', // Green
      light: '#34D399',
      dark: '#047857'
    },
    warning: {
      main: '#D97706', // Amber
      light: '#FBBF24',
      dark: '#B45309'
    },
    error: {
      main: '#DC2626', // Red
      light: '#F87171',
      dark: '#B91C1C'
    },
    neutral: {
      white: '#FFFFFF',
      gray100: '#F3F4F6',
      gray200: '#E5E7EB',
      gray300: '#D1D5DB',
      gray400: '#9CA3AF',
      gray500: '#6B7280',
      gray600: '#4B5563',
      gray700: '#374151',
      gray800: '#1F2937',
      gray900: '#111827',
      black: '#000000'
    }
  },
  typography: {
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'Fira Code, "Courier New", monospace'
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem'  // 36px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    },
    lineHeight: {
      none: '1',
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    }
  },
  spacing: {
    0: '0',
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
    16: '4rem'     // 64px
  },
  borders: {
    radius: {
      none: '0',
      sm: '0.125rem',  // 2px
      default: '0.25rem', // 4px
      md: '0.375rem',   // 6px
      lg: '0.5rem',     // 8px
      xl: '0.75rem',    // 12px
      full: '9999px'
    },
    width: {
      none: '0',
      thin: '1px',
      default: '2px',
      thick: '4px'
    }
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    default: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  zIndices: {
    hide: '-1',
    base: '0',
    dropdown: '1000',
    sticky: '1100',
    fixed: '1200',
    modalBackdrop: '1300',
    modal: '1400',
    popover: '1500',
    tooltip: '1600'
  }
};

// Color Contrast Checker
class ColorContrastChecker {
  // WCAG 2.1 contrast calculation
  async checkContrast(
    foreground: string,
    background: string
  ): Promise<ContrastResult> {
    const lum1 = this.getLuminance(foreground);
    const lum2 = this.getLuminance(background);
    
    const ratio = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
    
    return {
      ratio,
      aa: {
        normal: ratio >= 4.5,
        large: ratio >= 3.0
      },
      aaa: {
        normal: ratio >= 7.0,
        large: ratio >= 4.5
      },
      passes: ratio >= 4.5 // At least AA for normal text
    };
  }

  private getLuminance(hexColor: string): number {
    const rgb = this.hexToRgb(hexColor);
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
}
```

### 3. Component Design Patterns

```typescript
interface ComponentDesign {
  name: string;
  description: string;
  anatomy: ComponentPart[];
  states: ComponentState[];
  variants: ComponentVariant[];
  accessibility: AccessibilityRequirements;
  guidelines: DesignGuideline[];
}

interface ComponentPart {
  name: string;
  description: string;
  required: boolean;
}

interface ComponentState {
  name: 'default' | 'hover' | 'focus' | 'active' | 'disabled' | 'loading' | 'error';
  description: string;
  visualChanges: string[];
}

interface ComponentVariant {
  name: string;
  description: string;
  whenToUse: string;
  properties: Record<string, any>;
}

// Button Component Design
const buttonDesign: ComponentDesign = {
  name: 'Button',
  description: 'Buttons allow users to take actions or make choices.',
  anatomy: [
    { name: 'Container', description: 'The button background/border', required: true },
    { name: 'Label', description: 'Text describing the action', required: true },
    { name: 'Icon', description: 'Optional icon to supplement label', required: false },
    { name: 'Loading Indicator', description: 'Spinner when action is in progress', required: false }
  ],
  states: [
    {
      name: 'default',
      description: 'Normal resting state',
      visualChanges: ['Standard background/border color', 'Normal opacity']
    },
    {
      name: 'hover',
      description: 'Mouse pointer is over button',
      visualChanges: ['Slightly darker background', 'Elevated shadow']
    },
    {
      name: 'focus',
      description: 'Button has keyboard focus',
      visualChanges: ['Visible focus ring (2px, high contrast)', 'No background change']
    },
    {
      name: 'active',
      description: 'Button is being clicked',
      visualChanges: ['Darker background', 'Pressed appearance']
    },
    {
      name: 'disabled',
      description: 'Button is not interactive',
      visualChanges: ['Reduced opacity (50%)', 'No hover state', 'Cursor: not-allowed']
    },
    {
      name: 'loading',
      description: 'Action is in progress',
      visualChanges: ['Show spinner', 'Disable interactions', 'Reduce label visibility']
    }
  ],
  variants: [
    {
      name: 'Primary',
      description: 'Main call-to-action buttons',
      whenToUse: 'Use for the most important action on a page',
      properties: {
        background: 'colors.primary.main',
        text: 'colors.primary.contrast',
        border: 'none'
      }
    },
    {
      name: 'Secondary',
      description: 'Secondary actions',
      whenToUse: 'Use for alternative actions to primary',
      properties: {
        background: 'transparent',
        text: 'colors.primary.main',
        border: '2px solid colors.primary.main'
      }
    },
    {
      name: 'Tertiary',
      description: 'Low-emphasis actions',
      whenToUse: 'Use for less important actions',
      properties: {
        background: 'transparent',
        text: 'colors.neutral.gray600',
        border: 'none'
      }
    },
    {
      name: 'Danger',
      description: 'Destructive actions',
      whenToUse: 'Use for delete, remove, or destructive actions',
      properties: {
        background: 'colors.error.main',
        text: '#FFFFFF',
        border: 'none'
      }
    }
  ],
  accessibility: {
    requirements: [
      'Minimum size: 44x44px touch target',
      'Focus indicator must be visible (3:1 contrast)',
      'Must be keyboard accessible (Enter and Space)',
      'Loading state must announce to screen readers',
      'Disabled buttons should use aria-disabled',
      'Icon-only buttons must have aria-label'
    ],
    ariaAttributes: {
      disabled: 'aria-disabled="true"',
      loading: 'aria-busy="true"',
      pressed: 'aria-pressed (for toggle buttons)'
    }
  },
  guidelines: [
    {
      principle: 'Clarity Over Cleverness',
      guidance: 'Use action verbs in button labels ("Save Changes" not "Submit")'
    },
    {
      principle: 'Progressive Disclosure',
      guidance: 'Use primary buttons sparingly - only one per section'
    },
    {
      principle: 'Accessibility Is Not Optional',
      guidance: 'Always maintain 4.5:1 contrast ratio for button text'
    },
    {
      principle: 'Consistency Creates Confidence',
      guidance: 'Same action should use same button variant everywhere'
    }
  ]
};

// Input Field Component Design
const inputFieldDesign: ComponentDesign = {
  name: 'Text Input',
  description: 'Text inputs allow users to enter and edit text.',
  anatomy: [
    { name: 'Label', description: 'Identifies the field', required: true },
    { name: 'Input Field', description: 'The text entry area', required: true },
    { name: 'Helper Text', description: 'Additional context or instructions', required: false },
    { name: 'Error Message', description: 'Validation feedback', required: false },
    { name: 'Required Indicator', description: 'Shows if field is required', required: false }
  ],
  states: [
    { name: 'default', description: 'Normal state', visualChanges: ['Standard border'] },
    { name: 'hover', description: 'Mouse over field', visualChanges: ['Slightly darker border'] },
    { name: 'focus', description: 'Field has focus', visualChanges: ['Primary color border', 'Focus ring'] },
    { name: 'filled', description: 'Field has value', visualChanges: ['Label may float'] },
    { name: 'disabled', description: 'Field is not editable', visualChanges: ['Gray background', 'No interactions'] },
    { name: 'error', description: 'Validation failed', visualChanges: ['Red border', 'Error icon', 'Error message'] },
    { name: 'success', description: 'Validation passed', visualChanges: ['Green border', 'Success icon'] }
  ],
  variants: [
    {
      name: 'Single Line',
      description: 'For short text inputs',
      whenToUse: 'Names, emails, passwords, etc.',
      properties: { height: '44px', multiline: false }
    },
    {
      name: 'Multi Line',
      description: 'For longer text inputs',
      whenToUse: 'Descriptions, comments, messages',
      properties: { minHeight: '100px', multiline: true, resizable: 'vertical' }
    },
    {
      name: 'With Prefix/Suffix',
      description: 'Input with contextual elements',
      whenToUse: 'Currency symbols, units, search icons',
      properties: { prefix: 'optional', suffix: 'optional' }
    }
  ],
  accessibility: {
    requirements: [
      'Label must be associated with input (for/id or aria-labelledby)',
      'Error messages must be linked (aria-describedby)',
      'Required fields must be indicated (aria-required)',
      'Error state must be announced to screen readers',
      'Minimum touch target: 44x44px',
      'Focus indicator must be visible'
    ],
    ariaAttributes: {
      required: 'aria-required="true"',
      invalid: 'aria-invalid="true"',
      describedby: 'aria-describedby="error-message-id"',
      labelledby: 'aria-labelledby="label-id"'
    }
  },
  guidelines: [
    {
      principle: 'Content First',
      guidance: 'Use placeholder for examples, not labels. Labels must always be visible.'
    },
    {
      principle: 'Clarity Over Cleverness',
      guidance: 'Error messages should explain how to fix the problem'
    },
    {
      principle: 'Accessibility Is Not Optional',
      guidance: 'Never use color alone to indicate error - use icons and text too'
    }
  ]
};
```

### 4. Layout & Composition

```typescript
interface LayoutPrinciples {
  grid: GridSystem;
  spacing: SpacingSystem;
  hierarchy: HierarchyRules;
  alignment: AlignmentRules;
}

interface GridSystem {
  columns: number;
  gutter: string;
  margin: string;
  maxWidth: string;
}

// Layout Guidelines
const layoutPrinciples: LayoutPrinciples = {
  grid: {
    columns: 12,
    gutter: '24px', // Space between columns
    margin: '24px', // Space at edges
    maxWidth: '1200px' // Max content width
  },
  spacing: {
    // Use 8px base unit
    baseUnit: '8px',
    scale: [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128]
  },
  hierarchy: {
    // Visual weight through size, color, spacing
    levels: {
      h1: { size: '2.25rem', weight: '700', spacing: '32px' },
      h2: { size: '1.875rem', weight: '600', spacing: '24px' },
      h3: { size: '1.5rem', weight: '600', spacing: '20px' },
      h4: { size: '1.25rem', weight: '600', spacing: '16px' },
      body: { size: '1rem', weight: '400', spacing: '16px' },
      small: { size: '0.875rem', weight: '400', spacing: '12px' }
    }
  },
  alignment: {
    // Consistent alignment creates order
    rules: [
      'Align related elements to same baseline',
      'Left-align text for readability (except short labels)',
      'Center-align only for short, centered content',
      'Right-align numbers in tables',
      'Maintain consistent margins between sections'
    ]
  }
};

// Responsive Design Patterns
const responsivePatterns = {
  // Mobile First Approach
  breakpoints: {
    mobile: { min: '0px', max: '639px' },
    tablet: { min: '640px', max: '1023px' },
    desktop: { min: '1024px', max: '1535px' },
    wide: { min: '1536px' }
  },

  // Layout Changes by Breakpoint
  layoutChanges: {
    navigation: {
      mobile: 'Hamburger menu',
      tablet: 'Condensed horizontal',
      desktop: 'Full horizontal'
    },
    cards: {
      mobile: '1 column, stacked',
      tablet: '2 columns',
      desktop: '3-4 columns'
    },
    forms: {
      mobile: 'Single column, full width',
      tablet: 'Single column, constrained',
      desktop: 'Multi-column where logical'
    },
    modals: {
      mobile: 'Full screen',
      tablet: 'Centered, 80% width',
      desktop: 'Centered, max-width 600px'
    }
  },

  // Touch vs Mouse Considerations
  interactionModes: {
    touch: {
      minTargetSize: '44px',
      spacing: 'More spacing to prevent fat-finger errors',
      gestures: 'Consider swipe, pinch, long-press'
    },
    mouse: {
      minTargetSize: '24px',
      spacing: 'Standard spacing',
      hover: 'Hover states available'
    }
  }
};

// Visual Hierarchy Techniques
class VisualHierarchy {
  createHierarchy(elements: UIElement[]): UIElement[] {
    return elements.map(el => ({
      ...el,
      // Apply hierarchy through:
      visualWeight: this.calculateVisualWeight(el),
      readingOrder: this.determineReadingOrder(el)
    }));
  }

  private calculateVisualWeight(element: UIElement): number {
    let weight = 0;
    
    // Size contributes to weight
    weight += element.size * 2;
    
    // Color contrast contributes
    weight += this.getContrastWeight(element.color);
    
    // Position contributes (top-left gets more attention in LTR)
    weight += this.getPositionWeight(element.position);
    
    // Whitespace around element
    weight += element.whitespace * 0.5;
    
    return weight;
  }

  // F-Pattern for content scanning
  applyFPattern(content: ContentBlock[]): ContentBlock[] {
    return content.map((block, index) => ({
      ...block,
      priority: this.calculateFPriority(index, block.position)
    }));
  }

  // Z-Pattern for simple pages
  applyZPattern(elements: UIElement[]): UIElement[] {
    // Top-left to top-right, diagonal, bottom-left to bottom-right
    const zOrder = ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'];
    
    return elements.sort((a, b) => 
      zOrder.indexOf(a.position) - zOrder.indexOf(b.position)
    );
  }
}
```

### 5. Design System Architecture

```typescript
interface DesignSystem {
  name: string;
  version: string;
  tokens: DesignTokens;
  components: ComponentDefinition[];
  patterns: PatternDefinition[];
  guidelines: GuidelineDocument[];
}

interface ComponentDefinition {
  name: string;
  category: 'actions' | 'inputs' | 'navigation' | 'content' | 'feedback' | 'layout';
  status: 'draft' | 'stable' | 'deprecated';
  design: ComponentDesign;
  implementation: {
    framework: string;
    package: string;
    version: string;
  };
  documentation: {
    figma: string;
    storybook: string;
    guidelines: string;
  };
}

// Design System Structure
const designSystem: DesignSystem = {
  name: 'Acme Design System',
  version: '2.0.0',
  tokens: designTokens, // From earlier
  components: [
    {
      name: 'Button',
      category: 'actions',
      status: 'stable',
      design: buttonDesign,
      implementation: {
        framework: 'React',
        package: '@acme/ui',
        version: '2.0.0'
      },
      documentation: {
        figma: 'https://figma.com/file/.../Button',
        storybook: 'https://storybook.acme.com/?path=/docs/button',
        guidelines: '/docs/components/button'
      }
    },
    {
      name: 'Text Input',
      category: 'inputs',
      status: 'stable',
      design: inputFieldDesign,
      implementation: {
        framework: 'React',
        package: '@acme/ui',
        version: '2.0.0'
      },
      documentation: {
        figma: 'https://figma.com/file/.../Input',
        storybook: 'https://storybook.acme.com/?path=/docs/input',
        guidelines: '/docs/components/input'
      }
    }
  ],
  patterns: [
    {
      name: 'Form Layout',
      description: 'Standard form layout patterns',
      category: 'layout',
      components: ['Text Input', 'Select', 'Checkbox', 'Radio', 'Button'],
      guidelines: '/docs/patterns/forms'
    },
    {
      name: 'Data Table',
      description: 'Displaying tabular data',
      category: 'content',
      components: ['Table', 'Pagination', 'Search', 'Filter'],
      guidelines: '/docs/patterns/data-tables'
    }
  ],
  guidelines: [
    {
      title: 'Accessibility Guidelines',
      description: 'WCAG 2.1 AA compliance requirements',
      url: '/docs/guidelines/accessibility'
    },
    {
      title: 'Content Guidelines',
      description: 'Voice, tone, and writing standards',
      url: '/docs/guidelines/content'
    },
    {
      title: 'Responsive Design',
      description: 'Mobile-first responsive patterns',
      url: '/docs/guidelines/responsive'
    }
  ]
};

// Design Token Management
class DesignTokenManager {
  private tokens: DesignTokens;
  private platforms: Platform[] = ['web', 'ios', 'android'];

  // Export tokens to different formats
  async exportTokens(format: 'css' | 'scss' | 'js' | 'json'): Promise<string> {
    switch (format) {
      case 'css':
        return this.generateCSSVariables();
      case 'scss':
        return this.generateSCSSVariables();
      case 'js':
        return this.generateJSObject();
      case 'json':
        return JSON.stringify(this.tokens, null, 2);
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  private generateCSSVariables(): string {
    let css = ':root {\n';
    
    // Colors
    for (const [colorName, colorValue] of Object.entries(this.tokens.colors)) {
      if (typeof colorValue === 'object') {
        for (const [shade, value] of Object.entries(colorValue)) {
          css += `  --color-${colorName}-${shade}: ${value};\n`;
        }
      }
    }
    
    // Spacing
    for (const [key, value] of Object.entries(this.tokens.spacing)) {
      css += `  --spacing-${key}: ${value};\n`;
    }
    
    // Typography
    css += `  --font-family-sans: ${this.tokens.typography.fontFamily.sans};\n`;
    css += `  --font-family-mono: ${this.tokens.typography.fontFamily.mono};\n`;
    
    css += '}\n';
    return css;
  }
}
```

### 6. State Design

```typescript
interface ComponentStates {
  // Every component needs these states designed
  empty: StateDesign;
  loading: StateDesign;
  error: StateDesign;
  success: StateDesign;
  partial: StateDesign;
}

interface StateDesign {
  description: string;
  whenToShow: string;
  requiredElements: string[];
  optionalElements: string[];
  doNot: string[];
  example: string;
}

// Comprehensive State Designs
const stateDesigns: ComponentStates = {
  empty: {
    description: 'When there is no content to display',
    whenToShow: 'New accounts, cleared data, no results',
    requiredElements: [
      'Clear illustration or icon',
      'Headline explaining the empty state',
      'Helpful description',
      'Call-to-action to add content (if applicable)'
    ],
    optionalElements: [
      'Tips for getting started',
      'Link to documentation',
      'Keyboard shortcut hints'
    ],
    doNot: [
      'Just show blank space',
      'Use generic "No data" message',
      'Leave user without direction'
    ],
    example: `
      ┌─────────────────────────────────┐
      │     [Illustration: Empty box]   │
      │                                 │
      │     No messages yet             │
      │                                 │
      │     When you receive messages,  │
      │     they will appear here.      │
      │                                 │
      │     [Compose Message]           │
      └─────────────────────────────────┘
    `
  },
  loading: {
    description: 'When content is being fetched',
    whenToShow: 'During data fetch, form submission, transitions',
    requiredElements: [
      'Visual indicator of loading',
      'Context about what is loading'
    ],
    optionalElements: [
      'Progress indicator (if determinable)',
      'Estimated time',
      'Skeleton screens for content'
    ],
    doNot: [
      'Block entire screen for partial loads',
      'Show loading for < 200ms (causes flicker)',
      'Leave user wondering if something is happening'
    ],
    example: `
      ┌─────────────────────────────────┐
      │  Loading your messages...       │
      │  [=====>            ] 45%       │
      │                                 │
      │  [Skeleton: ━━━ ━━━━ ━━━]      │
      │  [Skeleton: ━━━━ ━━━ ━━━━]      │
      │  [Skeleton: ━━ ━━━━━ ━━━━━]    │
      └─────────────────────────────────┘
    `
  },
  error: {
    description: 'When something went wrong',
    whenToShow: 'Failed requests, validation errors, system errors',
    requiredElements: [
      'Clear error indicator',
      'What went wrong (in plain language)',
      'How to fix it or try again'
    ],
    optionalElements: [
      'Error code for support',
      'Contact information',
      'Alternative actions'
    ],
    doNot: [
      'Just say "Error occurred"',
      'Show technical error codes alone',
      'Blame the user',
      'Leave without recovery path'
    ],
    example: `
      ┌─────────────────────────────────┐
      │  ⚠️  Unable to load messages    │
      │                                 │
      │  We could not connect to the    │
      │  server. Please check your      │
      │  internet connection.           │
      │                                 │
      │  [Try Again]  [Contact Support] │
      │                                 │
      │  Error code: MSG-4042           │
      └─────────────────────────────────┘
    `
  },
  success: {
    description: 'When an action completed successfully',
    whenToShow: 'Form submissions, completed actions',
    requiredElements: [
      'Clear success indicator',
      'What was accomplished'
    ],
    optionalElements: [
      'Next steps',
      'Confirmation details',
      'Undo option (if applicable)'
    ],
    doNot: [
      'Generic "Success" message',
      'Auto-dismiss too quickly',
      'Leave user wondering what happened'
    ],
    example: `
      ┌─────────────────────────────────┐
      │  ✓  Message sent!               │
      │                                 │
      │  Your message was sent to       │
      │  john@example.com               │
      │                                 │
      │  [Undo]  [Send Another]         │
      └─────────────────────────────────┘
    `
  },
  partial: {
    description: 'When some content failed to load',
    whenToShow: 'Partial API failures, image load failures',
    requiredElements: [
      'Show what did load',
      'Indicate what is missing',
      'Option to retry failed items'
    ],
    optionalElements: [
      'Explanation of partial failure',
      'Fallback content'
    ],
    doNot: [
      'Show entire page as error',
      'Hide the failure silently',
      'Make user refresh to retry'
    ],
    example: `
      ┌─────────────────────────────────┐
      │  Messages (3 of 5 loaded)       │
      │                                 │
      │  ✓ Message 1                    │
      │  ✓ Message 2                    │
      │  ⚠ Message 3 - Failed to load   │
      │    [Retry]                      │
      │  ✓ Message 4                    │
      │  ⚠ Message 5 - Failed to load   │
      │    [Retry]                      │
      └─────────────────────────────────┘
    `
  }
};
```

---

## Best Practices

### 1. Design With Real Content
```typescript
// ✅ Good: Real content in designs
const design = {
  userName: 'Christopher Alexander Montgomery III', // Long name
  email: 'christopher.montgomery.iii@verylongcompanyname.com',
  avatar: null // Missing data state
};

// ❌ Bad: Perfect mock data
const badDesign = {
  userName: 'John Doe', // Too short
  email: 'john@example.com',
  avatar: 'https://i.pravatar.cc/150' // Always present
};
```

### 2. Accessibility First
```typescript
// ✅ Good: Accessible by default
const accessibleButton = {
  minSize: '44px',
  contrastRatio: '4.5:1',
  focusIndicator: '2px solid, 3:1 contrast',
  keyboardAccessible: true,
  screenReaderLabel: 'Save changes'
};

// ❌ Bad: Accessibility as afterthought
const inaccessibleButton = {
  size: '32px', // Too small for touch
  contrastRatio: '2.1:1', // Fails WCAG
  focusIndicator: 'none',
  keyboardAccessible: false,
  screenReaderLabel: undefined
};
```

### 3. Document Design Decisions
```typescript
// ✅ Good: Decision record
const designDecision = {
  component: 'Button',
  decision: 'Minimum 44px height',
  rationale: 'WCAG 2.1 requires 44x44px touch target for mobile accessibility',
  alternatives: [
    { option: '32px', rejected: 'Fails accessibility requirements' },
    { option: '48px', rejected: 'Visually too heavy for our design' }
  ],
  date: '2026-03-29',
  author: 'Design Team'
};
```

---

## Anti-Patterns

### ❌ AI-Slop Design
```typescript
// ❌ Bad: Generic AI-generated design
const aiSlop = {
  colors: ['#6366f1', '#8b5cf6', '#ec4899'], // Random trendy colors
  typography: 'Inter', // Default without thought
  spacing: 'random pixels', // No system
  components: 'copied from Dribbble', // No consistency
  accessibility: 'we will fix later' // Never happens
};

// ✅ Good: Intentional design
const intentionalDesign = {
  colors: 'Semantic palette with contrast checked',
  typography: 'Selected for readability and personality',
  spacing: '8px base unit system',
  components: 'Consistent patterns documented',
  accessibility: 'WCAG AA from start'
};
```

### ❌ Style Over Substance
```typescript
// ❌ Bad: Pretty but unusable
const styleOverSubstance = {
  contrast: '1.5:1', // Beautiful but unreadable
  touchTargets: '24px', // Looks delicate, fails touch
  animations: '500ms ease', // Too slow, frustrating
  icons: 'no labels', // Mystery meat navigation
};

// ✅ Good: Beautiful AND usable
const beautifulAndUsable = {
  contrast: '7:1', // Beautiful AND readable
  touchTargets: '48px', // Comfortable for all
  animations: '200ms ease', // Snappy but smooth
  icons: 'with labels', // Clear meaning
};
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Design Consistency Score** | >90% | System health |
| **Component Reuse Rate** | >80% | Efficiency |
| **WCAG Compliance** | AA level | Accessibility |
| **Design-to-Dev Time** | <1 week per component | Efficiency |
| **Visual Regression Bugs** | 0 in production | Quality |
| **User Task Success** | >85% | Usability |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **Figma** | Design tool | Team collaboration |
| **Storybook** | Component docs | Living style guide |
| **Chromatic** | Visual testing | Regression detection |
| **Style Dictionary** | Token management | Cross-platform tokens |
| **axe DevTools** | Accessibility testing | Automated checks |
| **Zeroheight** | Design system docs | Documentation hub |

---

## Implementation Checklist

### Foundation
- [ ] Design principles defined
- [ ] Design tokens created
- [ ] Color palette with contrast checked
- [ ] Typography scale established
- [ ] Spacing system defined

### Components
- [ ] Core components designed (Button, Input, etc.)
- [ ] All states designed (empty, loading, error, success)
- [ ] Accessibility requirements documented
- [ ] Component documentation created

### System
- [ ] Design system repository set up
- [ ] Storybook configured
- [ ] Token export pipeline created
- [ ] Contribution guidelines written
- [ ] Version management established

### Quality
- [ ] Accessibility audit completed
- [ ] Visual regression tests configured
- [ ] Design review process defined
- [ ] Component usage tracked

---

## Related Skills

- **UX Research**: `skills/product/ux-research/ux_research_v1/SKILL.md`
- **UX Engineering**: `skills/product/ux-engineering/ux_engineering_v1/SKILL.md`
- **Accessibility WCAG**: `skills/governance/accessibility-wcag/accessibility_wcag_skill_v1/SKILL.md`
- **Frontend Framework**: `skills/stack/react/react_hooks_architecture_skill_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
