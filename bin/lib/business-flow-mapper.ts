/**
 * Business Flow Mapper — Analyzes user journeys, data flow, and integration points
 *
 * Provides:
 * - map(rootPath, stack): Identifies user journeys from route/file structure
 * - analyzeDataFlow(rootPath): Traces data flow through imports and function calls
 * - findIntegrationPoints(stack): Identifies external API integrations from dependencies
 */

import fs from 'fs';
import path from 'path';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface StackData {
  frameworks?: string[];
  infrastructure?: string[];
  databases?: string[];
  [key: string]: any;
}

export interface Route {
  path: string;
  file: string;
  name: string;
}

export interface UserJourney {
  name: string;
  path: string;
  components: string[];
  routes: string[];
  framework?: string;
}

export interface DataFlow {
  file: string;
  imports: number;
  exports: number;
  transformations: string[];
}

export interface DataStore {
  type: string;
  path: string;
  name: string;
}

export interface Integration {
  name: string;
  type: string;
  purpose: string;
}

export interface BusinessFlowResult {
  journeys: UserJourney[];
  entryPoints: string[];
  routes: Route[];
}

export interface DataFlowResult {
  flows: DataFlow[];
  dataStores: DataStore[];
}

export interface IntegrationResult {
  integrations: Integration[];
}

// ─── BusinessFlowMapper Class ────────────────────────────────────────────────

export class BusinessFlowMapper {
  private rootPath: string;

  /**
   * Create a BusinessFlowMapper instance
   * @param rootPath - Root directory to analyze
   */
  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  /**
   * Map business flows from codebase structure
   * @param rootPath - Root directory to analyze
   * @param stack - Stack object from StackDetector
   * @returns Object with journeys and entryPoints
   */
  map(rootPath: string = this.rootPath, stack: StackData = {}): BusinessFlowResult {
    const routes = this.findRoutes(rootPath);
    const journeys = this.extractJourneys(routes, stack);
    const entryPoints = this.findEntryPoints(rootPath);

    return {
      journeys,
      entryPoints,
      routes
    };
  }

  /**
   * Analyze data flow through the codebase
   * @param rootPath - Root directory to analyze
   * @returns Object with flows and dataStores
   */
  analyzeDataFlow(rootPath: string = this.rootPath): DataFlowResult {
    const sourceFiles = this.getSourceFiles(rootPath);
    const flows = this.traceDataFlow(sourceFiles, rootPath);
    const dataStores = this.findDataStores(sourceFiles, rootPath);

    return {
      flows,
      dataStores
    };
  }

  /**
   * Find integration points from stack dependencies
   * @param stack - Stack object from StackDetector
   * @returns Object with integrations array
   */
  findIntegrationPoints(stack: StackData = {}): IntegrationResult {
    const integrations: Integration[] = [];
    const frameworks = stack.frameworks || [];
    const infrastructure = stack.infrastructure || [];
    const databases = stack.databases || [];

    // Payment integrations
    if (frameworks.includes('Stripe') || infrastructure.some(i => i.includes('Stripe'))) {
      integrations.push({
        name: 'Stripe',
        type: 'payment',
        purpose: 'Payment processing and subscriptions'
      });
    }

    // Cloud integrations
    if (infrastructure.some(i => i.includes('AWS'))) {
      integrations.push({
        name: 'AWS',
        type: 'cloud',
        purpose: 'Cloud infrastructure and services'
      });
    }
    if (infrastructure.some(i => i.includes('Azure'))) {
      integrations.push({
        name: 'Azure',
        type: 'cloud',
        purpose: 'Cloud infrastructure and services'
      });
    }
    if (infrastructure.some(i => i.includes('Google Cloud'))) {
      integrations.push({
        name: 'Google Cloud',
        type: 'cloud',
        purpose: 'Cloud infrastructure and services'
      });
    }

    // Monitoring integrations
    if (infrastructure.some(i => i.includes('Sentry'))) {
      integrations.push({
        name: 'Sentry',
        type: 'monitoring',
        purpose: 'Error tracking and monitoring'
      });
    }
    if (infrastructure.some(i => i.includes('Datadog'))) {
      integrations.push({
        name: 'Datadog',
        type: 'monitoring',
        purpose: 'Infrastructure and application monitoring'
      });
    }

    // Email integrations
    if (infrastructure.some(i => i.includes('SendGrid') || i.includes('Mailgun'))) {
      integrations.push({
        name: 'Email Service',
        type: 'communication',
        purpose: 'Transactional email delivery'
      });
    }

    // Database integrations
    for (const db of databases) {
      integrations.push({
        name: db,
        type: 'database',
        purpose: 'Data persistence'
      });
    }

    // Auth integrations
    if (frameworks.includes('NextAuth.js') || frameworks.includes('Auth.js')) {
      integrations.push({
        name: 'NextAuth.js',
        type: 'authentication',
        purpose: 'User authentication and authorization'
      });
    }

    return {
      integrations
    };
  }

  /**
   * Find route files in the codebase
   */
  private findRoutes(rootPath: string): Route[] {
    const routes: Route[] = [];
    const routePatterns = [
      'src/pages',
      'src/app',
      'src/routes',
      'pages',
      'app',
      'routes',
      'src/controllers',
      'controllers'
    ];

    for (const pattern of routePatterns) {
      const routeDir = path.join(rootPath, pattern);
      if (fs.existsSync(routeDir)) {
        this.collectRoutes(routeDir, routes, pattern);
      }
    }

    return routes;
  }

