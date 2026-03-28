
/**
 * Skill Registry — Core module for loading, indexing, and searching skills
 *
 * Provides file-based skill registry with:
 * - Load skills from global and local directories
 * - Get skill by name
 * - Filter by tag, category, or stack
 * - Search across name, description, and tags
 * - Lazy loading with cache (LazySkillRegistry subclass)
 *
 * Usage:
 *   import { SkillRegistry, LazySkillRegistry } from './skill/index.js';
 *   const registry = new SkillRegistry();
 *   await registry.load();
 *   const skill = registry.get('laravel_11_structure_skill_v2');
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { extractFrontmatter } from '../planning/index.js';
import { defaultLogger as logger } from '../logger/index.js';

/**
 * Skill interface defining the structure of a skill
 */
export interface Skill {
  name: string;
  description: string;
  version: string;
  tags: string[];
  stack?: string;
  category?: string;
  triggers?: SkillTriggers;
  prerequisites: string[];
  recommended_structure?: SkillStructure;
  workflow?: Record<string, string[]>;
  best_practices: string[];
  anti_patterns: string[];
  scaling_notes?: string;
  when_not_to_use?: string;
  output_template?: string;
  dependencies?: string[];
  scope: 'global' | 'local';
  path: string;
  body: string;
  execute?: (context: SkillContext) => Promise<SkillResult>;
  parameters?: SkillParameter[];
}

/**
 * Skill triggers configuration
 */
export interface SkillTriggers {
  keywords?: string[];
  filePatterns?: string[];
  commands?: string[];
  stack?: string;
  projectArchetypes?: string[];
  modes?: string[];
}

/**
 * Skill structure configuration
 */
export interface SkillStructure {
  directories?: string[];
  files?: string[];
}

/**
 * Skill parameter definition
 */
export interface SkillParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

/**
 * Skill context for execution
 */
export interface SkillContext {
  taskDescription?: string;
  codebaseFiles?: string[];
  executedCommands?: string[];
  stack?: string | { language: string; framework: string; version?: string };
  projectType?: string;
  mode?: string;
  [key: string]: unknown;
}

/**
 * Skill execution result
 */
export interface SkillResult {
  success: boolean;
  output?: string;
  error?: string;
}

/**
 * Skill Registry class for managing skills
 */
export class SkillRegistry {
  protected globalSkillsPath: string;
  protected localSkillsPath: string;
  protected skills: Map<string, Skill>;
  protected loaded: boolean;
  protected logger: typeof logger;

  /**
   * Create a SkillRegistry instance
   * @param options - Registry options
   * @param options.globalPath - Global skills directory (default: $HOME/.skills/ez-agents/ or EZ_AGENTS_SKILLS_PATH)
   * @param options.localPath - Local project skills directory (default: .planning/skills)
   */
  constructor(options: { globalPath?: string; localPath?: string } = {}) {
    // Default global skills path: $HOME/.skills/ez-agents/ or EZ_AGENTS_SKILLS_PATH env var
    const homeDir = os.homedir();
    const defaultGlobalPath = process.env.EZ_AGENTS_SKILLS_PATH || path.join(homeDir, '.skills', 'ez-agents');

    this.globalSkillsPath =
      options.globalPath || defaultGlobalPath;
    this.localSkillsPath = options.localPath || '.planning/skills';
    this.skills = new Map();
    this.loaded = false;
    this.logger = logger;
  }

  /**
   * Load skills from global and local directories
   * @returns Promise resolving to this for chaining
   */
  async load(): Promise<SkillRegistry> {
    // Load global skills
    await this._loadFromPath(this.globalSkillsPath, 'global');

    // Load local project skills (override global)
    if (fs.existsSync(this.localSkillsPath)) {
      await this._loadFromPath(this.localSkillsPath, 'local');
    }

    this.loaded = true;
    this.logger.info('Skill registry loaded', {
      skillCount: this.skills.size,
      globalPath: this.globalSkillsPath,
      localPath: this.localSkillsPath
    });

    return this;
  }

