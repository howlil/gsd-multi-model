/**
 * Constraint Extractor — Analyzes project documentation and configuration for constraints
 *
 * Provides:
 * - extract(rootPath): Orchestrates all constraint extraction methods
 * - extractDeadlines(rootPath): Finds deadline mentions in docs
 * - extractTeamSize(rootPath): Infers team size from various signals
 * - extractBudgetTier(rootPath): Detects budget tier from tool/hosting choices
 * - extractCompliance(rootPath): Finds compliance requirements
 * - extractLegacyFactors(rootPath): Detects legacy system indicators
 * - extractScalabilityNeeds(rootPath): Infers scalability from infrastructure
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface DeadlineConstraint {
  type: string;
  value: string;
  deadlineType: string;
  source: string;
  confidence: string;
  evidence: string;
}

export interface TeamSizeResult {
  inferred: number;
  confidence: string;
  sources: Array<{ type: string; value?: string; count?: number }>;
}

export interface BudgetTierResult {
  tier: string;
  confidence: string;
  evidence: Array<{ type: string; file?: string; tier?: string; package?: string; indicator?: string }>;
}

export interface ComplianceConstraint {
  type: string;
  requirement: string;
  complianceType: string;
  source: string;
  confidence: string;
  evidence: string;
}

export interface LegacyFactor {
  type: string;
  factor: string;
  source: string;
  severity: string;
  evidence: string;
}

export interface ScalabilityNeed {
  type: string;
  need: string;
  technology?: string;
  source: string;
  evidence: string;
}

export interface ConstraintsResult {
  deadlines: DeadlineConstraint[];
  teamSize: TeamSizeResult;
  budgetTier: BudgetTierResult;
  compliance: ComplianceConstraint[];
  legacyFactors: LegacyFactor[];
  scalabilityNeeds: ScalabilityNeed[];
}

// ─── ConstraintExtractor Class ───────────────────────────────────────────────

export class ConstraintExtractor {
  private rootPath: string;

  /**
   * Create a ConstraintExtractor instance
   * @param rootPath - Root directory to analyze
   */
  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  /**
   * Extract all constraints from codebase
   * @param rootPath - Root directory to analyze
   * @returns Constraints object with deadlines, teamSize, budgetTier, compliance, legacyFactors, scalabilityNeeds
   */
  extract(rootPath: string = this.rootPath): ConstraintsResult {
    return {
      deadlines: this.extractDeadlines(rootPath),
      teamSize: this.extractTeamSize(rootPath),
      budgetTier: this.extractBudgetTier(rootPath),
      compliance: this.extractCompliance(rootPath),
      legacyFactors: this.extractLegacyFactors(rootPath),
      scalabilityNeeds: this.extractScalabilityNeeds(rootPath)
    };
  }

  /**
   * Extract deadline constraints from documentation
   * @param rootPath - Root directory to analyze
   * @returns Array of deadline objects with type, value, source, confidence, evidence
   */
  extractDeadlines(rootPath: string = this.rootPath): DeadlineConstraint[] {
    const deadlines: DeadlineConstraint[] = [];
    const filesToSearch = [
      'README.md',
      'docs/ROADMAP.md',
      'docs/PLANNING.md',
      '.planning/roadmap.md',
      'MILESTONES.md',
      'package.json'
    ];

    const patterns = [
      { regex: /\b(Q[1-4]\s*\d{4})\b/i, type: 'quarter' },
      { regex: /\b(202[6-9]|203[0-5])\b/g, type: 'year' },
      { regex: /\b(deadline|due\s+date|launch|release|ship|target|ETA)\s*[:\-]?\s*(.+)/gi, type: 'explicit' },
      { regex: /\b(\d+\s*(weeks?|months?))\b/i, type: 'duration' },
      { regex: /\b(sprint\s*\d+)\b/i, type: 'sprint' }
    ];

    for (const filePattern of filesToSearch) {
      const filePath = path.join(rootPath, filePattern);
      if (!fs.existsSync(filePath)) continue;

      try {
        const content = fs.readFileSync(filePath, 'utf8');

        for (const { regex, type } of patterns) {
          regex.lastIndex = 0; // Reset regex lastIndex for global patterns

          let match;
          while ((match = regex.exec(content)) !== null) {
            const value = match[1] || match[0];
            const evidence = content.substring(
              Math.max(0, match.index - 50),
              Math.min(content.length, match.index + 100)
            ).replace(/\n/g, ' ').trim();

            deadlines.push({
              type: 'deadline',
              value,
              deadlineType: type,
              source: filePath,
              confidence: type === 'explicit' ? 'Explicit' : 'Implicit',
              evidence
            });
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    // Check package.json for version-based timelines
    const pkgPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.version) {
          deadlines.push({
            type: 'deadline',
            value: `v${pkg.version}`,
            deadlineType: 'version',
            source: pkgPath,
            confidence: 'Implicit',
            evidence: `Current version: ${pkg.version}`
          });
        }
      } catch {
        // Ignore parse errors
      }
    }

    return deadlines;
  }

  /**
   * Extract team size from various signals
   * @param rootPath - Root directory to analyze
   * @returns Team size object with inferred count, confidence, sources
   */
  extractTeamSize(rootPath: string = this.rootPath): TeamSizeResult {
    const result: TeamSizeResult = {
      inferred: 1,
      confidence: 'Low',
      sources: []
    };

    // Check package.json authors
    const pkgPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.author) {
          result.sources.push({ type: 'author', value: pkg.author });
        }
        if (Array.isArray(pkg.authors) && pkg.authors.length > 0) {
          result.inferred = pkg.authors.length;
          result.sources.push({ type: 'authors', count: pkg.authors.length });
          result.confidence = 'Medium';
        }
        if (Array.isArray(pkg.contributors) && pkg.contributors.length > 0) {
          result.inferred = Math.max(result.inferred, pkg.contributors.length);
          result.sources.push({ type: 'contributors', count: pkg.contributors.length });
          result.confidence = 'Medium';
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Check git history for unique authors
    try {
      const gitOutput = execSync('git log --format="%aN" 2>nul | sort -u | wc -l', {
        cwd: rootPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      });
      const gitAuthors = parseInt(gitOutput.trim(), 10);
      if (gitAuthors > 0) {
        result.inferred = Math.max(result.inferred, gitAuthors);
        result.sources.push({ type: 'git_authors', count: gitAuthors });
        if (gitAuthors > 2) {
          result.confidence = 'Medium';
        }
      }
    } catch {
      // Git not available or not a git repo
    }

    // Check CONTRIBUTING.md for team mentions
    const contributingPath = path.join(rootPath, 'CONTRIBUTING.md');
    if (fs.existsSync(contributingPath)) {
      try {
        const content = fs.readFileSync(contributingPath, 'utf8');
        const teamMatches = content.match(/\b(team|developer|engineer|contributor|maintainer)\b/gi);
        if (teamMatches && teamMatches.length > 0) {
          result.sources.push({ type: 'contributing_mentions', count: teamMatches.length });
        }
      } catch {
        // Ignore read errors
      }
    }

    // Check README.md for team section
    const readmePath = path.join(rootPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      try {
        const content = fs.readFileSync(readmePath, 'utf8');
        if (content.includes('## Team') || content.includes('## Contributors') || content.includes('## Maintainers')) {
          result.sources.push({ type: 'readme_team_section', value: true });
        }
      } catch {
        // Ignore read errors
      }
    }

    return result;
  }

  /**
   * Extract budget tier from hosting and tool choices
   * @param rootPath - Root directory to analyze
   * @returns Budget tier object with tier, confidence, evidence
   */
  extractBudgetTier(rootPath: string = this.rootPath): BudgetTierResult {
    const result: BudgetTierResult = {
      tier: 'startup',
      confidence: 'Low',
      evidence: []
    };

    // Check for hosting config files
    const hostingPatterns: Record<string, string[]> = {
      startup: ['vercel.json', 'netlify.toml', '.platform', 'railway.toml', 'render.yaml'],
      enterprise: ['app.yaml', 'terraform/', 'kubernetes/', 'helm/', '.terraform/']
    };

    // Check for startup hosting
    for (const file of hostingPatterns.startup) {
      const filePath = path.join(rootPath, file);
      if (fs.existsSync(filePath)) {
        result.tier = 'startup';
        result.confidence = 'Medium';
        result.evidence.push({ type: 'hosting', file, tier: 'startup' });
        break;
      }
    }

    // Check for enterprise hosting (overrides startup)
    for (const file of hostingPatterns.enterprise) {
      const filePath = path.join(rootPath, file);
      if (fs.existsSync(filePath)) {
        result.tier = 'enterprise';
        result.confidence = 'High';
        result.evidence.push({ type: 'hosting', file, tier: 'enterprise' });
        break;
      }
    }

    // Check package.json for paid services
    const pkgPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Enterprise indicators
        const enterpriseDeps = ['@aws-sdk', 'aws-sdk', '@azure', '@google-cloud', 'newrelic', 'datadog-metrics', 'splunk'];
        for (const dep of enterpriseDeps) {
          if (Object.keys(allDeps).some(k => k.includes(dep))) {
            result.tier = 'enterprise';
            result.confidence = 'Medium';
            result.evidence.push({ type: 'dependency', package: dep, tier: 'enterprise' });
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Check for CI/CD config
    const ciPatterns: Record<string, string[]> = {
      startup: ['.github/workflows/', '.gitlab-ci.yml'],
      enterprise: ['.circleci/', 'bitbucket-pipelines.yml', 'azure-pipelines.yml']
    };

    for (const file of ciPatterns.enterprise) {
      const filePath = path.join(rootPath, file);
      if (fs.existsSync(filePath)) {
        result.confidence = 'Medium';
        result.evidence.push({ type: 'ci_cd', file, indicator: 'enterprise' });
      }
    }

    return result;
  }

  /**
   * Extract compliance requirements from documentation
   * @param rootPath - Root directory to analyze
   * @returns Array of compliance objects with type, requirement, source, evidence
   */
  extractCompliance(rootPath: string = this.rootPath): ComplianceConstraint[] {
    const compliance: ComplianceConstraint[] = [];
    const patterns = [
      { regex: /\bGDPR\b/i, requirement: 'GDPR', type: 'data_privacy' },
      { regex: /\bHIPAA\b/i, requirement: 'HIPAA', type: 'healthcare' },
      { regex: /\bSOC2\b/i, requirement: 'SOC2', type: 'security' },
      { regex: /\bPCI[- ]DSS\b/i, requirement: 'PCI-DSS', type: 'payment' },
      { regex: /\b(a11y|accessibility|WCAG)\b/i, requirement: 'Accessibility (WCAG)', type: 'accessibility' },
      { regex: /\bISO\s*27001\b/i, requirement: 'ISO 27001', type: 'security' },
      { regex: /\bSOX\b/i, requirement: 'SOX', type: 'financial' },
      { regex: /\bCCPA\b/i, requirement: 'CCPA', type: 'data_privacy' }
    ];

    const filesToSearch = [
      'README.md',
      'docs/COMPLIANCE.md',
      'docs/SECURITY.md',
      'SECURITY.md',
      'LICENSE',
      'TERMS.md',
      'PRIVACY.md'
    ];

    for (const filePattern of filesToSearch) {
      const filePath = path.join(rootPath, filePattern);
      if (!fs.existsSync(filePath)) continue;

      try {
        const content = fs.readFileSync(filePath, 'utf8');

        for (const { regex, requirement, type } of patterns) {
          if (regex.test(content)) {
            const match = content.match(regex);
            if (match) {
              compliance.push({
                type: 'compliance',
                requirement,
                complianceType: type,
                source: filePath,
                confidence: 'Explicit',
                evidence: content.substring(
                  Math.max(0, match.index - 50),
                  Math.min(content.length, match.index + 100)
                ).replace(/\n/g, ' ').trim()
              });
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    return compliance;
  }

  /**
   * Extract legacy system factors
   * @param rootPath - Root directory to analyze
   * @returns Array of legacy factor objects with type, factor, source, severity, evidence
   */
  extractLegacyFactors(rootPath: string = this.rootPath): LegacyFactor[] {
    const factors: LegacyFactor[] = [];
    const patterns = [
      { regex: /\b(deprecated|legacy|migration|upgrade|old\s+version|compatibility)\b/i, severity: 'Medium' },
      { regex: /\b(backward\s*compat|BC\s*break)\b/i, severity: 'High' }
    ];

    const filesToSearch = [
      'README.md',
      'CHANGELOG.md',
      'docs/MIGRATION.md',
      'docs/UPGRADE.md',
      'package.json'
    ];

    for (const filePattern of filesToSearch) {
      const filePath = path.join(rootPath, filePattern);
      if (!fs.existsSync(filePath)) continue;

      try {
        const content = fs.readFileSync(filePath, 'utf8');

        for (const { regex, severity } of patterns) {
          const match = content.match(regex);
          if (match) {
            factors.push({
              type: 'legacy',
              factor: match[0],
              source: filePath,
              severity,
              evidence: content.substring(
                Math.max(0, match.index - 50),
                Math.min(content.length, match.index + 100)
              ).replace(/\n/g, ' ').trim()
            });
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    // Check for old dependency versions in package.json
    const pkgPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

        for (const [name, version] of Object.entries(allDeps)) {
          // Check for very old version patterns (0.x or 1.x for major packages)
          if (version.match(/^[\^~]?[01]\./)) {
            factors.push({
              type: 'legacy',
              factor: `Outdated dependency: ${name}@${version}`,
              source: pkgPath,
              severity: 'Low',
              evidence: `"${name}": "${version}"`
            });
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    return factors;
  }

  /**
   * Extract scalability needs from infrastructure
   * @param rootPath - Root directory to analyze
   * @returns Array of scalability need objects with type, need, source, evidence
   */
  extractScalabilityNeeds(rootPath: string = this.rootPath): ScalabilityNeed[] {
    const needs: ScalabilityNeed[] = [];
    const pkgPath = path.join(rootPath, 'package.json');

    // Check package.json for scalability indicators
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Caching indicators
        const cachingDeps = ['redis', 'ioredis', 'memcached', 'node-cache', 'lru-cache'];
        for (const dep of cachingDeps) {
          if (Object.keys(allDeps).some(k => k.includes(dep))) {
            needs.push({
              type: 'scalability',
              need: 'Caching layer',
              technology: dep,
              source: pkgPath,
              evidence: `Dependency: ${dep}`
            });
          }
        }

        // Queue system indicators
        const queueDeps = ['bull', 'bullmq', 'rabbitmq', 'kafka-node', 'sqs-consumer', 'sidekiq', 'celery'];
        for (const dep of queueDeps) {
          if (Object.keys(allDeps).some(k => k.includes(dep))) {
            needs.push({
              type: 'scalability',
              need: 'Message queue / Job processing',
              technology: dep,
              source: pkgPath,
              evidence: `Dependency: ${dep}`
            });
          }
        }

        // Load balancing / clustering indicators
        const clusterDeps = ['cluster', 'pm2', 'node-cluster', 'nginx', 'haproxy'];
        for (const dep of clusterDeps) {
          if (Object.keys(allDeps).some(k => k.includes(dep))) {
            needs.push({
              type: 'scalability',
              need: 'Clustering / Load balancing',
              technology: dep,
              source: pkgPath,
              evidence: `Dependency: ${dep}`
            });
          }
        }

        // Database scaling indicators
        const dbScalingDeps = ['pg-promise', 'pg-pool', 'typeorm', 'prisma', 'mongoose'];
        for (const dep of dbScalingDeps) {
          if (Object.keys(allDeps).some(k => k.includes(dep))) {
            needs.push({
              type: 'scalability',
              need: 'Database connection pooling',
              technology: dep,
              source: pkgPath,
              evidence: `Dependency: ${dep}`
            });
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Check for kubernetes/docker configs
    const k8sPath = path.join(rootPath, 'kubernetes');
    const dockerPath = path.join(rootPath, 'Dockerfile');
    const dockerComposePath = path.join(rootPath, 'docker-compose.yml');

    if (fs.existsSync(k8sPath)) {
      needs.push({
        type: 'scalability',
        need: 'Kubernetes orchestration',
        source: k8sPath,
        evidence: 'Kubernetes configuration directory exists'
      });
    }

    if (fs.existsSync(dockerPath)) {
      needs.push({
        type: 'scalability',
        need: 'Container deployment',
        source: dockerPath,
        evidence: 'Dockerfile exists'
      });
    }

    if (fs.existsSync(dockerComposePath)) {
      needs.push({
        type: 'scalability',
        need: 'Multi-service deployment',
        source: dockerComposePath,
        evidence: 'docker-compose.yml exists'
      });
    }

    return needs;
  }
}
