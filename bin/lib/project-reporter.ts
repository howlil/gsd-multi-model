/**
 * Project Reporter — Aggregates codebase analysis into comprehensive reports
 */

import * as path from 'path';

interface Structure {
  modules?: Module[];
  directories?: Directory[];
  entryPoints?: string[];
  configFiles?: string[];
  sourceDirs?: string[];
  testDirs?: string[];
  files?: File[];
  [key: string]: unknown;
}

interface Module {
  type: string;
  path: string;
  fileCount: number;
}

interface Directory {
  path: string;
  depth: number;
}

interface File {
  path: string;
}

interface Stack {
  language?: string;
  runtime?: string;
  runtimeVersion?: string;
  packageManager?: string;
  frameworks?: string[];
  databases?: string[];
  infrastructure?: string[];
}

interface TechDebt {
  findings?: Finding[];
}

interface Finding {
  severity?: string;
  type?: string;
  file?: string;
  description?: string;
  content?: string;
  message?: string;
  package?: string;
  files?: string[];
}

interface Archetype {
  archetype?: string;
  description?: string;
  level?: string;
  confidence?: number;
}

interface Recommendation {
  title: string;
  issue: string;
  files?: string[];
  fix: string;
  effort: string;
}

class ProjectReporter {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  /**
   * Generate comprehensive project report
   */
  generate(structure: Structure, stack: Stack, techDebt: TechDebt, archetype: Archetype): string {
    const sections = [
      this._buildHeader(),
      this.buildArchitectureOverview(structure, stack, archetype),
      this.buildFileStructureSummary(structure),
      this.buildTechStackSummary(stack),
      this.buildPainPoints(techDebt),
      this.buildRecommendations(techDebt, stack, archetype),
      this._buildFooter()
    ];

    return sections.filter(Boolean).join('\n\n');
  }

