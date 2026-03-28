---
name: ux_engineering_v1
description: UX engineering, frontend accessibility, interaction implementation, design system engineering, and bridging design-development gap
version: 1.0.0
tags: [ux-engineering, frontend, accessibility, design-system, interaction-design, component-development]
category: product
triggers:
  keywords: [ux engineering, frontend accessibility, design system implementation, component development, interaction implementation]
  filePatterns: [components/*.tsx, hooks/*.ts, utils/accessibility/*.ts, design-system/*.ts]
  commands: [ux engineering, component implementation, accessibility implementation]
  projectArchetypes: [design-system, component-library, web-application, saas]
  modes: [greenfield, implementation, optimization]
prerequisites:
  - ui_ux_design_v1
  - ux_research_v1
  - react_hooks_architecture_skill_v1
recommended_structure:
  directories:
    - src/components/
    - src/components/ui/
    - src/components/accessibility/
    - src/hooks/
    - src/utils/a11y/
workflow:
  setup:
    - Review design specifications
    - Plan component architecture
    - Set up accessibility testing
    - Configure tooling
  generate:
    - Implement accessible components
    - Add interaction patterns
    - Create composition APIs
    - Write component tests
  test:
    - Accessibility audits
    - Keyboard navigation tests
    - Screen reader tests
    - Visual regression tests
best_practices:
  - Build accessibility into components
  - Support keyboard navigation fully
  - Manage focus appropriately
  - Announce dynamic changes
  - Support reduced motion
  - Test with real assistive tech
  - Document component APIs clearly
anti_patterns:
  - Div soup instead of semantic HTML
  - Click handlers on non-buttons
  - Missing focus management
  - Unannounced dynamic changes
  - Ignoring reduced motion
  - Testing without assistive tech
  - Undocumented props/behavior
tools:
  - Storybook
  - axe-core
  - Testing Library
  - Playwright (a11y)
  - Screen readers (NVDA, VoiceOver)
metrics:
  - Accessibility violations
  - Keyboard navigation coverage
  - Screen reader compatibility
  - Component API clarity
  - Test coverage
---

# UX Engineering Skill

## Overview

This skill provides comprehensive guidance on UX engineering - the practice of implementing user experience designs in code with focus on accessibility, interaction quality, component architecture, and bridging the gap between design and development.

UX Engineers translate design intentions into functional, accessible, performant interfaces. They ensure the implemented experience matches the designed experience across all devices, abilities, and contexts.

## When to Use

- **Design system implementation** (component library)
- **Accessibility-critical applications** (government, enterprise)
- **Complex interactions** (drag-drop, rich editing)
- **Component API design** (developer experience)
- **Design-dev collaboration** (handoff process)

## When NOT to Use

- **Simple CRUD interfaces** (standard components suffice)
- **Proof-of-concept** (speed over quality)
- **When UX engineer role does not exist** (share responsibility)

---

## Core Concepts

### 1. Accessible Component Implementation

```typescript
// Accessible Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Merge disabled with loading state
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        className={cx(
          'btn',
          `btn-${variant}`,
          `btn-${size}`,
          { 'btn-loading': isLoading }
        )}
        {...props}
      >
        {isLoading && (
          <Spinner 
            size={size} 
            aria-hidden="true" 
          />
        )}
        {leftIcon && <span className="btn-icon-left">{leftIcon}</span>}
        <span className="btn-label">{children}</span>
        {rightIcon && <span className="btn-icon-right">{rightIcon}</span>}
      </button>
    );
  }
);

// Accessible Modal/Dialog Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement>;
  returnFocusRef?: React.RefObject<HTMLElement>;
  closeOnEsc?: boolean;
  closeOnOutsideClick?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  initialFocusRef,
  returnFocusRef,
  closeOnEsc = true,
  closeOnOutsideClick = true
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<Element | null>(null);

  // Store previous focus on open
  React.useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      
      // Focus first focusable element or provided ref
      const focusElement = initialFocusRef?.current || 
        modalRef.current?.querySelector<HTMLElement>(focusableSelector);
      focusElement?.focus();
    }
  }, [isOpen]);

  // Return focus on close
  React.useEffect(() => {
    return () => {
      if (!isOpen && previousActiveElement.current) {
        (returnFocusRef?.current || previousActiveElement.current as HTMLElement).focus();
      }
    };
  }, [isOpen]);

  // Handle escape key
  React.useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  // Trap focus within modal
  useFocusTrap(modalRef, isOpen);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay"
      onClick={closeOnOutsideClick ? onClose : undefined}
      aria-hidden="true"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="modal-close"
          >
            <CloseIcon aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

// Focus Trap Hook
function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean
) {
  React.useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      focusableSelector
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
}
```

### 2. Keyboard Navigation Implementation

```typescript
// Keyboard Navigation Hook for Lists/Menus
interface KeyboardNavigationOptions {
  orientation?: 'vertical' | 'horizontal';
  wrap?: boolean;
  rovingIndex?: boolean;
  onActivate?: (index: number) => void;
}

function useKeyboardNavigation(
  itemCount: number,
  options: KeyboardNavigationOptions = {}
) {
  const {
    orientation = 'vertical',
    wrap = true,
    rovingIndex = true,
    onActivate
  } = options;

  const [focusedIndex, setFocusedIndex] = React.useState(0);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      const isVertical = orientation === 'vertical';
      const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
      const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

      switch (event.key) {
        case nextKey:
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev + 1;
            if (next >= itemCount) {
              return wrap ? 0 : prev;
            }
            return next;
          });
          break;

        case prevKey:
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev - 1;
            if (next < 0) {
              return wrap ? itemCount - 1 : prev;
            }
            return next;
          });
          break;

        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          break;

        case 'End':
          event.preventDefault();
          setFocusedIndex(itemCount - 1);
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          onActivate?.(focusedIndex);
          break;
      }
    },
    [itemCount, orientation, wrap, onActivate, focusedIndex]
  );

  const getItemProps = React.useCallback(
    (index: number) => ({
      tabIndex: rovingIndex ? (index === focusedIndex ? 0 : -1) : undefined,
      'aria-selected': index === focusedIndex,
      onFocus: () => setFocusedIndex(index)
    }),
    [focusedIndex, rovingIndex]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    containerProps: {
      onKeyDown: handleKeyDown,
      role: orientation === 'vertical' ? 'menu' : 'menubar'
    },
    getItemProps
  };
}

// Usage Example: Accessible Menu
const Menu: React.FC<MenuProps> = ({ items, onSelect }) => {
  const { containerProps, getItemProps } = useKeyboardNavigation(
    items.length,
    {
      orientation: 'vertical',
      wrap: true,
      onActivate: (index) => onSelect(items[index])
    }
  );

  return (
    <ul {...containerProps}>
      {items.map((item, index) => (
        <li
          key={item.id}
          {...getItemProps(index)}
          role="menuitem"
        >
          {item.label}
        </li>
      ))}
    </ul>
  );
};

// Keyboard Shortcut Hook
interface Shortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  handler: () => void;
  description?: string;
  preventDefault?: boolean;
}

function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcuts.find((s) => {
        const modifiersMatch =
          (!s.modifiers || s.modifiers.length === 0)
            ? true
            : s.modifiers.every((mod) => {
                switch (mod) {
                  case 'ctrl':
                    return event.ctrlKey;
                  case 'alt':
                    return event.altKey;
                  case 'shift':
                    return event.shiftKey;
                  case 'meta':
                    return event.metaKey;
                }
              });

        const keyMatch = event.key.toLowerCase() === s.key.toLowerCase();

        return modifiersMatch && keyMatch;
      });

      if (shortcut) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.handler();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Usage: Global shortcuts
function useGlobalShortcuts() {
  useKeyboardShortcuts([
    {
      key: 'k',
      modifiers: ['ctrl', 'shift'],
      handler: () => openSearchModal(),
      description: 'Open search'
    },
    {
      key: '?',
      handler: () => openHelpModal(),
      description: 'Show keyboard shortcuts'
    },
    {
      key: 'Escape',
      handler: () => closeAllModals(),
      description: 'Close modals'
    }
  ]);
}
```

### 3. Screen Reader Announcements

```typescript
// Live Region Component for Announcements
interface LiveRegionProps {
  children: React.ReactNode;
  polite?: boolean;
  assertive?: boolean;
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
}

const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  polite = true,
  assertive = false,
  atomic = true,
  relevant = 'additions text'
}) => {
  return (
    <div
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className="sr-only"
    >
      {children}
    </div>
  );
};

// Hook for announcing changes
function useAnnouncer() {
  const announce = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.getElementById('announcer');
    if (announcer) {
      announcer.setAttribute('aria-live', priority);
      announcer.textContent = '';
      // Force reflow
      void announcer.offsetHeight;
      announcer.textContent = message;
    }
  }, []);

  return { announce };
}

// Usage: Form validation announcement
const FormField: React.FC<FormFieldProps> = ({ label, error, children }) => {
  const { announce } = useAnnouncer();
  const previousError = React.useRef<string | undefined>(error);

  React.useEffect(() => {
    if (error && error !== previousError.current) {
      announce(`Error: ${error}`, 'assertive');
    }
    previousError.current = error;
  }, [error, announce]);

  return (
    <div className="form-field">
      <label>{label}</label>
      {children}
      {error && (
        <span role="alert" className="error-message">
          {error}
        </span>
      )}
    </div>
  );
};

// Progress Announcement Component
interface ProgressAnnouncementProps {
  current: number;
  total: number;
  label: string;
}

const ProgressAnnouncement: React.FC<ProgressAnnouncementProps> = ({
  current,
  total,
  label
}) => {
  const percentage = Math.round((current / total) * 100);

  return (
    <LiveRegion polite>
      {label}: {current} of {total} ({percentage}%)
    </LiveRegion>
  );
};

// Usage: File upload progress
const FileUpload: React.FC<FileUploadProps> = ({ files }) => {
  const [uploaded, setUploaded] = React.useState(0);

  return (
    <div>
      <ProgressBar value={uploaded} max={files.length} />
      <ProgressAnnouncement
        current={uploaded}
        total={files.length}
        label="Files uploaded"
      />
      {/* Upload logic */}
    </div>
  );
};
```

### 4. Reduced Motion Support

```typescript
// Hook to detect reduced motion preference
function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// Animation component that respects reduced motion
interface SafeAnimationProps {
  children: React.ReactNode;
  duration?: string;
  type?: 'fade' | 'slide' | 'scale' | 'custom';
  customAnimation?: string;
}