  /**
   * Load skills from a specific path
   * @param basePath - Base directory to scan
   * @param scope - Scope identifier ('global' or 'local')
   * @private
   */
  protected _loadFromPath(basePath: string, scope: 'global' | 'local'): void {
    if (!fs.existsSync(basePath)) {
      this.logger.debug('Skills path does not exist', { basePath });
      return;
    }

    // Read category directories (including new categories: testing, observability)
    const categories = [
      'stack',
      'architecture',
      'domain',
      'operational',
      'governance',
      'testing',
      'observability'
    ];

    for (const category of categories) {
      const categoryPath = path.join(basePath, category);
      if (!fs.existsSync(categoryPath)) continue;

      // Use recursive function to find all SKILL.md files (supports unlimited nesting)
      const skillFiles = this._findSkillFiles(categoryPath, 0, 5);

      for (const skillFile of skillFiles) {
        try {
          const content = fs.readFileSync(skillFile, 'utf8');
          const skill = this._parseSkill(skillFile, content, scope);
          this.skills.set(skill.name, skill);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          this.logger.error('Failed to load skill', {
            skillFile,
            error: errorMessage
          });
        }
      }
    }
  }

  /**
   * Recursively find all SKILL.md files in a directory
   * @param dirPath - Directory to search
   * @param depth - Current recursion depth
   * @param maxDepth - Maximum recursion depth
   * @returns Array of SKILL.md file paths
   * @private
   */
  protected _findSkillFiles(
    dirPath: string,
    depth: number = 0,
    maxDepth: number = 5
  ): string[] {
    const results: string[] = [];

    if (depth > maxDepth) return results;

    let items: fs.Dirent[];
    try {
      items = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.debug('Cannot read directory', {
        dirPath,
        error: errorMessage
      });
      return results;
    }

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isFile() && item.name === 'SKILL.md') {
        results.push(fullPath);
      } else if (item.isDirectory()) {
        const nested = this._findSkillFiles(fullPath, depth + 1, maxDepth);
        results.push(...nested);
      }
    }

    return results;
  }

  /**
   * Parse skill metadata from SKILL.md content
   * @param filePath - Path to SKILL.md file
   * @param content - File content
   * @param scope - Scope identifier
   * @returns Parsed skill object
   * @private
   */
  protected _parseSkill(
    filePath: string,
    content: string,
    scope: 'global' | 'local'
  ): Skill {
    const frontmatter = extractFrontmatter(content);
    const body = content.replace(/^---\n[\s\S]+?\n---\n?/, '');

    const skill: Skill = {
      name: frontmatter.name as string || '',
      description: frontmatter.description as string || '',
      version: (frontmatter.version as string) || '1.0.0',
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags as string[] : [],
      prerequisites: Array.isArray(frontmatter.prerequisites) ? frontmatter.prerequisites as string[] : [],
      best_practices: Array.isArray(frontmatter.best_practices) ? frontmatter.best_practices as string[] : [],
      anti_patterns: Array.isArray(frontmatter.anti_patterns) ? frontmatter.anti_patterns as string[] : [],
      scope,
      path: filePath,
      body
    };

    // Add optional properties only if they have values
    if (frontmatter.stack) skill.stack = frontmatter.stack as string;
    if (frontmatter.category) skill.category = frontmatter.category as string;
    if (frontmatter.triggers) skill.triggers = frontmatter.triggers as SkillTriggers;
    if (frontmatter.recommended_structure) skill.recommended_structure = frontmatter.recommended_structure as SkillStructure;
    if (frontmatter.workflow) skill.workflow = frontmatter.workflow as Record<string, string[]>;
    if (frontmatter.scaling_notes) skill.scaling_notes = frontmatter.scaling_notes as string;
    if (frontmatter.when_not_to_use) skill.when_not_to_use = frontmatter.when_not_to_use as string;
    if (frontmatter.output_template) skill.output_template = frontmatter.output_template as string;
    if (frontmatter.dependencies && Array.isArray(frontmatter.dependencies)) skill.dependencies = frontmatter.dependencies as string[];

    return skill;
  }

  /**
   * Get a skill by name
   * @param name - Skill name
   * @returns Skill object or undefined
   */
  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * Get all skills
   * @returns Array of all skill objects
   */
  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Find skills by tag
   * @param tag - Tag to filter by
   * @returns Array of matching skills
   */
  findByTag(tag: string): Skill[] {
    return this.getAll().filter(s => s.tags?.includes(tag));
  }

  /**
   * Find skills by category
   * @param category - Category to filter by
   * @returns Array of matching skills
   */
  findByCategory(category: string): Skill[] {
    return this.getAll().filter(s => s.category === category);
  }

  /**
   * Find skills by stack identifier
   * @param stack - Stack identifier (string or object with language/framework)
   * @returns Array of matching skills
   */
  findByStack(
    stack: string | { language: string; framework: string }
  ): Skill[] {
    return this.getAll().filter(s => {
      if (!s.stack) return false;

      if (typeof stack === 'string') {
        return s.stack === stack;
      }

      if (typeof stack === 'object') {
        // Support object format: { language: 'php', framework: 'laravel' }
        const stackStr = `${stack.language}/${stack.framework}`;
        return s.stack.includes(stackStr);
      }

      return false;
    });
  }

  /**
   * Search skills by keyword
   * @param query - Search query
   * @returns Array of matching skills
   */
  search(query: string): Skill[] {
    const q = query.toLowerCase();
    return this.getAll().filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  /**
   * Clear all loaded skills
   */
  clear(): void {
    this.skills.clear();
    this.loaded = false;
  }
}