  /**
   * Build architecture overview section
   */
  buildArchitectureOverview(structure: Structure, stack: Stack, archetype: Archetype): string {
    const lines: string[] = ['## Architecture Overview', ''];

    // Pattern
    lines.push('## Pattern');
    if (archetype?.archetype) {
      lines.push(`**${archetype.archetype}** — ${archetype.description || 'Detected project type'}`);
      lines.push(`**Confidence:** ${archetype.level || 'Medium'} (${archetype.confidence || 0}%)`);
    } else {
      const pattern = this._detectPattern(structure, stack);
      lines.push(`**${pattern}**`);
    }
    lines.push('');

    // Layers
    lines.push('## Layers');
    const modules = structure?.modules || [];
    if (modules.length > 0) {
      const layerTypes = [...new Set(modules.map(m => m.type))];
      for (const layerType of layerTypes) {
        const layerModules = modules.filter(m => m.type === layerType);
        lines.push(`- **${layerType}:** ${layerModules.length} module(s)`);
        for (const mod of layerModules.slice(0, 5)) {
          lines.push(`  - \`${mod.path.replace(this.rootPath, '')}\` (${mod.fileCount} files)`);
        }
      }
    } else {
      lines.push('- Detected from directory structure');
      const sourceDirs = structure?.sourceDirs || [];
      for (const dir of sourceDirs.slice(0, 5)) {
        lines.push(`  - \`${dir.replace(this.rootPath, '')}\``);
      }
    }
    lines.push('');

    // Data Flow
    lines.push('## Data Flow');
    lines.push('- Request → Controller/Route → Service → Model → Database');
    lines.push('- Component → Hook/Context → API → State');
    lines.push('');

    // Entry Points
    lines.push('## Entry Points');
    const entryPoints = structure?.entryPoints || [];
    if (entryPoints.length > 0) {
      for (const entry of entryPoints.slice(0, 10)) {
        lines.push(`- \`${entry.replace(this.rootPath, '')}\``);
      }
    } else {
      lines.push('- No standard entry points detected');
    }
    lines.push('');

    // Error Handling
    lines.push('## Error Handling');
    const hasErrorHandling = this._detectErrorHandling(stack);
    if (hasErrorHandling) {
      lines.push('- Error tracking: Sentry or similar detected');
      lines.push('- Logging: Winston/Pino or similar detected');
    } else {
      lines.push('- Standard try/catch patterns expected');
      lines.push('- Error boundaries in React components (if applicable)');
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Build file structure summary section
   */
  buildFileStructureSummary(structure: Structure): string {
    const lines: string[] = ['## File Structure', ''];

    const directories = structure?.directories || [];
    const entryPoints = structure?.entryPoints || [];
    const configFiles = structure?.configFiles || [];
    const sourceDirs = structure?.sourceDirs || [];
    const testDirs = structure?.testDirs || [];

    // Directory tree (simplified)
    lines.push('## Directory Layout');
    lines.push('```');
    lines.push('project/');

    const rootDirs = directories.filter(d => d.depth === 1);
    for (const dir of rootDirs.slice(0, 15)) {
      const prefix = '├── ';
      const name = path.basename(dir.path);
      lines.push(`${prefix}${name}/`);
    }
    if (directories.length > 15) {
      lines.push(`└── ... (${directories.length - 15} more directories)`);
    }
    lines.push('```');
    lines.push('');

    // Directory purposes
    lines.push('## Directory Purposes');
    for (const dir of rootDirs.slice(0, 10)) {
      const name = path.basename(dir.path);
      const purpose = this._getDirectoryPurpose(name);
      lines.push(`- **${name}/** — ${purpose}`);
    }
    lines.push('');

    // Key files
    lines.push('## Key Files');
    if (configFiles.length > 0) {
      lines.push('### Configuration');
      for (const file of configFiles.slice(0, 10)) {
        lines.push(`- \`${file.replace(this.rootPath, '')}\``);
      }
      lines.push('');
    }

    // Statistics
    lines.push('## Statistics');
    lines.push(`- **Total Directories:** ${directories.length}`);
    lines.push(`- **Total Files:** ${structure?.files?.length || 0}`);
    lines.push(`- **Source Directories:** ${sourceDirs.length}`);
    lines.push(`- **Test Directories:** ${testDirs.length}`);
    lines.push(`- **Entry Points:** ${entryPoints.length}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Build technology stack summary section
   */
  buildTechStackSummary(stack: Stack): string {
    const lines: string[] = ['## Technology Stack', ''];

    // Languages
    lines.push('## Languages');
    lines.push(`- **Primary:** ${stack?.language || 'JavaScript/TypeScript'}`);
    lines.push(`- **Runtime:** ${stack?.runtime || 'Node.js'}`);
    if (stack?.runtimeVersion) {
      lines.push(`- **Version:** ${stack.runtimeVersion}`);
    }
    lines.push('');

    // Package Manager
    lines.push('## Package Manager');
    lines.push(`- **Manager:** ${stack?.packageManager || 'npm'}`);
    lines.push('');

    // Frameworks
    lines.push('## Frameworks');
    const frameworks = stack?.frameworks || [];
    if (frameworks.length > 0) {
      for (const fw of frameworks) {
        lines.push(`- ${fw}`);
      }
    } else {
      lines.push('- No major frameworks detected');
    }
    lines.push('');

    // Databases
    lines.push('## Databases');
    const databases = stack?.databases || [];
    if (databases.length > 0) {
      for (const db of databases) {
        lines.push(`- ${db}`);
      }
    } else {
      lines.push('- No database libraries detected');
    }
    lines.push('');

    // Infrastructure
    lines.push('## Infrastructure');
    const infrastructure = stack?.infrastructure || [];
    if (infrastructure.length > 0) {
      for (const infra of infrastructure) {
        lines.push(`- ${infra}`);
      }
    } else {
      lines.push('- No infrastructure libraries detected');
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Build pain points section
   */
  buildPainPoints(techDebt: TechDebt): string {
    const lines: string[] = ['## Pain Points', ''];

    const findings = techDebt?.findings || [];
    if (findings.length === 0) {
      lines.push('No significant pain points detected.');
      lines.push('');
      return lines.join('\n');
    }

    // Group by severity
    const bySeverity: Record<string, Finding[]> = {
      Critical: [],
      High: [],
      Medium: [],
      Low: []
    };

    for (const finding of findings) {
      const severity = finding.severity || 'Medium';
      if (bySeverity[severity]) {
        bySeverity[severity]!.push(finding);
      }
    }

    // Critical Issues
    if (bySeverity.Critical && bySeverity.Critical.length > 0) {
      lines.push('## **Critical** Issues');
      for (const issue of bySeverity.Critical.slice(0, 10)) {
        lines.push(`- \`${issue.file?.replace(this.rootPath, '') || 'Unknown'}\`: ${issue.description || issue.content || issue.message}`);
      }
      lines.push('');
    }

    // High Priority
    if (bySeverity.High && bySeverity.High.length > 0) {
      lines.push('## **High** Priority');
      for (const issue of bySeverity.High.slice(0, 10)) {
        lines.push(`- \`${issue.file?.replace(this.rootPath, '') || 'Unknown'}\`: ${issue.description || issue.content || issue.message}`);
      }
      lines.push('');
    }

    // Medium Priority
    if (bySeverity.Medium && bySeverity.Medium.length > 0) {
      lines.push('## **Medium** Priority');
      lines.push(`- ${bySeverity.Medium.length} medium priority issues found`);
      lines.push('');
    }

    // Low Priority
    if (bySeverity.Low && bySeverity.Low.length > 0) {
      lines.push('## **Low** Priority');
      lines.push(`- ${bySeverity.Low.length} low priority issues found`);
      lines.push('');
    }

    // Summary
    lines.push('## Summary');
    lines.push(`- **Total Issues:** ${findings.length}`);
    lines.push(`- **Critical:** ${bySeverity.Critical!.length}`);
    lines.push(`- **High:** ${bySeverity.High!.length}`);
    lines.push(`- **Medium:** ${bySeverity.Medium!.length}`);
    lines.push(`- **Low:** ${bySeverity.Low!.length}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Build recommendations section
   */
  buildRecommendations(techDebt: TechDebt, stack: Stack, archetype: Archetype): string {
    const lines: string[] = ['## Recommendations', ''];

    const findings = techDebt?.findings || [];
    const recommendations: Recommendation[] = [];

    // Generate recommendations based on findings
    const byType: Record<string, Finding[]> = {};
    for (const finding of findings) {
      const type = finding.type || 'general';
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type]!.push(finding);
    }

    // Debt marker recommendations
    if (byType.debt_marker && byType.debt_marker.length > 0) {
      const criticalDebt = byType.debt_marker.filter(f => f.severity === 'Critical');
      if (criticalDebt.length > 0) {
        recommendations.push({
          title: 'Address Critical Tech Debt',
          issue: `${criticalDebt.length} critical debt markers found (DEPRECATED, critical FIXMEs)`,
          files: [...new Set(criticalDebt.map(f => f.file as string))].slice(0, 5),
          fix: 'Review and resolve deprecated code and critical FIXMEs immediately',
          effort: 'Medium'
        });
      }
    }

    // Large file recommendations
    if (byType.large_file && byType.large_file.length > 0) {
      recommendations.push({
        title: 'Refactor Large Files',
        issue: `${byType.large_file.length} files exceed size thresholds`,
        files: byType.large_file.map(f => f.file as string).slice(0, 5),
        fix: 'Break down large files into smaller, focused modules',
        effort: 'High'
      });
    }

    // Complexity recommendations
    if (byType.complexity && byType.complexity.length > 0) {
      recommendations.push({
        title: 'Reduce Code Complexity',
        issue: `${byType.complexity.length} functions/modules exceed complexity thresholds`,
        files: [...new Set(byType.complexity.map(f => f.file as string))].slice(0, 5),
        fix: 'Extract helper functions, reduce nesting, simplify logic',
        effort: 'Medium'
      });
    }

    // Duplicate code recommendations
    if (byType.duplicate && byType.duplicate.length > 0) {
      recommendations.push({
        title: 'Eliminate Duplicate Code',
        issue: `${byType.duplicate.length} duplicate code blocks detected`,
        files: byType.duplicate.flatMap(d => d.files || []).slice(0, 5),
        fix: 'Extract common logic into shared utilities or base classes',
        effort: 'Medium'
      });
    }

    // Dependency risk recommendations
    if (byType.dependency && byType.dependency.length > 0) {
      const criticalDeps = byType.dependency.filter(f => f.severity === 'Critical');
      if (criticalDeps.length > 0) {
        recommendations.push({
          title: 'Update Vulnerable Dependencies',
          issue: `${criticalDeps.length} critical security vulnerabilities in dependencies`,
          files: criticalDeps.map(d => d.package as string),
          fix: 'Run npm audit fix or manually update vulnerable packages',
          effort: 'Low'
        });
      }
    }

    // Archetype-specific recommendations
    if (archetype?.archetype) {
      const archetypeRecs = this._getArchetypeRecommendations(archetype.archetype);
      recommendations.push(...archetypeRecs);
    }

    // Output recommendations
    if (recommendations.length === 0) {
      lines.push('No specific recommendations at this time. The codebase appears to be in good shape.');
      lines.push('');
    } else {
      for (let i = 0; i < recommendations.length && i < 10; i++) {
        const rec = recommendations[i]!;
        lines.push(`## ${i + 1}. ${rec.title}`);
        lines.push(`**Issue:** ${rec.issue}`);
        if (rec.files && rec.files.length > 0) {
          lines.push('**Files:**');
          for (const file of rec.files) {
            lines.push(`- \`${file.replace?.(this.rootPath, '') || file}\``);
          }
        }
        lines.push(`**Fix approach:** ${rec.fix}`);
        lines.push(`**Effort:** ${rec.effort}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Detect architectural pattern from structure and stack
   */
  private _detectPattern(structure: Structure, stack: Stack): string {
    const directories = structure?.directories || [];
    const dirNames = directories.map(d => path.basename(d.path).toLowerCase());
    const frameworks = stack?.frameworks || [];

    if (dirNames.includes('components') && dirNames.includes('pages')) {
      return frameworks.includes('Next.js') ? 'Next.js Pages/App Router' : 'React Component-based';
    }
    if (dirNames.includes('controllers') && dirNames.includes('models') && dirNames.includes('routes')) {
      return 'MVC (Model-View-Controller)';
    }
    if (dirNames.includes('services') && dirNames.includes('handlers')) {
      return 'Service-Oriented';
    }
    if (dirNames.includes('features') || dirNames.includes('modules')) {
      return 'Feature-based / Domain-driven';
    }
    return 'Standard Layered Architecture';
  }

  /**
   * Build header
   */
  private _buildHeader(): string {
    const lines: string[] = [
      '# Project Analysis Report',
      '',
      `**Generated:** ${new Date().toISOString().split('T')[0]}`,
      `**Root:** ${this.rootPath}`,
      ''
    ];
    return lines.join('\n');
  }

  /**
   * Build footer
   */
  private _buildFooter(): string {
    const lines: string[] = [
      '---',
      '',
      `*Report generated by EZ Agents Project Reporter*`,
      `*${new Date().toISOString()}*`
    ];
    return lines.join('\n');
  }

  /**
   * Get directory purpose description
   */
  private _getDirectoryPurpose(name: string): string {
    const purposes: Record<string, string> = {
      src: 'Source code',
      app: 'Application code (Next.js App Router)',
      lib: 'Library/utility code',
      components: 'Reusable UI components',
      pages: 'Page components (Next.js Pages Router)',
      api: 'API routes',
      services: 'Business logic services',
      models: 'Data models',
      controllers: 'Request controllers',
      routes: 'Route definitions',
      utils: 'Utility functions',
      helpers: 'Helper functions',
      hooks: 'React hooks',
      stores: 'State management',
      contexts: 'React contexts',
      types: 'Type definitions',
      interfaces: 'Interface definitions',
      config: 'Configuration files',
      tests: 'Test files',
      specs: 'Specification files',
      docs: 'Documentation',
      scripts: 'Build/deployment scripts',
      bin: 'Binary/executable files',
      public: 'Public assets',
      static: 'Static assets',
      assets: 'Application assets'
    };
    return purposes[name.toLowerCase()] || 'Application code';
  }

  /**
   * Detect error handling from stack
   */
  private _detectErrorHandling(stack: Stack): boolean {
    const infra = stack?.infrastructure || [];
    return infra.some(i =>
      i.includes('Sentry') ||
      i.includes('logging') ||
      i.includes('Winston') ||
      i.includes('Pino')
    );
  }

  /**
   * Get archetype-specific recommendations
   */
  private _getArchetypeRecommendations(archetype: string): Recommendation[] {
    const recs: Record<string, Recommendation[]> = {
      dashboard: [{
        title: 'Optimize Dashboard Performance',
        issue: 'Dashboards often have heavy data visualization',
        fix: 'Implement lazy loading, memoization, and efficient chart rendering',
        effort: 'Medium'
      }],
      ecommerce: [{
        title: 'Ensure E-commerce Best Practices',
        issue: 'E-commerce requires robust payment and inventory handling',
        fix: 'Verify payment gateway integration, inventory management, and order processing',
        effort: 'High'
      }],
      SaaS: [{
        title: 'Review Multi-tenancy Implementation',
        issue: 'SaaS applications require proper tenant isolation',
        fix: 'Verify tenant scoping, data isolation, and subscription management',
        effort: 'High'
      }],
      fintech: [{
        title: 'Audit Security and Compliance',
        issue: 'Fintech applications have strict security requirements',
        fix: 'Review authentication, authorization, audit logging, and compliance measures',
        effort: 'High'
      }]
    };
    return recs[archetype] || [];
  }
}

export { ProjectReporter };

export type { Structure, Stack, TechDebt, Archetype, Module, Directory, File, Finding };
