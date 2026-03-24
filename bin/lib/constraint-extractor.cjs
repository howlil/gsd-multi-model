/**
 * Constraint Extractor — Extracts project constraints from documentation and codebase
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

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ConstraintExtractor {
  constructor(rootPath) {
    this.rootPath = rootPath;
  }

  /**
   * Extract all constraints from codebase
   * @param {string} rootPath - Root directory to analyze
   * @returns {object} Constraints object with deadlines, teamSize, budgetTier, compliance, legacyFactors, scalabilityNeeds
   */
  extract(rootPath = this.rootPath) {
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
   * @param {string} rootPath - Root directory to analyze
   * @returns {Array} Array of deadline objects with type, value, source, confidence, evidence
   */
  extractDeadlines(rootPath = this.rootPath) {
    const deadlines = [];
    const patterns = [
      { regex: /\bdeadline\b/i, type: 'explicit' },
      { regex: /\bdue\s*date\b/i, type: 'explicit' },
      { regex: /\blaunch\b/i, type: 'milestone' },
      { regex: /\brelease\b/i, type: 'milestone' },
      { regex: /\bship\b/i, type: 'milestone' },
      { regex: /\btarget\b/i, type: 'milestone' },
      { regex: /\bETA\b/i, type: 'estimate' },
      { regex: /\bQ[1-4]\b/i, type: 'quarter' },
      { regex: /\b202[6-9]\b/i, type: 'year' },
      { regex: /\b\d+\s*weeks?\b/i, type: 'duration' },
      { regex: /\b\d+\s*months?\b/i, type: 'duration' },
      { regex: /\bsprint\b/i, type: 'agile' }
    ];

    const filesToSearch = [
      'README.md',
      'docs/README.md',
      'docs/roadmap.md',
      'docs/planning.md',
      '.planning/ROADMAP.md',
      '.planning/STATE.md',
      'MILESTONES.md',
      'CHANGELOG.md',
      'package.json'
    ];

    // First check root README.md directly
    const rootReadme = path.join(rootPath, 'README.md');
    if (fs.existsSync(rootReadme)) {
      try {
        const content = fs.readFileSync(rootReadme, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          for (const { regex, type } of patterns) {
            const match = line.match(regex);
            if (match) {
              // Extract context around the match
              const start = Math.max(0, match.index - 50);
              const end = Math.min(line.length, match.index + match[0].length + 50);
              const context = line.substring(start, end).trim();

              deadlines.push({
                type: 'deadline',
                value: match[0],
                deadlineType: type,
                source: 'README.md',
                line: i + 1,
                confidence: type === 'explicit' ? 'Explicit' : 'Implicit',
                evidence: context
              });
              break; // One match per line
            }
          }
        }
      } catch (err) {
        // Ignore read errors
      }
    }

    for (const filePattern of filesToSearch) {
      // Skip README.md as we already checked it
      if (filePattern === 'README.md') continue;

      const fullPath = path.join(rootPath, filePattern);
      if (!fs.existsSync(fullPath)) continue;

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          for (const { regex, type } of patterns) {
            const match = line.match(regex);
            if (match) {
              // Extract context around the match
              const start = Math.max(0, match.index - 50);
              const end = Math.min(line.length, match.index + match[0].length + 50);
              const context = line.substring(start, end).trim();

              deadlines.push({
                type: 'deadline',
                value: match[0],
                deadlineType: type,
                source: filePattern,
                line: i + 1,
                confidence: type === 'explicit' ? 'Explicit' : 'Implicit',
                evidence: context
              });
              break; // One match per line
            }
          }
        }
      } catch (err) {
        // Ignore read errors
      }
    }

    return deadlines;
  }

  /**
   * Extract team size from various signals
   * @param {string} rootPath - Root directory to analyze
   * @returns {object} Team size object with inferred size, confidence, sources
   */
  extractTeamSize(rootPath = this.rootPath) {
    const result = {
      inferred: 1,
      confidence: 'Low',
      sources: []
    };

    // Check package.json authors
    const pkgPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.authors && Array.isArray(pkg.authors)) {
          result.inferred = pkg.authors.length;
          result.sources.push({
            source: 'package.json',
            evidence: `${pkg.authors.length} author(s) listed`
          });
        }
        if (pkg.contributors && Array.isArray(pkg.contributors)) {
          result.inferred = Math.max(result.inferred, pkg.contributors.length);
          result.sources.push({
            source: 'package.json',
            evidence: `${pkg.contributors.length} contributor(s) listed`
          });
        }
      } catch (err) {
        // Ignore parse errors
      }
    }

    // Check git history for unique authors
    try {
      const gitOutput = execSync('git log --format="%aN" | sort -u | wc -l', {
        cwd: rootPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 5000 // 5 second timeout
      });
      const gitAuthors = parseInt(gitOutput.trim(), 10);
      if (gitAuthors > 0 && gitAuthors < 50) {
        result.inferred = Math.max(result.inferred, gitAuthors);
        result.sources.push({
          source: 'git history',
          evidence: `${gitAuthors} unique git author(s)`
        });
      }
    } catch (err) {
      // Git may not be available or not a git repo
    }

    // Check README/CONTRIBUTING for team mentions
    const readmePath = path.join(rootPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      try {
        const content = fs.readFileSync(readmePath, 'utf8');
        const teamMatch = content.match(/team\s*(?:of\s*)?(\d+)/i);
        if (teamMatch) {
          result.inferred = Math.max(result.inferred, parseInt(teamMatch[1], 10));
          result.sources.push({
            source: 'README.md',
            evidence: `Team size mentioned: ${teamMatch[1]}`
          });
        }
      } catch (err) {
        // Ignore read errors
      }
    }

    // Determine confidence
    if (result.sources.length >= 3) {
      result.confidence = 'High';
    } else if (result.sources.length >= 2) {
      result.confidence = 'Medium';
    }

    return result;
  }

  /**
   * Extract budget tier from tool and hosting choices
   * @param {string} rootPath - Root directory to analyze
   * @returns {object} Budget tier object with tier, confidence, evidence
   */
  extractBudgetTier(rootPath = this.rootPath) {
    const result = {
      tier: 'startup',
      confidence: 'Low',
      evidence: []
    };

    const startupIndicators = [
      { file: 'vercel.json', name: 'Vercel' },
      { file: 'netlify.toml', name: 'Netlify' },
      { file: 'railway.toml', name: 'Railway' },
      { file: 'render.yaml', name: 'Render' },
      { file: '.fly', name: 'Fly.io' }
    ];

    const enterpriseIndicators = [
      { file: 'aws/', name: 'AWS' },
      { file: 'azure/', name: 'Azure' },
      { file: 'gcp/', name: 'Google Cloud' },
      { file: 'terraform/', name: 'Terraform' },
      { file: 'kubernetes/', name: 'Kubernetes' },
      { file: 'k8s/', name: 'Kubernetes' },
      { file: 'helm/', name: 'Helm' }
    ];

    // Check for hosting config files
    for (const indicator of startupIndicators) {
      if (fs.existsSync(path.join(rootPath, indicator.file))) {
        result.tier = 'startup';
        result.confidence = 'Medium';
        result.evidence.push({
          source: indicator.file,
          indicator: indicator.name,
          tier: 'startup'
        });
      }
    }

    for (const indicator of enterpriseIndicators) {
      if (fs.existsSync(path.join(rootPath, indicator.file))) {
        result.tier = 'enterprise';
        result.confidence = 'Medium';
        result.evidence.push({
          source: indicator.file,
          indicator: indicator.name,
          tier: 'enterprise'
        });
      }
    }

    // Check package.json for enterprise tools
    const pkgPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        const enterpriseDeps = ['@aws-sdk', 'aws-sdk', '@azure', '@google-cloud', 'kubernetes-client'];
        for (const dep of enterpriseDeps) {
          if (deps[dep] || Object.keys(deps).some(k => k.startsWith(dep))) {
            result.tier = 'enterprise';
            result.confidence = 'Medium';
            result.evidence.push({
              source: 'package.json',
              indicator: dep,
              tier: 'enterprise'
            });
          }
        }
      } catch (err) {
        // Ignore parse errors
      }
    }

    // Determine final confidence
    if (result.evidence.length >= 3) {
      result.confidence = 'High';
    }

    return result;
  }

  /**
   * Extract compliance requirements
   * @param {string} rootPath - Root directory to analyze
   * @returns {Array} Array of compliance objects with type, requirement, source, evidence
   */
  extractCompliance(rootPath = this.rootPath) {
    const compliance = [];
    const patterns = [
      { regex: /\bGDPR\b/i, type: 'data-privacy', name: 'GDPR' },
      { regex: /\bHIPAA\b/i, type: 'healthcare', name: 'HIPAA' },
      { regex: /\bSOC2\b/i, type: 'security', name: 'SOC 2' },
      { regex: /\bPCI[- ]DSS\b/i, type: 'payment', name: 'PCI DSS' },
      { regex: /\bPCI\s*DSS\b/i, type: 'payment', name: 'PCI DSS' },
      { regex: /\ba11y\b/i, type: 'accessibility', name: 'Accessibility (a11y)' },
      { regex: /\baccessibility\b/i, type: 'accessibility', name: 'Accessibility' },
      { regex: /\bWCAG\b/i, type: 'accessibility', name: 'WCAG' },
      { regex: /\bISO\s*27001\b/i, type: 'security', name: 'ISO 27001' },
      { regex: /\bSOX\b/i, type: 'financial', name: 'SOX' },
      { regex: /\bCCPA\b/i, type: 'data-privacy', name: 'CCPA' }
    ];

    const filesToSearch = [
      'README.md',
      'docs/compliance.md',
      'docs/security.md',
      'docs/privacy.md',
      'SECURITY.md',
      'PRIVACY.md',
      'LICENSE',
      'TERMS.md'
    ];

    for (const filePattern of filesToSearch) {
      const fullPath = path.join(rootPath, filePattern);
      if (!fs.existsSync(fullPath)) continue;

      try {
        const content = fs.readFileSync(fullPath, 'utf8');

        for (const { regex, type, name } of patterns) {
          const match = content.match(regex);
          if (match) {
            const start = Math.max(0, match.index - 50);
            const end = Math.min(content.length, match.index + match[0].length + 50);
            const context = content.substring(start, end).trim().replace(/\n/g, ' ');

            // Avoid duplicates
            const exists = compliance.some(c => c.requirement === name && c.source === filePattern);
            if (!exists) {
              compliance.push({
                type: 'compliance',
                requirement: name,
                complianceType: type,
                source: filePattern,
                confidence: 'Explicit',
                evidence: context
              });
            }
          }
        }
      } catch (err) {
        // Ignore read errors
      }
    }

    return compliance;
  }

  /**
   * Extract legacy system factors
   * @param {string} rootPath - Root directory to analyze
   * @returns {Array} Array of legacy factor objects with type, factor, source, severity, evidence
   */
  extractLegacyFactors(rootPath = this.rootPath) {
    const factors = [];
    const patterns = [
      { regex: /\bdeprecated\b/i, severity: 'Medium' },
      { regex: /\blegacy\b/i, severity: 'Medium' },
      { regex: /\bmigration\b/i, severity: 'High' },
      { regex: /\bupgrade\b/i, severity: 'Medium' },
      { regex: /\bold\s*version\b/i, severity: 'Medium' },
      { regex: /\bcompatibility\b/i, severity: 'Low' },
      { regex: /\bbackward\s*compat/i, severity: 'Low' },
      { regex: /\bshim\b/i, severity: 'Low' },
      { regex: /\bpolyfill\b/i, severity: 'Low' }
    ];

    // Check code comments
    const srcDirs = ['src', 'app', 'lib', 'commands'];
    for (const srcDir of srcDirs) {
      const searchPath = path.join(rootPath, srcDir);
      if (!fs.existsSync(searchPath)) continue;

      try {
        const output = execSync(
          `grep -rn "${patterns.map(p => p.regex.source).join('|')}" "${searchPath}" --include="*.ts" --include="*.tsx" --include="*.js" 2>nul`,
          { cwd: rootPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 10000 }
        );

        const lines = output.trim().split('\n');
        for (const line of lines.slice(0, 20)) {
          if (!line.trim()) continue;

          const parts = line.split(':');
          if (parts.length < 3) continue;

          const filePath = parts[0];
          const lineNum = parts[1];
          const content = parts.slice(2).join(':').trim();

          // Find which pattern matched
          let matchedPattern = null;
          let severity = 'Medium';
          for (const pattern of patterns) {
            if (pattern.regex.test(content)) {
              matchedPattern = pattern.regex.source;
              severity = pattern.severity;
              break;
            }
          }

          if (matchedPattern) {
            factors.push({
              type: 'legacy',
              factor: matchedPattern,
              source: filePath,
              line: parseInt(lineNum, 10),
              severity,
              evidence: content.substring(0, 100)
            });
          }
        }
      } catch (err) {
        // Ignore grep errors
      }
    }

    // Check package.json for old dependency versions
    const pkgPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Check for very old major versions (simplified check)
        const oldVersionPatterns = [
          { pkg: 'react', oldVersion: '<17' },
          { pkg: 'vue', oldVersion: '<3' },
          { pkg: 'angular', oldVersion: '<14' },
          { pkg: 'node', oldVersion: '<16' }
        ];

        for (const { pkg: depPkg, oldVersion } of oldVersionPatterns) {
          if (deps[depPkg]) {
            const version = deps[depPkg];
            // Simple version check
            const versionMatch = version.match(/[\d.]+/);
            if (versionMatch) {
              const majorVersion = parseInt(versionMatch[0].split('.')[0], 10);
              const threshold = parseInt(oldVersion.replace('<', ''), 10);
              if (majorVersion < threshold) {
                factors.push({
                  type: 'legacy',
                  factor: 'outdated dependency',
                  source: 'package.json',
                  severity: 'High',
                  evidence: `${depPkg}@${version} is below ${oldVersion}`
                });
              }
            }
          }
        }
      } catch (err) {
        // Ignore parse errors
      }
    }

    return factors;
  }

  /**
   * Extract scalability needs from infrastructure
   * @param {string} rootPath - Root directory to analyze
   * @returns {Array} Array of scalability need objects with type, need, source, evidence
   */
  extractScalabilityNeeds(rootPath = this.rootPath) {
    const needs = [];

    // Check package.json for scalability-related dependencies
    const pkgPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        const scalabilityIndicators = {
          'redis': { type: 'caching', need: 'Redis caching layer detected', evidence: 'redis dependency' },
          'ioredis': { type: 'caching', need: 'Redis caching layer detected', evidence: 'ioredis dependency' },
          'memcached': { type: 'caching', need: 'Memcached caching detected', evidence: 'memcached dependency' },
          'bull': { type: 'queue', need: 'Job queue system detected', evidence: 'bull dependency' },
          'rabbitmq': { type: 'queue', need: 'Message queue detected', evidence: 'rabbitmq dependency' },
          'kafka': { type: 'queue', need: 'Kafka messaging detected', evidence: 'kafka dependency' },
          'sqs': { type: 'queue', need: 'AWS SQS queue detected', evidence: 'sqs dependency' },
          'nginx': { type: 'load-balancing', need: 'Load balancing detected', evidence: 'nginx dependency' },
          'haproxy': { type: 'load-balancing', need: 'HAProxy load balancing detected', evidence: 'haproxy dependency' },
          'cluster': { type: 'clustering', need: 'Node.js clustering detected', evidence: 'cluster module usage' },
          'pm2': { type: 'clustering', need: 'PM2 process manager detected', evidence: 'pm2 dependency' },
          'docker': { type: 'containerization', need: 'Container deployment detected', evidence: 'docker dependency' },
          'kubernetes': { type: 'orchestration', need: 'Kubernetes orchestration detected', evidence: 'kubernetes dependency' }
        };

        for (const [dep, info] of Object.entries(scalabilityIndicators)) {
          if (deps[dep] || Object.keys(deps).some(k => k.includes(dep))) {
            needs.push({
              type: 'scalability',
              need: info.need,
              scalabilityType: info.type,
              source: 'package.json',
              evidence: info.evidence
            });
          }
        }
      } catch (err) {
        // Ignore parse errors
      }
    }

    // Check for scalability mentions in docs
    const docsToSearch = ['README.md', 'docs/architecture.md', 'docs/scaling.md', 'docs/infrastructure.md'];
    const scalabilityPatterns = [
      /\bscalability\b/i,
      /\bscaling\b/i,
      /\bhorizontal\s*scale/i,
      /\bvertical\s*scale/i,
      /\bload\s*balancing\b/i,
      /\bhigh\s*availability\b/i,
      /\bfault\s*tolerant\b/i
    ];

    for (const docFile of docsToSearch) {
      const fullPath = path.join(rootPath, docFile);
      if (!fs.existsSync(fullPath)) continue;

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of scalabilityPatterns) {
          const match = content.match(pattern);
          if (match) {
            const start = Math.max(0, match.index - 50);
            const end = Math.min(content.length, match.index + match[0].length + 50);
            const context = content.substring(start, end).trim().replace(/\n/g, ' ');

            needs.push({
              type: 'scalability',
              need: `Scalability requirement: ${match[0]}`,
              scalabilityType: 'requirement',
              source: docFile,
              evidence: context
            });
            break;
          }
        }
      } catch (err) {
        // Ignore read errors
      }
    }

    return needs;
  }

  /**
   * Get constraint summary
   * @param {object} constraints - Constraints from extract()
   * @returns {object} Summary object
   */
  getSummary(constraints) {
    return {
      deadlines: {
        count: constraints.deadlines?.length || 0,
        types: [...new Set(constraints.deadlines?.map(d => d.deadlineType) || [])]
      },
      teamSize: constraints.teamSize?.inferred || 1,
      budgetTier: constraints.budgetTier?.tier || 'startup',
      compliance: {
        count: constraints.compliance?.length || 0,
        requirements: constraints.compliance?.map(c => c.requirement) || []
      },
      legacyFactors: {
        count: constraints.legacyFactors?.length || 0,
        highSeverity: constraints.legacyFactors?.filter(f => f.severity === 'High').length || 0
      },
      scalabilityNeeds: {
        count: constraints.scalabilityNeeds?.length || 0,
        types: [...new Set(constraints.scalabilityNeeds?.map(s => s.scalabilityType) || [])]
      }
    };
  }
}

module.exports = { ConstraintExtractor };
