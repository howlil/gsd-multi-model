---
name: design_system_v1
description: Design system architecture, style guides, design tokens, component libraries, theming, and framework-agnostic design patterns
version: 1.0.0
tags: [design-system, style-guide, design-tokens, component-library, theming, ui-framework, design-architecture]
category: product
triggers:
  keywords: [design system, style guide, design tokens, component library, theming, ui framework, design language]
  filePatterns: [design-system/*.ts, tokens/*.ts, components/ui/*.tsx, styles/*.css]
  commands: [design system, create style guide, design tokens]
  projectArchetypes: [design-system, component-library, saas, dashboard, enterprise-software]
  modes: [greenfield, refactor, standardization]
prerequisites:
  - ui_ux_design_v1
  - ux_engineering_v1
recommended_structure:
  directories:
    - src/design-system/
    - src/design-system/tokens/
    - src/design-system/components/
    - src/design-system/styles/
    - src/design-system/themes/
workflow:
  setup:
    - Define design principles
    - Audit existing design
    - Choose style direction
    - Plan token structure
  generate:
    - Create design tokens
    - Build component library
    - Document patterns
    - Set up theming
  test:
    - Visual regression tests
    - Accessibility audits
    - Cross-framework testing
best_practices:
  - Framework-agnostic token definitions
  - Style-agnostic theming system
  - Document design decisions
  - Version control for design
  - Automated token generation
  - Test across frameworks
  - Maintain backward compatibility
anti_patterns:
  - Hardcoded values in components
  - Framework-locked design systems
  - No theming support
  - Inconsistent naming
  - Missing documentation
  - No version strategy
  - Copy-paste design patterns
tools:
  - Style Dictionary
  - Figma Variables
  - Storybook
  - Chromatic
  - Token Transformer
metrics:
  - Token coverage
  - Component consistency score
  - Theme adoption rate
  - Cross-framework compatibility
  - Design-dev handoff time
---

# Design System Skill

## Overview

This skill provides comprehensive guidance on building **framework-agnostic, style-flexible design systems** including design tokens, component libraries, theming architectures, style guides, and multi-style support. Unlike rigid design systems, this approach allows teams to select and switch design styles (Compact Modern, Rounded Friendly, Corporate Enterprise, Extremis Web3, etc.) while maintaining consistency.

A well-architected design system separates **structure** (tokens, components) from **style** (themes, visual treatment), enabling flexibility without sacrificing consistency.

## When to Use

- **Multiple products** needing consistent design
- **Framework migration** (React → Vue → Web Components)
- **Multi-brand** products requiring theming
- **Design standardization** across teams
- **Component library** development
- **Style flexibility** requirements

## When NOT to Use

- **Single product, single style** (simpler approach may suffice)
- **Early prototypes** (speed over consistency)
- **When no design resources** available to maintain

---

## Core Concepts

### 1. Design System Architecture

```typescript
interface DesignSystemArchitecture {
  // Layer 1: Foundation (Framework-Agnostic)
  foundation: {
    designTokens: TokenDefinition[];
    designPrinciples: Principle[];
    accessibilityGuidelines: AccessibilityRule[];
  };

  // Layer 2: Style Layer (Themeable)
  styles: {
    themes: ThemeDefinition[];
    stylePresets: StylePreset[];
    semanticTokens: SemanticToken[];
  };

  // Layer 3: Components (Framework-Specific Implementations)
  components: {
    react: ComponentImplementation[];
    vue: ComponentImplementation[];
    webComponents: ComponentImplementation[];
    angular: ComponentImplementation[];
  };

  // Layer 4: Documentation
  documentation: {
    guidelines: GuidelineDocument[];
    patterns: PatternLibrary[];
    examples: ExampleLibrary[];
  };
}

// Design System Layers Visualization
const designSystemLayers = `
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 4: DOCUMENTATION                        │
│  Guidelines | Patterns | Examples | Best Practices              │
├─────────────────────────────────────────────────────────────────┤
│                    LAYER 3: COMPONENTS                           │
│  React  │  Vue  │  Angular  │  Web Components  │  Svelte       │
├─────────────────────────────────────────────────────────────────┤
│                    LAYER 2: STYLES/THEMES                        │
│  Compact Modern │ Rounded Friendly │ Corporate │ Minimalist │ Extremis Web3 │
├─────────────────────────────────────────────────────────────────┤
│                    LAYER 1: FOUNDATION                           │
│         Design Tokens │ Principles │ Accessibility              │
│              (Framework-Agnostic, Style-Agnostic)               │
└─────────────────────────────────────────────────────────────────┘
`;
```

### 2. Design Token Architecture

```typescript
// Token Categories
interface DesignTokenCategories {
  // Primitive Tokens (Raw Values)
  primitives: {
    colors: ColorPrimitive[];
    spacing: SpacingPrimitive[];
    typography: TypographyPrimitive[];
    borders: BorderPrimitive[];
    shadows: ShadowPrimitive[];
    zIndices: ZIndexPrimitive[];
    opacity: OpacityPrimitive[];
  };

  // Semantic Tokens (Context-Specific)
  semantic: {
    background: SemanticColor[];
    foreground: SemanticColor[];
    border: SemanticColor[];
    interactive: SemanticInteractive[];
    status: SemanticStatus[];
  };

  // Component Tokens (Component-Specific)
  component: {
    button: ButtonTokens;
    input: InputTokens;
    card: CardTokens;
    // ... per component
  };
}

// Token Definition Structure
interface DesignToken {
  name: string;
  value: string | number;
  type: 'color' | 'dimension' | 'fontFamily' | 'fontWeight' | 'fontSize' | 'borderRadius' | 'shadow' | 'opacity';
  category: 'primitive' | 'semantic' | 'component';
  description: string;
  deprecated?: boolean;
  aliases?: string[];
}

// Example: Color Token Definitions
const colorTokens: DesignToken[] = [
  // Primitives
  {
    name: 'blue.500',
    value: '#3B82F6',
    type: 'color',
    category: 'primitive',
    description: 'Primary blue for brand colors'
  },
  {
    name: 'gray.200',
    value: '#E5E7EB',
    type: 'color',
    category: 'primitive',
    description: 'Light gray for borders'
  },

  // Semantic
  {
    name: 'color.background.primary',
    value: '{white}',
    type: 'color',
    category: 'semantic',
    description: 'Primary background color for cards, surfaces'
  },
  {
    name: 'color.background.secondary',
    value: '{gray.50}',
    type: 'color',
    category: 'semantic',
    description: 'Secondary background for page backgrounds'
  },
  {
    name: 'color.border.default',
    value: '{gray.200}',
    type: 'color',
    category: 'semantic',
    description: 'Default border color'
  },
  {
    name: 'color.interactive.primary',
    value: '{blue.500}',
    type: 'color',
    category: 'semantic',
    description: 'Primary interactive color (buttons, links)'
  },
  {
    name: 'color.status.success',
    value: '{green.600}',
    type: 'color',
    category: 'semantic',
    description: 'Success state indicator'
  }
];

// Token File Structure (JSON)
const tokenFileStructure = {
  colors: {
    primitive: {
      blue: {
        50: { value: '#EFF6FF', type: 'color' },
        100: { value: '#DBEAFE', type: 'color' },
        500: { value: '#3B82F6', type: 'color' },
        600: { value: '#2563EB', type: 'color' }
      },
      gray: {
        50: { value: '#F9FAFB', type: 'color' },
        200: { value: '#E5E7EB', type: 'color' },
        500: { value: '#6B7280', type: 'color' },
        900: { value: '#111827', type: 'color' }
      }
    },
    semantic: {
      background: {
        primary: { value: '{colors.primitive.white}', type: 'color' },
        secondary: { value: '{colors.primitive.gray.50}', type: 'color' },
        tertiary: { value: '{colors.primitive.gray.100}', type: 'color' }
      },
      foreground: {
        primary: { value: '{colors.primitive.gray.900}', type: 'color' },
        secondary: { value: '{colors.primitive.gray.600}', type: 'color' },
        tertiary: { value: '{colors.primitive.gray.400}', type: 'color' }
      },
      border: {
        default: { value: '{colors.primitive.gray.200}', type: 'color' },
        strong: { value: '{colors.primitive.gray.300}', type: 'color' },
        interactive: { value: '{colors.primitive.blue.500}', type: 'color' }
      },
      interactive: {
        primary: { value: '{colors.primitive.blue.500}', type: 'color' },
        primaryHover: { value: '{colors.primitive.blue.600}', type: 'color' },
        primaryActive: { value: '{colors.primitive.blue.700}', type: 'color' }
      },
      status: {
        success: { value: '{colors.primitive.green.600}', type: 'color' },
        warning: { value: '{colors.primitive.orange.600}', type: 'color' },
        error: { value: '{colors.primitive.red.600}', type: 'color' },
        info: { value: '{colors.primitive.blue.600}', type: 'color' }
      }
    }
  },
  spacing: {
    0: { value: '0px', type: 'dimension' },
    1: { value: '4px', type: 'dimension' },
    2: { value: '8px', type: 'dimension' },
    3: { value: '12px', type: 'dimension' },
    4: { value: '16px', type: 'dimension' },
    6: { value: '24px', type: 'dimension' },
    8: { value: '32px', type: 'dimension' }
  },
  typography: {
    fontFamily: {
      base: { value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', type: 'fontFamily' },
      mono: { value: '"Fira Code", "Courier New", monospace', type: 'fontFamily' }
    },
    fontSize: {
      xs: { value: '12px', type: 'fontSize' },
      sm: { value: '14px', type: 'fontSize' },
      base: { value: '16px', type: 'fontSize' },
      lg: { value: '18px', type: 'fontSize' }
    },
    fontWeight: {
      normal: { value: '400', type: 'fontWeight' },
      medium: { value: '500', type: 'fontWeight' },
      semibold: { value: '600', type: 'fontWeight' },
      bold: { value: '700', type: 'fontWeight' }
    }
  },
  borderRadius: {
    none: { value: '0px', type: 'borderRadius' },
    sm: { value: '4px', type: 'borderRadius' },
    md: { value: '6px', type: 'borderRadius' },
    lg: { value: '8px', type: 'borderRadius' },
    xl: { value: '12px', type: 'borderRadius' },
    full: { value: '9999px', type: 'borderRadius' }
  },
  shadows: {
    none: { value: 'none', type: 'shadow' },
    sm: { value: '0 1px 2px 0 rgb(0 0 0 / 0.05)', type: 'shadow' },
    md: { value: '0 4px 6px -1px rgb(0 0 0 / 0.1)', type: 'shadow' },
    lg: { value: '0 10px 15px -3px rgb(0 0 0 / 0.1)', type: 'shadow' }
  }
};
```

### 3. Style Categories & Themes

```typescript
// Style Category Definition
interface StyleCategory {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
  bestFor: string[];
  tokens: ThemeTokens;
}

// Available Style Categories
const styleCategories: StyleCategory[] = [
  {
    id: 'compact-modern',
    name: 'Compact Modern',
    description: 'Ultra-compact, clean, minimal design optimized for information density and productivity',
    characteristics: [
      'Small font sizes (12px default)',
      'Tight spacing (4-8px gaps)',
      'Minimal shadows',
      'Thin borders (1px)',
      'High information density'
    ],
    bestFor: ['Dashboards', 'Admin panels', 'Data-heavy apps', 'Productivity tools'],
    tokens: {
      fontSize: { base: '12px', heading: '14px' },
      spacing: { gap: '8px', padding: '16px' },
      borderRadius: { default: '6px', button: '6px' },
      shadows: { default: 'none', hover: 'shadow-md' },
      borderWidth: { default: '1px' }
    }
  },
  {
    id: 'rounded-friendly',
    name: 'Rounded Friendly',
    description: 'Approachable, friendly design with generous rounding and soft shadows',
    characteristics: [
      'Medium font sizes (14px default)',
      'Comfortable spacing (12-16px gaps)',
      'Soft shadows',
      'Generous border radius (12-16px)',
      'Warm color palette'
    ],
    bestFor: ['Consumer apps', 'Social platforms', 'Lifestyle apps', 'Education'],
    tokens: {
      fontSize: { base: '14px', heading: '18px' },
      spacing: { gap: '16px', padding: '20px' },
      borderRadius: { default: '16px', button: '12px' },
      shadows: { default: 'shadow-sm', hover: 'shadow-lg' },
      borderWidth: { default: '0px' }
    }
  },
  {
    id: 'corporate-enterprise',
    name: 'Corporate Enterprise',
    description: 'Professional, authoritative design for enterprise and B2B applications',
    characteristics: [
      'Standard font sizes (14-16px default)',
      'Conservative spacing',
      'Subtle shadows',
      'Moderate border radius (4-8px)',
      'Conservative color palette'
    ],
    bestFor: ['Enterprise software', 'Financial apps', 'Healthcare', 'Government'],
    tokens: {
      fontSize: { base: '14px', heading: '20px' },
      spacing: { gap: '12px', padding: '20px' },
      borderRadius: { default: '8px', button: '6px' },
      shadows: { default: 'shadow-sm', hover: 'shadow-md' },
      borderWidth: { default: '1px' }
    }
  },
  {
    id: 'minimalist-clean',
    name: 'Minimalist Clean',
    description: 'Ultra-minimal design with maximum whitespace and subtle styling',
    characteristics: [
      'Light font weights',
      'Generous whitespace',
      'No shadows or borders',
      'Monochromatic palette',
      'Focus on typography'
    ],
    bestFor: ['Portfolios', 'Blogs', 'Content sites', 'Luxury brands'],
    tokens: {
      fontSize: { base: '16px', heading: '24px' },
      spacing: { gap: '24px', padding: '32px' },
      borderRadius: { default: '0px', button: '0px' },
      shadows: { default: 'none', hover: 'none' },
      borderWidth: { default: '0px' }
    }
  },
  {
    id: 'bold-playful',
    name: 'Bold Playful',
    description: 'Energetic, vibrant design with bold colors and dynamic shapes',
    characteristics: [
      'Bold font weights',
      'Vibrant colors',
      'Asymmetric layouts',
      'Large border radius',
      'Heavy shadows'
    ],
    bestFor: ['Gaming', 'Entertainment', 'Youth apps', 'Creative tools'],
    tokens: {
      fontSize: { base: '14px', heading: '28px' },
      spacing: { gap: '16px', padding: '24px' },
      borderRadius: { default: '20px', button: '16px' },
      shadows: { default: 'shadow-md', hover: 'shadow-xl' },
      borderWidth: { default: '2px' }
    }
  },
  {
    id: 'extremis-web3',
    name: 'Extremis Web3',
    description: 'Experimental, cutting-edge design for Web3, DeFi, and crypto finance applications with bold gradients, glassmorphism, and futuristic aesthetics',
    characteristics: [
      'Dynamic gradient backgrounds',
      'Glassmorphism effects (blur, transparency)',
      'Neon accent colors (cyan, purple, electric green)',
      'Angular/geometric shapes',
      'Glow effects and shadows',
      'Dark-first design',
      'Animated transitions',
      'Holographic/metallic finishes'
    ],
    bestFor: ['Web3 apps', 'DeFi platforms', 'Crypto exchanges', 'NFT marketplaces', 'Metaverse projects', 'Fintech innovation'],
    tokens: {
      fontSize: { base: '14px', heading: '24px' },
      spacing: { gap: '12px', padding: '20px' },
      borderRadius: { default: '12px', button: '8px' },
      shadows: { 
        default: '0 0 20px rgba(99, 102, 241, 0.3)', 
        hover: '0 0 40px rgba(99, 102, 241, 0.5)',
        glow: '0 0 60px rgba(168, 85, 247, 0.4)'
      },
      borderWidth: { default: '1px' },
      gradients: {
        primary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
        secondary: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
        accent: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        danger: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)'
      },
      glassmorphism: {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropBlur: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }
    }
  }
];

// Theme Definition
interface ThemeDefinition {
  id: string;
  name: string;
  styleCategory: string; // References styleCategories.id
  colorMode: 'light' | 'dark' | 'auto';
  tokens: Record<string, string>;
}

// Example: Complete Theme
const compactModernLight: ThemeDefinition = {
  id: 'compact-modern-light',
  name: 'Compact Modern Light',
  styleCategory: 'compact-modern',
  colorMode: 'light',
  tokens: {
    // Colors
    'color.background.primary': '#FFFFFF',
    'color.background.secondary': '#F9FAFB',
    'color.background.tertiary': '#F3F4F6',
    'color.foreground.primary': '#111827',
    'color.foreground.secondary': '#374151',
    'color.foreground.tertiary': '#6B7280',
    'color.border.default': '#E5E7EB',
    'color.border.strong': '#D1D5DB',
    'color.interactive.primary': '#3B82F6',
    'color.interactive.hover': '#2563EB',
    'color.interactive.active': '#1D4ED8',
    'color.status.success': '#059669',
    'color.status.warning': '#D97706',
    'color.status.error': '#DC2626',
    'color.status.info': '#2563EB',
    
    // Typography
    'font.family.base': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'font.size.base': '12px',
    'font.size.heading': '14px',
    'font.weight.normal': '400',
    'font.weight.medium': '500',
    'font.weight.semibold': '600',
    
    // Spacing
    'spacing.gap': '8px',
    'spacing.padding': '16px',
    'spacing.tight': '4px',
    'spacing.comfortable': '12px',
    
    // Borders
    'border.radius.default': '6px',
    'border.radius.button': '6px',
    'border.radius.card': '8px',
    'border.width.default': '1px',
    
    // Shadows
    'shadow.default': 'none',
    'shadow.hover': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    'shadow.elevated': '0 10px 15px -3px rgb(0 0 0 / 0.1)'
  }
};

// Extremis Web3 Dark Theme
const extremisWeb3Dark: ThemeDefinition = {
  id: 'extremis-web3-dark',
  name: 'Extremis Web3 Dark',
  styleCategory: 'extremis-web3',
  colorMode: 'dark',
  tokens: {
    // Colors - Dark base with neon accents
    'color.background.primary': '#0B0C15',
    'color.background.secondary': '#151725',
    'color.background.tertiary': '#1E2136',
    'color.background.glass': 'rgba(255, 255, 255, 0.05)',
    'color.foreground.primary': '#FFFFFF',
    'color.foreground.secondary': '#B0B3C7',
    'color.foreground.tertiary': '#6B7280',
    'color.border.default': 'rgba(255, 255, 255, 0.1)',
    'color.border.strong': 'rgba(255, 255, 255, 0.2)',
    'color.border.accent': 'rgba(99, 102, 241, 0.5)',
    
    // Neon accent colors
    'color.interactive.primary': '#6366F1', // Indigo neon
    'color.interactive.hover': '#818CF8',
    'color.interactive.active': '#4F46E5',
    'color.interactive.glow': 'rgba(99, 102, 241, 0.5)',
    'color.accent.cyan': '#06B6D4',
    'color.accent.purple': '#A855F7',
    'color.accent.green': '#10B981',
    'color.accent.pink': '#EC4899',
    
    // Status with neon twist
    'color.status.success': '#10B981',
    'color.status.successGlow': 'rgba(16, 185, 129, 0.5)',
    'color.status.warning': '#F59E0B',
    'color.status.error': '#EF4444',
    'color.status.errorGlow': 'rgba(239, 68, 68, 0.5)',
    'color.status.info': '#3B82F6',
    
    // Gradients
    'gradient.primary': 'linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)',
    'gradient.secondary': 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
    'gradient.accent': 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    'gradient.danger': 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
    'gradient.holographic': 'linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(168,85,247,0.3) 50%, rgba(236,72,153,0.3) 100%)',
    
    // Typography
    'font.family.base': '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'font.family.mono': '"Fira Code", "JetBrains Mono", monospace',
    'font.size.base': '14px',
    'font.size.heading': '24px',
    'font.size.display': '48px',
    'font.weight.normal': '400',
    'font.weight.medium': '500',
    'font.weight.semibold': '600',
    'font.weight.bold': '700',
    
    // Spacing
    'spacing.gap': '12px',
    'spacing.padding': '20px',
    'spacing.tight': '8px',
    'spacing.comfortable': '16px',
    'spacing.generous': '24px',
    
    // Borders with glassmorphism
    'border.radius.default': '12px',
    'border.radius.button': '8px',
    'border.radius.card': '16px',
    'border.radius.full': '9999px',
    'border.width.default': '1px',
    'border.glass': '1px solid rgba(255, 255, 255, 0.1)',
    
    // Shadows with glow
    'shadow.default': '0 0 20px rgba(99, 102, 241, 0.3)',
    'shadow.hover': '0 0 40px rgba(99, 102, 241, 0.5)',
    'shadow.glow': '0 0 60px rgba(168, 85, 247, 0.4)',
    'shadow.elevated': '0 20px 60px rgba(0, 0, 0, 0.6)',
    
    // Glassmorphism
    'glass.background': 'rgba(255, 255, 255, 0.05)',
    'glass.backdropBlur': 'blur(20px)',
    'glass.border': '1px solid rgba(255, 255, 255, 0.1)',
    
    // Animations
    'animation.fast': '150ms ease-out',
    'animation.normal': '300ms ease-out',
    'animation.slow': '500ms ease-out',
    'animation.glow': '2s ease-in-out infinite alternate'
  }
};
```

### 4. Theme Provider Architecture

```typescript
// Theme Context (Framework-Agnostic Interface)
interface ThemeContext {
  currentTheme: string;
  styleCategory: string;
  colorMode: 'light' | 'dark';
  tokens: Record<string, string>;
  setTheme: (themeId: string) => void;
  setStyleCategory: (categoryId: string) => void;
  setColorMode: (mode: 'light' | 'dark') => void;
}

// React Implementation Example
const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'compact-modern-light',
  themes
}) => {
  const [currentTheme, setCurrentTheme] = useState(defaultTheme);
  
  // Load theme tokens
  const theme = themes.find(t => t.id === currentTheme);
  const tokens = theme?.tokens || {};
  
  // Apply CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(tokens).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/\./g, '-')}`;
      root.style.setProperty(cssVar, value);
    });
  }, [tokens]);
  
  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        styleCategory: theme?.styleCategory || '',
        colorMode: theme?.colorMode || 'light',
        tokens,
        setTheme: setCurrentTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Usage
<ThemeProvider
  defaultTheme="compact-modern-light"
  themes={[compactModernLight, roundedFriendlyLight, corporateEnterprise]}
>
  <App />
</ThemeProvider>

// Hook for using theme
function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// Component using theme tokens
const Button: React.FC<ButtonProps> = ({ variant = 'primary', children }) => {
  const { tokens } = useTheme();
  
  return (
    <button
      className="btn"
      style={{
        fontSize: tokens['font.size.base'],
        padding: `${tokens['spacing.tight']} ${tokens['spacing.padding']}`,
        borderRadius: tokens['border.radius.button'],
        backgroundColor: tokens[`color.interactive.${variant}`],
        border: `${tokens['border.width.default']} solid transparent`
      }}
    >
      {children}
    </button>
  );
};
```

### 5. Component Token Mapping

```typescript
// Component Token Definition
interface ComponentTokenMap {
  button: {
    // Structure
    height: string;
    minHeight: string;
    paddingX: string;
    paddingY: string;
    
    // Typography
    fontSize: string;
    fontWeight: string;
    
    // Colors (semantic references)
    background: string;
    backgroundHover: string;
    backgroundActive: string;
    foreground: string;
    border: string;
    
    // Borders
    borderRadius: string;
    borderWidth: string;
    
    // Shadows
    shadow: string;
    shadowHover: string;
    
    // Transitions
    transitionDuration: string;
    transitionTiming: string;
  };
}

// Button Token Mapping by Style Category
const buttonTokens: Record<string, ComponentTokenMap['button']> = {
  'compact-modern': {
    height: '32px',
    minHeight: '28px',
    paddingX: '12px',
    paddingY: '6px',
    fontSize: '12px',
    fontWeight: '500',
    background: '{color.interactive.primary}',
    backgroundHover: '{color.interactive.hover}',
    backgroundActive: '{color.interactive.active}',
    foreground: '{color.background.primary}',
    border: 'transparent',
    borderRadius: '{border.radius.button}',
    borderWidth: '0px',
    shadow: 'none',
    shadowHover: 'none',
    transitionDuration: '150ms',
    transitionTiming: 'ease-in-out'
  },
  'rounded-friendly': {
    height: '44px',
    minHeight: '40px',
    paddingX: '20px',
    paddingY: '10px',
    fontSize: '14px',
    fontWeight: '500',
    background: '{color.interactive.primary}',
    backgroundHover: '{color.interactive.hover}',
    backgroundActive: '{color.interactive.active}',
    foreground: '{color.background.primary}',
    border: 'transparent',
    borderRadius: '12px',
    borderWidth: '0px',
    shadow: '{shadow.sm}',
    shadowHover: '{shadow.md}',
    transitionDuration: '200ms',
    transitionTiming: 'ease-out'
  },
  'corporate-enterprise': {
    height: '40px',
    minHeight: '36px',
    paddingX: '16px',
    paddingY: '8px',
    fontSize: '14px',
    fontWeight: '500',
    background: '{color.interactive.primary}',
    backgroundHover: '{color.interactive.hover}',
    backgroundActive: '{color.interactive.active}',
    foreground: '{color.background.primary}',
    border: '{color.border.default}',
    borderRadius: '6px',
    borderWidth: '1px',
    shadow: 'none',
    shadowHover: '{shadow.sm}',
    transitionDuration: '150ms',
    transitionTiming: 'ease-in-out'
  },
  'extremis-web3': {
    height: '44px',
    minHeight: '40px',
    paddingX: '20px',
    paddingY: '10px',
    fontSize: '14px',
    fontWeight: '600',
    background: '{gradient.primary}',
    backgroundHover: '{gradient.primary} brightness(1.1)',
    backgroundActive: '{gradient.primary} brightness(0.9)',
    foreground: '{color.background.primary}',
    border: '{border.glass}',
    borderRadius: '8px',
    borderWidth: '1px',
    shadow: '{shadow.default}',
    shadowHover: '{shadow.hover}',
    transitionDuration: '300ms',
    transitionTiming: 'ease-out'
  }
};

// CSS Custom Properties Output
const generateCSSVariables = (tokens: Record<string, string>): string => {
  let css = ':root {\n';
  Object.entries(tokens).forEach(([key, value]) => {
    const cssVar = `--${key.replace(/\./g, '-')}`;
    css += `  ${cssVar}: ${value};\n`;
  });
  css += '}\n';
  return css;
};

// Extremis Web3 CSS Output Example
const extremisCSSOutput = `
:root {
  /* Dark Base Colors */
  --color-background-primary: #0B0C15;
  --color-background-secondary: #151725;
  --color-background-tertiary: #1E2136;
  --color-background-glass: rgba(255, 255, 255, 0.05);
  
  /* Foreground */
  --color-foreground-primary: #FFFFFF;
  --color-foreground-secondary: #B0B3C7;
  --color-foreground-tertiary: #6B7280;
  
  /* Neon Accents */
  --color-interactive-primary: #6366F1;
  --color-interactive-hover: #818CF8;
  --color-interactive-glow: rgba(99, 102, 241, 0.5);
  --color-accent-cyan: #06B6D4;
  --color-accent-purple: #A855F7;
  --color-accent-green: #10B981;
  --color-accent-pink: #EC4899;
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%);
  --gradient-secondary: linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%);
  --gradient-holographic: linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(168,85,247,0.3) 50%, rgba(236,72,153,0.3) 100%);
  
  /* Glassmorphism */
  --glass-background: rgba(255, 255, 255, 0.05);
  --glass-backdrop-blur: blur(20px);
  --glass-border: 1px solid rgba(255, 255, 255, 0.1);
  
  /* Glow Shadows */
  --shadow-default: 0 0 20px rgba(99, 102, 241, 0.3);
  --shadow-hover: 0 0 40px rgba(99, 102, 241, 0.5);
  --shadow-glow: 0 0 60px rgba(168, 85, 247, 0.4);
  
  /* Typography */
  --font-family-base: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-family-mono: "Fira Code", "JetBrains Mono", monospace;
  --font-size-base: 14px;
  --font-size-heading: 24px;
  
  /* Borders */
  --border-radius-default: 12px;
  --border-radius-button: 8px;
  --border-radius-card: 16px;
}

