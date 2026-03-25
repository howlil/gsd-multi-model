/**
 * Framework Detector — Detailed framework detection from config files and imports
 *
 * Provides:
 * - detectFromConfig(rootPath): Analyzes config files for framework confirmation
 * - detectFromImports(sourceFiles): Analyzes import statements for framework usage
 */

import fs from 'fs';
import path from 'path';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface ConfigDetection {
  config: string;
  path: string;
  confidence: string;
}

export interface ConfigDetections {
  [framework: string]: ConfigDetection;
}

export interface ImportEvidence {
  file: string;
  pattern: string;
}

export interface ImportDetection {
  name: string;
  files: string[];
  evidence: ImportEvidence[];
}

export interface ImportDetections {
  [framework: string]: ImportDetection;
}

export interface FrameworkPattern {
  [patternName: string]: RegExp;
}

export interface FrameworkPatterns {
  [framework: string]: FrameworkPattern;
}

export interface FileMatches {
  [patternName: string]: number;
}

export interface FrameworkMatches {
  total: number;
  files: {
    [file: string]: FileMatches;
  };
  patterns: {
    [patternName: string]: number;
  };
}

export interface FrameworkResults {
  [framework: string]: FrameworkMatches;
}

export interface FrameworkInfo {
  detected: boolean;
  confidence: string;
  source: string;
  config: string | null;
  importEvidence: ImportDetection | null;
  patternEvidence: FrameworkMatches | null;
}

export interface FrameworksResult {
  [framework: string]: FrameworkInfo;
}

export interface FrameworkSummary {
  total: number;
  byConfidence: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface FrameworkAnalysisResult {
  frameworks: FrameworksResult;
  summary: FrameworkSummary;
}

// ─── FrameworkDetector Class ─────────────────────────────────────────────────

export class FrameworkDetector {
  private rootPath: string;

  /**
   * Create a FrameworkDetector instance
   * @param rootPath - Root directory to analyze
   */
  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  /**
   * Detect frameworks from config files
   * @param rootPath - Root directory to analyze
   * @returns Object with detected frameworks from configs
   */
  detectFromConfig(rootPath: string = this.rootPath): ConfigDetections {
    const configPatterns: Record<string, string[]> = {
      typescript: ['tsconfig.json'],
      vite: ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'],
      webpack: ['webpack.config.js', 'webpack.config.ts'],
      rollup: ['rollup.config.js', 'rollup.config.ts'],
      eslint: ['.eslintrc.js', '.eslintrc.json', '.eslintrc', '.eslintrc.cjs', 'eslint.config.js'],
      prettier: ['.prettierrc', '.prettierrc.js', '.prettierrc.json', 'prettier.config.js'],
      next: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
      nuxt: ['nuxt.config.js', 'nuxt.config.ts'],
      remix: ['remix.config.js'],
      prisma: ['prisma/schema.prisma'],
      jest: ['jest.config.js', 'jest.config.ts', 'jest.config.cjs'],
      vitest: ['vitest.config.js', 'vitest.config.ts'],
      cypress: ['cypress.config.js', 'cypress.config.ts'],
      playwright: ['playwright.config.js', 'playwright.config.ts'],
      tailwind: ['tailwind.config.js', 'tailwind.config.ts'],
      postcss: ['postcss.config.js', 'postcss.config.cjs'],
      babel: ['babel.config.js', '.babelrc', '.babelrc.js'],
      docker: ['Dockerfile'],
      dockerCompose: ['docker-compose.yml', 'docker-compose.yaml'],
      serverless: ['serverless.yml', 'serverless.yaml'],
      vercel: ['vercel.json'],
      netlify: ['netlify.toml'],
      heroku: ['Procfile'],
      terraform: ['main.tf', 'terraform.tfvars'],
      kubernetes: ['k8s/', 'kubernetes/', 'helm/']
    };

    const detected: ConfigDetections = {};

    for (const [framework, patterns] of Object.entries(configPatterns)) {
      for (const pattern of patterns) {
        const fullPath = path.join(rootPath, pattern);
        if (fs.existsSync(fullPath)) {
          detected[framework] = {
            config: pattern,
            path: fullPath,
            confidence: 'high'
          };
          break;
        }
        // Check for directory patterns
        if (pattern.endsWith('/')) {
          const dirPath = path.join(rootPath, pattern);
          if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
            detected[framework] = {
              config: pattern,
              path: dirPath,
              confidence: 'medium'
            };
            break;
          }
        }
      }
    }