/**
 * Lazy Skill Registry with caching
 * Extends SkillRegistry with TTL-based caching for better performance
 */
export class LazySkillRegistry extends SkillRegistry {
  private cache: Map<string, unknown>;
  private cacheTTL: number;
  private cacheTimestamps: Map<string, number>;

  /**
   * Create a LazySkillRegistry instance
   * @param options - Registry options
   * @param options.cacheTTL - Cache TTL in milliseconds (default: 5 minutes)
   */
  constructor(options: { globalPath?: string; localPath?: string; cacheTTL?: number } = {}) {
    super(options);
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 5 * 60 * 1000; // 5 minutes
    this.cacheTimestamps = new Map();
  }

  /**
   * Get a skill by name with caching
   * @param name - Skill name
   * @returns Skill object or undefined
   */
  override get(name: string): Skill | undefined {
    // Check cache first
    const cached = this._getFromCache<Skill>(name);
    if (cached) {
      return cached;
    }

    // Load from parent if not in cache
    const skill = super.get(name);
    if (skill) {
      this._setInCache(name, skill);
    }

    return skill;
  }

  /**
   * Get all skills with caching
   * @returns Array of all skill objects
   */
  override getAll(): Skill[] {
    const cached = this._getFromCache<Skill[]>('__all__');
    if (cached) {
      return cached;
    }

    const skills = super.getAll();
    this._setInCache('__all__', skills);
    return skills;
  }

  /**
   * Get item from cache with TTL check
   * @param key - Cache key
   * @returns Cached value or null if expired/missing
   * @private
   */
  private _getFromCache<T>(key: string): T | null {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) return null;

    const age = Date.now() - timestamp;
    if (age > this.cacheTTL) {
      // Cache expired
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      return null;
    }

    return this.cache.get(key) as T;
  }

  /**
   * Set item in cache with timestamp
   * @param key - Cache key
   * @param value - Value to cache
   * @private
   */
  private _setInCache(key: string, value: unknown): void {
    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Clear all skills and cache
   */
  override clear(): void {
    super.clear();
    this.clearCache();
  }
}