/* Extremis Web3 Component Styles */
.btn-extremis {
  height: 44px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  background: var(--gradient-primary);
  border: var(--glass-border);
  border-radius: 8px;
  box-shadow: var(--shadow-default);
  transition: all 300ms ease-out;
  color: #FFFFFF;
  backdrop-filter: var(--glass-backdrop-blur);
}

.btn-extremis:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
  filter: brightness(1.1);
}

.btn-extremis:active {
  transform: translateY(0);
  filter: brightness(0.9);
}

.card-extremis {
  background: var(--glass-background);
  backdrop-filter: var(--glass-backdrop-blur);
  border: var(--glass-border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow-default);
  transition: all 300ms ease-out;
}

.card-extremis:hover {
  box-shadow: var(--shadow-hover);
  border-color: rgba(99, 102, 241, 0.5);
}

.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.glow-text {
  text-shadow: 0 0 20px rgba(99, 102, 241, 0.5),
               0 0 40px rgba(168, 85, 247, 0.3);
}

.gradient-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
`;

// Extremis Web3 React Component Examples
const extremisReactComponents = `
// Extremis Web3 Button
const ExtremisButton = ({ children, variant = 'primary' }) => (
  <button className="
    h-11 px-5 py-2.5
    bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
    border border-white/10 rounded-lg
    text-white font-semibold
    shadow-lg shadow-indigo-500/30
    backdrop-blur-xl
    transition-all duration-300
    hover:shadow-xl hover:shadow-indigo-500/50 hover:-translate-y-0.5
    active:translate-y-0
  ">
    {children}
  </button>
);

