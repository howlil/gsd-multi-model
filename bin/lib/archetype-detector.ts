/**
 * Archetype Detector — Project type classification from codebase patterns
 *
 * Provides:
 * - detect(structure, stack, flows): Pattern-based archetype detection
 * - calculateConfidence(archetype, evidence): Confidence scoring
 */

import path from 'path';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface ArchetypePattern {
  patterns: string[];
  routes: string[];
  dependencies: string[];
}

export interface Evidence {
  type: string;
  value: string;
  pattern: string;
}

export interface ArchetypeEvidence {
  [key: string]: Evidence[];
}

export interface ArchetypeScores {
  [key: string]: number;
}

export interface ArchetypeResult {
  archetype: string;
  confidence: number;
  confidenceLevel: string;
  scores: ArchetypeScores;
  evidence: Evidence[];
  allEvidence: ArchetypeEvidence;
}

export interface ConfidenceResult {
  score: number;
  level: string;
}

// ─── ArchetypeDetector Class ─────────────────────────────────────────────────

export class ArchetypeDetector {
  private rootPath: string;
  private archetypePatterns: Record<string, ArchetypePattern>;

  /**
   * Create an ArchetypeDetector instance
   * @param rootPath - Root directory to analyze
   */
  constructor(rootPath: string) {
    this.rootPath = rootPath;

    // Archetype patterns for detection
    this.archetypePatterns = {
      dashboard: {
        patterns: ['Chart', 'Metric', 'Dashboard', 'Admin', 'Analytics', 'stats', 'metrics', 'analytics', 'graph', 'widget', 'kpi', 'report'],
        routes: ['/dashboard', '/admin', '/analytics', '/reports', '/metrics'],
        dependencies: ['recharts', 'chart.js', 'd3', 'plotly', 'highcharts', 'apexcharts']
      },
      POS: {
        patterns: ['Product', 'Order', 'Payment', 'Cart', 'Checkout', 'Inventory', 'Store', 'Register', 'Terminal', 'Receipt', 'Cashier'],
        routes: ['/pos', '/checkout', '/register', '/inventory', '/products'],
        dependencies: ['stripe-terminal', 'square', '@stripe/stripe-js']
      },
      SaaS: {
        patterns: ['Subscription', 'Tenant', 'Plan', 'Billing', 'User', 'Account', 'Recurring', 'Invoice', 'Pricing'],
        routes: ['/subscription', '/billing', '/pricing', '/plans', '/account', '/settings'],
        dependencies: ['stripe', '@stripe/stripe-js', 'paddle', 'lemonsqueezy']
      },
      ecommerce: {
        patterns: ['Cart', 'Checkout', 'Product', 'Order', 'Shipping', 'Payment', 'Catalog', 'Wishlist', 'Review'],
        routes: ['/products', '/cart', '/checkout', '/orders', '/wishlist', '/reviews'],
        dependencies: ['@stripe/stripe-js', 'stripe', 'paypal', 'snipcart']
      },
      LMS: {
        patterns: ['Course', 'Lesson', 'Student', 'Teacher', 'Quiz', 'Enrollment', 'Curriculum', 'Assignment', 'Grade'],
        routes: ['/courses', '/lessons', '/students', '/teachers', '/quiz', '/assignments'],
        dependencies: ['video.js', 'hls.js', 'plyr']
      },
      booking: {
        patterns: ['Appointment', 'Booking', 'Availability', 'Calendar', 'Reservation', 'Schedule', 'Timeslot'],
        routes: ['/booking', '/appointments', '/calendar', '/schedule', '/availability'],
        dependencies: ['react-big-calendar', 'fullcalendar', 'react-calendar']
      },
      fintech: {
        patterns: ['Transaction', 'Account', 'Payment', 'Balance', 'Compliance', 'KYC', 'AML', 'Ledger', 'Wallet', 'Transfer'],
        routes: ['/accounts', '/transactions', '/transfer', '/wallet', '/ledger', '/compliance'],
        dependencies: ['stripe', 'plaid', 'dwolla', 'unit']
      },
      internalTools: {
        patterns: ['Admin', 'CRUD', 'Form', 'Table', 'Dashboard', 'Report', 'Config', 'Settings', 'Management'],
        routes: ['/admin', '/management', '/config', '/settings', '/users', '/roles'],
        dependencies: ['@tanstack/react-table', 'ag-grid', 'handsontable']
      },
      cms: {
        patterns: ['Article', 'Page', 'Post', 'Media', 'Content', 'Block', 'Editor', 'Publish'],
        routes: ['/articles', '/pages', '/posts', '/media', '/content'],
        dependencies: ['@tiptap', 'slate', 'draft-js', 'quill', 'ckeditor']
      },
      social: {
        patterns: ['Post', 'Comment', 'Feed', 'Follow', 'Like', 'Share', 'Profile', 'Notification', 'Message'],
        routes: ['/feed', '/posts', '/profile', '/notifications', '/messages', '/followers'],
        dependencies: ['socket.io', 'pusher', 'stream-chat']
      }
    };
  }