const SafeAnimation: React.FC<SafeAnimationProps> = ({
  children,
  duration = '200ms',
  type = 'fade',
  customAnimation
}) => {
  const prefersReducedMotion = useReducedMotion();

  const animationStyle: React.CSSProperties = prefersReducedMotion
    ? {
        animation: 'none',
        transition: 'none'
      }
    : {
        animation: customAnimation || getDefaultAnimation(type, duration),
        transition: `all ${duration} ease-in-out`
      };

  return <div style={animationStyle}>{children}</div>;
};

function getDefaultAnimation(type: string, duration: string): string {
  switch (type) {
    case 'fade':
      return `fadeIn ${duration} ease-out`;
    case 'slide':
      return `slideIn ${duration} ease-out`;
    case 'scale':
      return `scaleIn ${duration} ease-out`;
    default:
      return `fadeIn ${duration} ease-out`;
  }
}

// CSS for reduced motion
const reducedMotionStyles = `
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Provide alternative for essential animations */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
    opacity: 1;
  }
  
  .modal-enter {
    opacity: 1;
    transform: none;
  }
}
`;
```

### 5. Component Testing for Accessibility

```typescript
// Accessibility Test Utilities
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';

interface AccessibilityTestOptions {
  rules?: axe.RuleOptions;
  tags?: string[];
}