// Extremis Web3 Card (Glassmorphism)
const ExtremisCard = ({ children }) => (
  <div className="
    bg-white/5 backdrop-blur-xl
    border border-white/10 rounded-2xl
    p-5 shadow-lg shadow-indigo-500/20
    hover:shadow-xl hover:shadow-indigo-500/30
    transition-all duration-300
  ">
    {children}
  </div>
);
`;

// Example Output
const cssOutput = `
:root {
  /* Colors */
  --color-background-primary: #FFFFFF;
  --color-background-secondary: #F9FAFB;
  --color-foreground-primary: #111827;
  --color-foreground-secondary: #374151;
  --color-border-default: #E5E7EB;
  --color-interactive-primary: #3B82F6;
  --color-interactive-hover: #2563EB;
  
  /* Typography */
  --font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-size-base: 12px;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  
  /* Spacing */
  --spacing-gap: 8px;
  --spacing-padding: 16px;
  
  /* Borders */
  --border-radius-default: 6px;
  --border-width-default: 1px;
  
  /* Shadows */
  --shadow-default: none;
  --shadow-hover: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
`;
```

### 6. Multi-Style Component Implementation

```typescript
// Framework-Agnostic Component Definition
interface ComponentDefinition {
  name: string;
  description: string;
  tokens: Record<string, string>;
  variants: Record<string, Record<string, string>>;
  slots: string[];
}

// Button Component Definition
const buttonDefinition: ComponentDefinition = {
  name: 'Button',
  description: 'Interactive button for actions',
  tokens: {
    height: '{button.height}',
    fontSize: '{font.size.base}',
    fontWeight: '{font.weight.medium}',
    paddingX: '{button.paddingX}',
    paddingY: '{button.paddingY}',
    borderRadius: '{border.radius.button}',
    background: '{color.interactive.primary}',
    backgroundHover: '{color.interactive.hover}',
    foreground: '{color.background.primary}',
    transition: 'all {button.transitionDuration} {button.transitionTiming}'
  },
  variants: {
    variant: {
      primary: {
        background: '{color.interactive.primary}',
        foreground: '{color.background.primary}'
      },
      secondary: {
        background: '{color.background.primary}',
        foreground: '{color.foreground.primary}',
        border: '{color.border.default}'
      },
      ghost: {
        background: 'transparent',
        foreground: '{color.interactive.primary}'
      },
      destructive: {
        background: '{color.status.error}',
        foreground: '{color.background.primary}'
      }
    },
    size: {
      sm: {
        height: '{button.minHeight}',
        fontSize: '{font.size.base}',
        paddingX: '{spacing.tight}'
      },
      md: {
        height: '{button.height}',
        fontSize: '{font.size.base}',
        paddingX: '{spacing.padding}'
      },
      lg: {
        height: '{button.lgHeight}',
        fontSize: '{font.size.heading}',
        paddingX: '{spacing.comfortable}'
      }
    }
  },
  slots: ['icon-left', 'icon-right', 'label']
};

// React Component with Style Category Support
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  styleCategory?: 'compact-modern' | 'rounded-friendly' | 'corporate-enterprise';
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className,
  styleCategory = 'compact-modern'
}) => {
  const { tokens } = useTheme();
  
  // Get style-specific tokens
  const styleTokens = buttonTokens[styleCategory];
  
  // Get variant tokens
  const variantTokens = buttonDefinition.variants.variant[variant];
  
  return (
    <button
      className={cx('btn', `btn-${variant}`, `btn-${size}`, className)}
      style={{
        height: styleTokens.height,
        fontSize: styleTokens.fontSize,
        fontWeight: styleTokens.fontWeight,
        padding: `${styleTokens.paddingY} ${styleTokens.paddingX}`,
        borderRadius: styleTokens.borderRadius,
        backgroundColor: variantTokens.background || styleTokens.background,
        color: variantTokens.foreground || styleTokens.foreground,
        border: variantTokens.border ? `1px solid ${variantTokens.border}` : 'none',
        boxShadow: styleTokens.shadow,
        transition: styleTokens.transition
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = variantTokens.backgroundHover || styleTokens.backgroundHover;
        e.currentTarget.style.boxShadow = styleTokens.shadowHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = variantTokens.background || styleTokens.background;
        e.currentTarget.style.boxShadow = styleTokens.shadow;
      }}
    >
      {children}
    </button>
  );
};

// Usage with different styles
function App() {
  return (
    <div>
      {/* Compact Modern Style */}
      <ThemeProvider theme="compact-modern-light">
        <Button variant="primary">Compact Button</Button>
      </ThemeProvider>
      
      {/* Rounded Friendly Style */}
      <ThemeProvider theme="rounded-friendly-light">
        <Button variant="primary">Friendly Button</Button>
      </ThemeProvider>
      
      {/* Corporate Enterprise Style */}
      <ThemeProvider theme="corporate-enterprise-light">
        <Button variant="primary">Corporate Button</Button>
      </ThemeProvider>
    </div>
  );
}
```

### 7. Style Selection UI

```typescript
// Style Selector Component
interface StyleSelectorProps {
  currentStyle: string;
  onStyleChange: (styleId: string) => void;
  availableStyles: StyleCategory[];
}

const StyleSelector: React.FC<StyleSelectorProps> = ({
  currentStyle,
  onStyleChange,
  availableStyles
}) => {
  return (
    <div className="style-selector">
      <h3 className="text-sm font-medium mb-3">Design Style</h3>
      
      <div className="grid grid-cols-1 gap-3">
        {availableStyles.map((style) => (
          <button
            key={style.id}
            onClick={() => onStyleChange(style.id)}
            className={cx(
              'style-option p-4 border rounded-lg text-left transition-all',
              currentStyle === style.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{style.name}</span>
              {currentStyle === style.id && (
                <Check className="w-4 h-4 text-blue-600" />
              )}
            </div>
            
            <p className="text-xs text-gray-600 mb-3">
              {style.description}
            </p>
            
            <div className="flex gap-2 mb-3">
              {/* Style Preview Swatches */}
              <div
                className="w-8 h-8 rounded-lg border border-gray-200"
                style={{
                  borderRadius: style.tokens.borderRadius.default,
                  backgroundColor: '#3B82F6'
                }}
              />
              <div
                className="w-8 h-8 rounded border border-gray-200"
                style={{
                  borderRadius: style.tokens.borderRadius.default,
                  backgroundColor: '#F3F4F6'
                }}
              />
              <div
                className="w-8 h-8 rounded border"
                style={{
                  borderRadius: style.tokens.borderRadius.default,
                  borderWidth: style.tokens.borderWidth.default,
                  borderColor: '#E5E7EB'
                }}
              />
            </div>
            
            <div className="flex flex-wrap gap-1">
              {style.bestFor.map((use) => (
                <span
                  key={use}
                  className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                >
                  {use}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Theme Preview Component
const ThemePreview: React.FC<{ styleCategory: string }> = ({ styleCategory }) => {
  const style = styleCategories.find(s => s.id === styleCategory);
  
  if (!style) return null;
  
  return (
    <div className="preview p-4 border rounded-lg">
      {/* Preview Typography */}
      <div className="mb-4">
        <p style={{ fontSize: style.tokens.fontSize.heading, fontWeight: 600 }}>
          Heading Text
        </p>
        <p style={{ fontSize: style.tokens.fontSize.base }}>
          Body text sample
        </p>
      </div>
      
      {/* Preview Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          style={{
            height: style.tokens.height || '32px',
            borderRadius: style.tokens.borderRadius.button,
            backgroundColor: '#3B82F6',
            color: 'white',
            padding: '0 12px',
            fontSize: style.tokens.fontSize.base,
            border: 'none'
          }}
        >
          Button
        </button>
        <button
          style={{
            height: style.tokens.height || '32px',
            borderRadius: style.tokens.borderRadius.button,
            backgroundColor: 'transparent',
            color: '#374151',
            padding: '0 12px',
            fontSize: style.tokens.fontSize.base,
            border: `1px solid #E5E7EB`
          }}
        >
          Button
        </button>
      </div>
      
      {/* Preview Cards */}
      <div
        style={{
          padding: style.tokens.spacing.padding,
          borderRadius: style.tokens.borderRadius.card,
          border: `${style.tokens.borderWidth.default} solid #E5E7EB`,
          backgroundColor: 'white'
        }}
      >
        <p style={{ fontSize: style.tokens.fontSize.base }}>
          Card content preview
        </p>
      </div>
    </div>
  );
};
```

---

## Best Practices

### 1. Token Naming Conventions
```typescript
// ✅ Good: Clear, hierarchical naming
const goodTokens = {
  'color.background.primary': '#FFFFFF',
  'color.foreground.secondary': '#374151',
  'spacing.padding.default': '16px',
  'border.radius.button': '6px'
};