  /**
   * Detect project archetype from structure, stack, and flows
   * @param structure - Structure from CodebaseAnalyzer
   * @param stack - Stack from StackDetector
   * @param flows - Flows from BusinessFlowMapper
   * @returns Archetype detection result with name, confidence, evidence
   */
  detect(structure: any = {}, stack: any = {}, flows: any = {}): ArchetypeResult {
    const scores: ArchetypeScores = {};
    const evidence: ArchetypeEvidence = {};

    // Initialize scores for each archetype
    for (const archetype of Object.keys(this.archetypePatterns)) {
      scores[archetype] = 0;
      evidence[archetype] = [];
    }

    // Score based on file names
    const files = structure.files || [];
    for (const file of files) {
      const fileName = path.basename(file);
      this.scoreByFileName(fileName, scores, evidence);
    }

    // Score based on directory names
    const directories = structure.directories || [];
    for (const dir of directories) {
      const dirName = path.basename(dir.path);
      this.scoreByDirectoryName(dirName, scores, evidence);
    }

    // Score based on routes
    const routes = flows.routes || [];
    for (const route of routes) {
      this.scoreByRoute(route.path, scores, evidence);
    }

    // Score based on dependencies
    const frameworks = stack.frameworks || [];
    const infrastructure = stack.infrastructure || [];
    const allDeps = [...frameworks, ...infrastructure];
    this.scoreByDependencies(allDeps, scores, evidence);

    // Find the highest scoring archetype
    let bestArchetype = 'internalTools'; // Default
    let bestScore = 0;

    for (const [archetype, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestArchetype = archetype;
      }
    }

    const confidence = this.calculateConfidence(bestArchetype, evidence[bestArchetype]);

    return {
      archetype: bestArchetype,
      confidence: confidence.score,
      confidenceLevel: confidence.level,
      scores,
      evidence: evidence[bestArchetype],
      allEvidence: evidence
    };
  }

  /**
   * Calculate confidence score for an archetype
   * @param archetype - Archetype name
   * @param evidence - Array of evidence items
   * @returns Confidence with score (0-100) and level (High/Medium/Low)
   */
  calculateConfidence(archetype: string, evidence: Evidence[] = []): ConfidenceResult {
    // Base score: evidence.length * 10
    let score = evidence.length * 10;

    // Bonus for file matches: +20 per file
    const fileMatches = evidence.filter(e => e.type === 'file').length;
    score += fileMatches * 20;

    // Bonus for dependency matches: +15 per dependency
    const depMatches = evidence.filter(e => e.type === 'dependency').length;
    score += depMatches * 15;

    // Bonus for route matches: +10 per route
    const routeMatches = evidence.filter(e => e.type === 'route').length;
    score += routeMatches * 10;

    // Cap at 100
    score = Math.min(score, 100);

    // Determine level
    let level: string;
    if (score >= 80) {
      level = 'High';
    } else if (score >= 60) {
      level = 'Medium';
    } else {
      level = 'Low';
    }

    return { score, level };
  }

  /**
   * Score archetype by file name
   */
  private scoreByFileName(fileName: string, scores: ArchetypeScores, evidence: ArchetypeEvidence): void {
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');

    for (const [archetype, config] of Object.entries(this.archetypePatterns)) {
      for (const pattern of config.patterns) {
        if (nameWithoutExt.toLowerCase().includes(pattern.toLowerCase())) {
          scores[archetype] += 1;
          evidence[archetype].push({
            type: 'file',
            value: fileName,
            pattern
          });
          break; // Don't double-count same file
        }
      }
    }
  }

  /**
   * Score archetype by directory name
   */
  private scoreByDirectoryName(dirName: string, scores: ArchetypeScores, evidence: ArchetypeEvidence): void {
    for (const [archetype, config] of Object.entries(this.archetypePatterns)) {
      for (const pattern of config.patterns) {
        if (dirName.toLowerCase().includes(pattern.toLowerCase())) {
          scores[archetype] += 2; // Directories are stronger signals
          evidence[archetype].push({
            type: 'directory',
            value: dirName,
            pattern
          });
          break;
        }
      }
    }
  }

  /**
   * Score archetype by route
   */
  private scoreByRoute(routePath: string, scores: ArchetypeScores, evidence: ArchetypeEvidence): void {
    for (const [archetype, config] of Object.entries(this.archetypePatterns)) {
      for (const routePattern of config.routes) {
        if (routePath.toLowerCase().includes(routePattern.toLowerCase())) {
          scores[archetype] += 2;
          evidence[archetype].push({
            type: 'route',
            value: routePath,
            pattern: routePattern
          });
          break;
        }
      }
    }
  }

  /**
   * Score archetype by dependencies
   */
  private scoreByDependencies(dependencies: string[], scores: ArchetypeScores, evidence: ArchetypeEvidence): void {
    for (const [archetype, config] of Object.entries(this.archetypePatterns)) {
      for (const depPattern of config.dependencies) {
        for (const dep of dependencies) {
          if (dep.toLowerCase().includes(depPattern.toLowerCase())) {
            scores[archetype] += 3; // Dependencies are strong signals
            evidence[archetype].push({
              type: 'dependency',
              value: dep,
              pattern: depPattern
            });
            break;
          }
        }
      }
    }
  }

  /**
   * Get all supported archetypes
   * @returns Array of archetype names
   */
  getSupportedArchetypes(): string[] {
    return Object.keys(this.archetypePatterns);
  }

  /**
   * Get archetype description
   * @param archetype - Archetype name
   * @returns Description
   */
  getArchetypeDescription(archetype: string): string {
    const descriptions: Record<string, string> = {
      dashboard: 'Analytics dashboard with charts, metrics, and data visualization',
      POS: 'Point of Sale system for retail transactions and inventory management',
      SaaS: 'Software as a Service with subscription billing and multi-tenant architecture',
      ecommerce: 'E-commerce platform with product catalog, cart, and checkout',
      LMS: 'Learning Management System for courses, lessons, and student tracking',
      booking: 'Booking and appointment scheduling system',
      fintech: 'Financial technology application for transactions and account management',
      internalTools: 'Internal business tools and admin panels',
      cms: 'Content Management System for articles, pages, and media',
      social: 'Social platform with feeds, posts, and user interactions'
    };
    return descriptions[archetype] || 'Unknown project type';
  }
}