async function runAxeTest(
  container: HTMLElement,
  options: AccessibilityTestOptions = {}
): Promise<axe.AxeResults> {
  const results = await axe.run(container, {
    rules: options.rules,
    tags: options.tags || ['wcag2a', 'wcag2aa']
  });

  if (results.violations.length > 0) {
    console.error('Accessibility violations:', results.violations);
    throw new Error(
      `Found ${results.violations.length} accessibility violations`
    );
  }

  return results;
}

// Test: Button Accessibility
describe('Button', () => {
  it('should be accessible', async () => {
    const { container } = render(
      <Button onClick={() => {}}>Click me</Button>
    );

    await runAxeTest(container);
  });

  it('should be keyboard accessible', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button');
    
    // Focus with Tab
    button.focus();
    expect(document.activeElement).toBe(button);

    // Activate with Enter
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Activate with Space
    fireEvent.keyDown(button, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('should announce loading state', async () => {
    const { rerender } = render(
      <Button isLoading={false}>Click me</Button>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'false');

    rerender(<Button isLoading={true}>Click me</Button>);
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('should be disabled when loading', () => {
    render(<Button isLoading={true}>Click me</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });
});

// Test: Modal Accessibility
describe('Modal', () => {
  it('should trap focus', async () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <input data-testid="first-input" />
        <input data-testid="last-input" />
      </Modal>
    );

    const firstInput = screen.getByTestId('first-input');
    const lastInput = screen.getByTestId('last-input');

    // Tab from last should go to first
    lastInput.focus();
    fireEvent.keyDown(lastInput, { key: 'Tab' });
    expect(document.activeElement).toBe(firstInput);

    // Shift+Tab from first should go to last
    firstInput.focus();
    fireEvent.keyDown(firstInput, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastInput);
  });

  it('should return focus on close', () => {
    const onClose = jest.fn();
    const triggerButton = <button onClick={onClose}>Open</button>;
    
    render(
      <>
        {triggerButton}
        <Modal isOpen={true} onClose={onClose} title="Test" />
      </>
    );

    onClose();
    
    // Focus should return to trigger button
    expect(triggerButton).toHaveFocus();
  });

  it('should close on Escape', () => {
    const onClose = jest.fn();
    render(<Modal isOpen={true} onClose={onClose} title="Test" />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should have proper ARIA attributes', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="Test Modal" />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });
});

// Test: Form Field Accessibility
describe('FormField', () => {
  it('should associate label with input', () => {
    render(
      <FormField label="Email">
        <input type="email" />
      </FormField>
    );

    const label = screen.getByLabelText('Email');
    expect(label).toBeInTheDocument();
  });

  it('should announce errors', async () => {
    render(
      <FormField label="Email" error="Invalid email format">
        <input type="email" aria-invalid="true" />
      </FormField>
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');

    const errorId = input.getAttribute('aria-describedby');
    expect(screen.getByTestId(errorId)).toHaveTextContent('Invalid email format');
  });
});
```

### 6. Design System Component API

```typescript
// Component API Design Principles
interface ComponentAPIDesign {
  // 1. Clear prop naming
  props: {
    // ✅ Good: Clear, consistent naming
    variant: 'primary' | 'secondary';
    size: 'sm' | 'md' | 'lg';
    isLoading: boolean;
    isDisabled: boolean;
    
    // ❌ Bad: Inconsistent, unclear
    // type: string;
    // loading: boolean; // vs isLoading
    // disabled: boolean; // vs isDisabled
  };

  // 2. Sensible defaults
  defaults: {
    variant: 'primary';
    size: 'md';
    isLoading: false;
    isDisabled: false;
  };

  // 3. Composition over configuration
  composition: {
    // ✅ Good: Composable
    <Button>
      <Button.LeftIcon>{icon}</Button.LeftIcon>
      Button Text
      <Button.RightIcon>{icon}</Button.RightIcon>
    </Button>
    
    // ❌ Bad: Boolean props for everything
    <Button 
      showLeftIcon={true}
      showRightIcon={true}
      iconPosition="left"
    />
  };

  // 4. Escape hatches
  escapeHatches: {
    // Allow custom className for overrides
    className?: string;
    style?: React.CSSProperties;
    
    // Allow ref forwarding
    ref: React.Ref<HTMLButtonElement>;
    
    // Allow any valid HTML prop
    ...props: React.ButtonHTMLAttributes<HTMLButtonElement>;
  };
}

// Compound Component Pattern
interface CompoundButton {
  // Root component
  (props: ButtonRootProps): JSX.Element;
  
  // Sub-components
  Icon: typeof ButtonIcon;
  Label: typeof ButtonLabel;
  Spinner: typeof ButtonSpinner;
}

const Button: CompoundButton = Object.assign(
  ButtonRoot,
  {
    Icon: ButtonIcon,
    Label: ButtonLabel,
    Spinner: ButtonSpinner
  }
);

// Usage
<Button variant="primary">
  <Button.Icon>{saveIcon}</Button.Icon>
  <Button.Label>Save</Button.Label>
</Button>

// Render Props Pattern
interface SelectProps<T> {
  value: T | null;
  onChange: (value: T | null) => void;
  children: (props: SelectRenderProps<T>) => React.ReactNode;
}

function Select<T>({ value, onChange, children }: SelectProps<T>) {
  const renderProps: SelectRenderProps<T> = {
    value,
    onChange,
    isOpen,
    toggle,
    options
  };

  return children(renderProps);
}

// Usage
<Select value={selected} onChange={setSelected}>
  {({ value, onChange, isOpen, toggle, options }) => (
    <div>
      <button onClick={toggle}>
        {value?.label || 'Select...'}
      </button>
      {isOpen && (
        <Menu>
          {options.map(option => (
            <MenuItem
              key={option.value}
              onClick={() => onChange(option)}
            >
              {option.label}
            </MenuItem>
          ))}
        </Menu>
      )}
    </div>
  )}
</Select>

// Hook-based API
function useSelect<T>(options: SelectOptions<T>) {
  const [value, setValue] = useState<T | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  
  return {
    value,
    onChange: setValue,
    isOpen,
    toggle: () => setIsOpen(!isOpen),
    options: options.items
  };
}

// Usage
function MySelect() {
  const { value, onChange, isOpen, toggle, options } = useSelect({
    items: [...]
  });

  return (
    // Use the state to build custom UI
  );
}
```

---

## Best Practices

### 1. Semantic HTML First
```typescript
// ✅ Good: Semantic HTML
<button onClick={handleClick}>Click</button>
<a href="/page">Link</a>
<nav><ul><li>...</li></ul></nav>
<main>...</main>

// ❌ Bad: Div soup
<div onClick={handleClick}>Click</div>
<div onClick={() => navigate('/page')}>Link</div>
<div><div><div>...</div></div></div>
```

### 2. Focus Management
```typescript
// ✅ Good: Manage focus on dynamic changes
useEffect(() => {
  if (modalOpen) {
    firstFocusableElement.focus();
  }
}, [modalOpen]);

// ❌ Bad: Focus lost
const openModal = () => {
  setModalOpen(true);
  // Focus goes to body, keyboard users lost
};
```

### 3. Test With Real Tools
```typescript
// ✅ Good: Test with screen readers
// - NVDA (Windows, free)
// - VoiceOver (Mac, built-in)
// - JAWS (Windows, paid)

// Test keyboard navigation manually
// Test with browser accessibility tools

// ❌ Bad: Only automated tests
// Automated tools catch ~30% of issues
// Manual testing is essential
```

---

## Anti-Patterns

### ❌ Clickable Divs
```typescript
// ❌ Bad: Not accessible
<div onClick={handleClick} className="button">
  Click me
</div>

// ✅ Good: Use proper element
<button onClick={handleClick} className="button">
  Click me
</button>
```

### ❌ Missing Focus States
```css
/* ❌ Bad: Removing focus outline */
button:focus {
  outline: none;
}

/* ✅ Good: Custom focus style */
button:focus {
  outline: 2px solid #0066CC;
  outline-offset: 2px;
}
```

### ❌ Icon-Only Without Label
```typescript
// ❌ Bad: No accessible name
<button>
  <SearchIcon />
</button>

// ✅ Good: Accessible name
<button aria-label="Search">
  <SearchIcon aria-hidden="true" />
</button>
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Axe Violations** | 0 | Accessibility compliance |
| **Keyboard Coverage** | 100% | Keyboard user support |
| **Screen Reader Tested** | All components | Real-world compatibility |
| **Focus Management** | 100% | Navigation quality |
| **Test Coverage** | >90% | Quality assurance |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **axe-core** | Accessibility testing | Automated checks |
| **Testing Library** | Component testing | User-centric tests |
| **Storybook** | Component docs | Visual testing |
| **Playwright** | E2E testing | A11y automation |
| **NVDA/VoiceOver** | Screen readers | Manual testing |

---

## Implementation Checklist

### Foundation
- [ ] Accessibility guidelines documented
- [ ] Component API patterns defined
- [ ] Testing setup configured
- [ ] Screen reader testing planned

### Components
- [ ] Semantic HTML used
- [ ] Keyboard navigation implemented
- [ ] Focus management added
- [ ] ARIA attributes correct
- [ ] Screen reader tested

### Quality
- [ ] Axe tests passing
- [ ] Keyboard tests passing
- [ ] Manual a11y review done
- [ ] Documentation complete

---

## Related Skills

- **UI/UX Design**: `skills/product/ui-ux-design/ui_ux_design_v1/SKILL.md`
- **UX Research**: `skills/product/ux-research/ux_research_v1/SKILL.md`
- **Accessibility WCAG**: `skills/governance/accessibility-wcag/accessibility_wcag_skill_v1/SKILL.md`
- **React**: `skills/stack/react/react_hooks_architecture_skill_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