// ❌ Bad: Inconsistent, unclear naming
const badTokens = {
  'mainBg': '#FFFFFF',
  'textColor2': '#374151',
  'pad16': '16px',
  'btnRound': '6px'
};
```

### 2. Style-Agnostic Components
```typescript
// ✅ Good: Uses tokens, supports themes
const GoodButton = ({ theme }) => (
  <button style={{
    padding: theme.tokens.spacing.padding,
    borderRadius: theme.tokens.borderRadius.button,
    backgroundColor: theme.tokens.color.interactive.primary
  }} />
);

// ❌ Bad: Hardcoded values
const BadButton = () => (
  <button style={{
    padding: '16px',
    borderRadius: '6px',
    backgroundColor: '#3B82F6'
  }} />
);
```

### 3. Theme Switching
```typescript
// ✅ Good: CSS custom properties for instant switching
useEffect(() => {
  const root = document.documentElement;
  Object.entries(theme.tokens).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
}, [theme]);

// ❌ Bad: Inline styles on every component
<Component style={{ color: theme.color }} />
```

---

## Anti-Patterns

### ❌ Framework-Locked Design System
```typescript
// ❌ React-only tokens
const tokens = {
  colors: {
    primary: 'rgb(59, 130, 246)' // React-specific
  }
};