    return detected;
  }

  /**
   * Detect frameworks from import statements in source files
   * @param sourceFiles - Array of source file paths
   * @returns Object with detected frameworks from imports
   */
  detectFromImports(sourceFiles: string[] = []): ImportDetections {
    const frameworkImports: Record<string, { patterns: string[]; name: string }> = {
      'React': {
        patterns: ['import React', 'import {', 'from \'react\'', 'from "react"'],
        name: 'React'
      },
      'Next.js': {
        patterns: ['from \'next\'', 'from "next"', 'import {', 'next/server', 'next/router'],
        name: 'Next.js'
      },
      'Vue.js': {
        patterns: ['import Vue', 'from \'vue\'', 'from "vue"', 'createApp'],
        name: 'Vue.js'
      },
      'Nuxt.js': {
        patterns: ['from \'#app\'', 'from "#app"', 'useNuxtApp', 'defineNuxtComponent'],
        name: 'Nuxt.js'
      },
      'Angular': {
        patterns: ['from \'@angular/core\'', 'from "@angular/core"', '@Component', '@Injectable'],
        name: 'Angular'
      },
      'Svelte': {
        patterns: ['from \'svelte\'', 'from "svelte"', 'import { onMount', 'import { writable'],
        name: 'Svelte'
      },
      'SolidJS': {
        patterns: ['from \'solid-js\'', 'from "solid-js"', 'createSignal', 'createEffect'],
        name: 'SolidJS'
      },
      'Express': {
        patterns: ['import express', 'from \'express\'', 'from "express"', 'require(\'express\')'],
        name: 'Express'
      },
      'Fastify': {
        patterns: ['import fastify', 'from \'fastify\'', 'from "fastify"'],
        name: 'Fastify'
      },
      'NestJS': {
        patterns: ['from \'@nestjs/core\'', 'from "@nestjs/core"', '@Module', '@Controller'],
        name: 'NestJS'
      },
      'Koa': {
        patterns: ['import Koa', 'from \'koa\'', 'from "koa"'],
        name: 'Koa'
      },
      'Remix': {
        patterns: ['from \'@remix-run\'', 'from "@remix-run"', 'useLoaderData', 'ActionFunction'],
        name: 'Remix'
      },
      'Django': {
        patterns: ['from django.', 'import django', 'django.conf'],
        name: 'Django'
      },
      'Flask': {
        patterns: ['from flask', 'import Flask', 'flask.'],
        name: 'Flask'
      },
      'FastAPI': {
        patterns: ['from fastapi', 'import FastAPI', 'FastAPI()'],
        name: 'FastAPI'
      }
    };

    const detected: ImportDetections = {};

    for (const file of sourceFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');

        for (const [key, config] of Object.entries(frameworkImports)) {
          for (const pattern of config.patterns) {
            if (content.includes(pattern)) {
              if (!detected[key]) {
                detected[key] = {
                  name: config.name,
                  files: [],
                  evidence: []
                };
              }
              if (detected[key] && !detected[key].files.includes(file)) {
                detected[key].files.push(file);
              }
              if (detected[key]) {
                detected[key].evidence.push({
                  file,
                  pattern
                });
              }
              break;
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    return detected;
  }

  /**
   * Detect framework-specific patterns in source files
   * @param sourceFiles - Array of source file paths
   * @returns Object with detected framework patterns
   */
  detectFrameworkPatterns(sourceFiles: string[] = []): FrameworkResults {
    const patterns: FrameworkPatterns = {
      'React': {
        components: /function\s+\w+Component\s*\(/,
        hooks: /use\w+\(/,
        jsx: /<\w+\s*[^>]*>/,
        context: /createContext|useContext/
      },
      'Next.js': {
        pages: /pages\//,
        api: /pages\/api\//,
        getServerSideProps: /getServerSideProps|getStaticProps|getStaticPaths/,
        image: /<Image\s/,
        link: /<Link\s/
      },
      'Vue.js': {
        component: /export\s+default\s*{/,
        template: /<template>/,
        setup: /setup\s*\(\)/,
        directives: /v-if|v-for|v-model/
      },
      'Angular': {
        decorator: /@\w+\(/,
        module: /@NgModule/,
        component: /@Component/,
        service: /@Injectable/,
        dependency: /constructor\s*\([^)]*private\s+\w+:\s+\w+/
      },
      'Express': {
        router: /express\.Router/,
        middleware: /app\.use\(|router\.use\(/,
        route: /app\.(get|post|put|delete|patch)\(/,
        request: /req\.|request\./
      },
      'NestJS': {
        module: /@Module\(/,
        controller: /@Controller\(/,
        service: /@Injectable\(/,
        guard: /@UseGuards\(/,
        interceptor: /@UseInterceptors\(/
      }
    };

    const results: FrameworkResults = {};

    for (const [framework, patternSet] of Object.entries(patterns)) {
      const matches: FrameworkMatches = {
        total: 0,
        files: {},
        patterns: {}
      };

      for (const file of sourceFiles) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const fileMatches: FileMatches = {};

          for (const [patternName, regex] of Object.entries(patternSet)) {
            const matchCount = (content.match(regex) || []).length;
            if (matchCount > 0) {
              fileMatches[patternName] = matchCount;
              matches.patterns[patternName] = (matches.patterns[patternName] || 0) + matchCount;
              matches.total += matchCount;
            }
          }

          if (Object.keys(fileMatches).length > 0) {
            matches.files[file] = fileMatches;
          }
        } catch {
          // Ignore read errors
        }
      }

      if (matches.total > 0) {
        results[framework] = matches;
      }
    }

    return results;
  }

  /**
   * Get comprehensive framework analysis
   * @param rootPath - Root directory to analyze
   * @returns Comprehensive framework analysis
   */
  analyze(rootPath: string = this.rootPath): FrameworkAnalysisResult {
    const configDetection = this.detectFromConfig(rootPath);

    // Get source files
    const sourceFiles = this.getSourceFiles(rootPath);
    const importDetection = this.detectFromImports(sourceFiles);
    const patternDetection = this.detectFrameworkPatterns(sourceFiles);

    // Merge results
    const frameworks: FrameworksResult = {};

    // Add config-based detections
    for (const [framework, config] of Object.entries(configDetection)) {
      frameworks[framework] = {
        detected: true,
        confidence: config.confidence,
        source: 'config',
        config: config.config,
        importEvidence: null,
        patternEvidence: null
      };
    }

    // Add import-based detections
    for (const [framework, evidence] of Object.entries(importDetection)) {
      const existing = frameworks[framework];
      if (existing) {
        existing.importEvidence = evidence;
        existing.confidence = 'medium';
      } else {
        frameworks[framework] = {
          detected: true,
          confidence: 'medium',
          source: 'imports',
          config: null,
          importEvidence: evidence,
          patternEvidence: null
        };
      }
    }

    // Add pattern-based detections
    for (const [framework, patterns] of Object.entries(patternDetection)) {
      const existing = frameworks[framework];
      if (existing) {
        existing.patternEvidence = patterns;
      } else {
        frameworks[framework] = {
          detected: true,
          confidence: 'low',
          source: 'patterns',
          config: null,
          importEvidence: null,
          patternEvidence: patterns
        };
      }
    }

    return {
      frameworks,
      summary: {
        total: Object.keys(frameworks).length,
        byConfidence: {
          high: Object.values(frameworks).filter(f => f.confidence === 'high').length,
          medium: Object.values(frameworks).filter(f => f.confidence === 'medium').length,
          low: Object.values(frameworks).filter(f => f.confidence === 'low').length
        }
      }
    };
  }

  /**
   * Get source files from root path
   */
  private getSourceFiles(rootPath: string): string[] {
    const files: string[] = [];
    const srcDir = path.join(rootPath, 'src');
    const appDir = path.join(rootPath, 'app');
    const libDir = path.join(rootPath, 'lib');
    const pagesDir = path.join(rootPath, 'pages');
    const componentsDir = path.join(rootPath, 'components');

    const dirsToSearch = [rootPath];
    if (fs.existsSync(srcDir)) dirsToSearch.push(srcDir);
    if (fs.existsSync(appDir)) dirsToSearch.push(appDir);
    if (fs.existsSync(libDir)) dirsToSearch.push(libDir);
    if (fs.existsSync(pagesDir)) dirsToSearch.push(pagesDir);
    if (fs.existsSync(componentsDir)) dirsToSearch.push(componentsDir);

    for (const dir of dirsToSearch) {
      this.collectSourceFiles(dir, files);
    }

    return files.slice(0, 100); // Limit to 100 files
  }

  /**
   * Collect source files from directory
   */
  private collectSourceFiles(dir: string, files: string[], depth: number = 0): void {
    if (depth > 5 || dir.includes('node_modules')) return;

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
}