  /**
   * Collect routes from directory
   */
  private collectRoutes(dir: string, routes: Route[], basePath: string, depth: number = 0): void {
    if (depth > 5) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          this.collectRoutes(fullPath, routes, basePath, depth + 1);
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          const relativePath = path.relative(path.join(this.rootPath, basePath), fullPath);
          const routePath = this.fileToRoute(relativePath);
          routes.push({
            path: routePath,
            file: fullPath,
            name: path.basename(entry.name, path.extname(entry.name))
          });
        }
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Convert file path to route path
   */
  private fileToRoute(filePath: string): string {
    let route = filePath
      .replace(/^(page|route|layout)\./, '')
      .replace(/\.tsx?$/, '')
      .replace(/\.jsx?$/, '')
      .replace(/\\/g, '/')
      .replace(/\/index$/, '')
      .replace(/\[(\w+)\]/g, ':$1');

    return '/' + route;
  }

  /**
   * Extract user journeys from routes
   */
  private extractJourneys(routes: Route[], stack: StackData): UserJourney[] {
    const journeys: UserJourney[] = [];

    // Group routes by prefix to identify journeys
    const routeGroups: Record<string, Route[]> = {};
    for (const route of routes) {
      const parts = route.path.split('/').filter(p => p && !p.startsWith(':'));
      if (parts.length > 0) {
        const prefix = parts[0];
        if (!routeGroups[prefix]) {
          routeGroups[prefix] = [];
        }
        routeGroups[prefix].push(route);
      }
    }

    // Create journeys from route groups
    for (const [prefix, groupRoutes] of Object.entries(routeGroups)) {
      const journey: UserJourney = {
        name: this.capitalize(prefix),
        path: `/${prefix}`,
        components: groupRoutes.map(r => r.name),
        routes: groupRoutes.map(r => r.path)
      };

      // Enhance with stack-specific info
      if (stack.frameworks?.includes('Next.js')) {
        journey.framework = 'Next.js Pages/App Router';
      } else if (stack.frameworks?.includes('React')) {
        journey.framework = 'React Router';
      }

      journeys.push(journey);
    }

    return journeys;
  }

  /**
   * Find entry points in the codebase
   */
  private findEntryPoints(rootPath: string): string[] {
    const entryPoints: string[] = [];
    const entryPatterns = [
      'src/index.ts',
      'src/index.tsx',
      'src/index.js',
      'src/main.ts',
      'src/main.tsx',
      'src/app.tsx',
      'src/app.ts',
      'index.ts',
      'index.tsx',
      'index.js',
      'main.ts',
      'app.tsx'
    ];

    for (const pattern of entryPatterns) {
      const entryPath = path.join(rootPath, pattern);
      if (fs.existsSync(entryPath)) {
        entryPoints.push(entryPath);
      }
    }

    return entryPoints;
  }

  /**
   * Trace data flow through source files
   */
  private traceDataFlow(sourceFiles: string[], rootPath: string): DataFlow[] {
    const flows: DataFlow[] = [];

    for (const file of sourceFiles.slice(0, 50)) { // Limit to 50 files
      try {
        const content = fs.readFileSync(file, 'utf8');

        // Look for data flow patterns
        const importMatches = content.match(/import\s+.*?\s+from\s+['"](.+?)['"]/g) || [];
        const exportMatches = content.match(/export\s+(default\s+)?(function|class|const|let|var)/g) || [];

        if (importMatches.length > 0 || exportMatches.length > 0) {
          flows.push({
            file,
            imports: importMatches.length,
            exports: exportMatches.length,
            transformations: this.detectTransformations(content)
          });
        }
      } catch {
        // Ignore read errors
      }
    }

    return flows;
  }

  /**
   * Detect data transformations in code
   */
  private detectTransformations(content: string): string[] {
    const transformations: string[] = [];

    // Look for common transformation patterns
    const patterns: Record<string, RegExp> = {
      map: /\.map\(/,
      filter: /\.filter\(/,
      reduce: /\.reduce\(/,
      transform: /\.transform\(/,
      parse: /\.parse\(|JSON\.parse/,
      stringify: /\.stringify\(|JSON\.stringify/
    };

    for (const [name, regex] of Object.entries(patterns)) {
      if (regex.test(content)) {
        transformations.push(name);
      }
    }

    return transformations;
  }

  /**
   * Find data stores in the codebase
   */
  private findDataStores(sourceFiles: string[], rootPath: string): DataStore[] {
    const dataStores: DataStore[] = [];

    // Look for store patterns
    const storePatterns = [
      'src/stores',
      'src/store',
      'stores',
      'store',
      'src/models',
      'models',
      'src/db',
      'db',
      'src/database',
      'database'
    ];

    for (const pattern of storePatterns) {
      const storePath = path.join(rootPath, pattern);
      if (fs.existsSync(storePath)) {
        dataStores.push({
          type: 'store',
          path: storePath,
          name: pattern.split('/').pop() || pattern
        });
      }
    }

    return dataStores;
  }

  /**
   * Get source files from directory
   */
  private getSourceFiles(rootPath: string): string[] {
    const files: string[] = [];
    const srcDir = path.join(rootPath, 'src');

    if (fs.existsSync(srcDir)) {
      this.collectSourceFiles(srcDir, files);
    } else {
      this.collectSourceFiles(rootPath, files);
    }

    return files;
  }

  /**
   * Collect source files from directory
   */
  private collectSourceFiles(dir: string, files: string[], depth: number = 0): void {
    if (depth > 5 || dir.includes('node_modules') || dir.includes('dist') || dir.includes('build')) {
      return;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          this.collectSourceFiles(fullPath, files, depth + 1);
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