// ✅ Framework-agnostic
const tokens = {
  colors: {
    primary: '#3B82F6' // Works everywhere
  }
};
```

### ❌ No Style Flexibility
```typescript
// ❌ Single hardcoded style
const Button = () => (
  <button className="fixed-styles" /> // No theming
);

// ✅ Style-flexible
const Button = ({ styleCategory }) => (
  <button className={getStyleForCategory(styleCategory)} />
);
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Token Coverage** | 100% | Complete design system |
| **Component Consistency** | >95% | Visual consistency |
| **Theme Adoption** | Track | Style flexibility usage |
| **Cross-Framework Compatibility** | All target frameworks | Reusability |
| **Design-Dev Handoff Time** | <1 day per component | Efficiency |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **Style Dictionary** | Token transformation | Multi-platform tokens |
| **Figma Variables** | Design tokens in Figma | Design-dev sync |
| **Storybook** | Component documentation | Living style guide |
| **Chromatic** | Visual testing | Regression detection |
| **Token Transformer** | Token format conversion | Cross-tool compatibility |

---

## Implementation Checklist

### Foundation
- [ ] Design principles defined
- [ ] Token structure planned
- [ ] Style categories selected
- [ ] Accessibility guidelines set

### Tokens
- [ ] Primitive tokens created
- [ ] Semantic tokens mapped
- [ ] Component tokens defined
- [ ] Token documentation generated

### Themes
- [ ] Style categories implemented
- [ ] Light/dark modes created
- [ ] Theme switcher built
- [ ] Theme preview available

### Components
- [ ] Core components implemented
- [ ] Token-based styling applied
- [ ] Variant support added
- [ ] Cross-framework versions created

### Documentation
- [ ] Usage guidelines written
- [ ] Examples created
- [ ] Migration guide documented
- [ ] Version management established

---

## Related Skills

- **UI/UX Design**: `skills/product/ui-ux-design/ui_ux_design_v1/SKILL.md`
- **UX Engineering**: `skills/product/ux-engineering/ux_engineering_v1/SKILL.md`
- **UX Research**: `skills/product/ux-research/ux_research_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
