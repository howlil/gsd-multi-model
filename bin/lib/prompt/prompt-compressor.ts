/**
 * Prompt Compressor — Token-efficient prompt compression
 *
 * COMP-01: Prompt compression
 * COMP-02: Template optimization
 *
 * Features:
 * - Systematic prompt compression
 * - Template variable optimization
 * - Redundancy removal
 * - Token counting integration
 *
 * Target Metrics:
 * - Prompt size reduction: 40-50%
 * - Token savings: 30-40%
 * - Quality preservation: 90%+
 */

import { createHash } from 'crypto';

/**
 * Compression result with detailed metrics
 */
export interface PromptCompressionResult {
  /** Compressed prompt */
  compressed: string;
  /** Original token count */
  originalTokens: number;
  /** Compressed token count */
  compressedTokens: number;
  /** Token savings */
  tokensSaved: number;
  /** Compression ratio */
  compressionRatio: number;
  /** Applied optimizations */
  optimizations: string[];
  /** Quality score estimate */
  qualityScore: number;
}

/**
 * Prompt template with variables
 */
export interface PromptTemplate {
  /** Template name */
  name: string;
  /** Template string with {{variable}} placeholders */
  template: string;
  /** Default variables */
  defaults: Record<string, string>;
  /** Required variables */
  required: string[];
}

/**
 * Prompt Compressor class
 *
 * Implements systematic prompt compression:
 * - Whitespace normalization
 * - Redundant phrase removal
 * - Template variable optimization
 * - Token-efficient formatting
 */
export class PromptCompressor {
  private readonly templates: Map<string, PromptTemplate>;
  private readonly stats: {
    promptsProcessed: number;
    totalTokensSaved: number;
    averageCompressionRatio: number;
  };

  // Common redundant phrases that can be shortened
  private readonly redundantPhrases: Array<{ pattern: RegExp; replacement: string }> = [
    { pattern: /please make sure to/gi, replacement: 'ensure' },
    { pattern: /it is important to/gi, replacement: 'must' },
    { pattern: /you should/gi, replacement: '' },
    { pattern: /I want you to/gi, replacement: '' },
    { pattern: /could you please/gi, replacement: '' },
    { pattern: /would you mind/gi, replacement: '' },
    { pattern: /in order to/gi, replacement: 'to' },
    { pattern: /due to the fact that/gi, replacement: 'because' },
    { pattern: /at this point in time/gi, replacement: 'now' },
    { pattern: /in the event that/gi, replacement: 'if' },
    { pattern: /for the purpose of/gi, replacement: 'for' },
    { pattern: /with regard to/gi, replacement: 'about' },
    { pattern: /in relation to/gi, replacement: 'about' },
    { pattern: /subsequently/gi, replacement: 'then' },
    { pattern: /furthermore/gi, replacement: 'also' },
    { pattern: /however/gi, replacement: 'but' },
    { pattern: /therefore/gi, replacement: 'so' },
    { pattern: /additionally/gi, replacement: 'also' },
    { pattern: /consequently/gi, replacement: 'so' },
    { pattern: /nevertheless/gi, replacement: 'but' }
  ];

  constructor() {
    this.templates = new Map();
    this.stats = {
      promptsProcessed: 0,
      totalTokensSaved: 0,
      averageCompressionRatio: 0
    };
  }

  /**
   * Register a prompt template
   * @param template - Prompt template to register
   */
  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Get a registered template
   * @param name - Template name
   * @returns Template or undefined
   */
  getTemplate(name: string): PromptTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Compress a prompt using all optimizations
   * @param prompt - Prompt to compress
   * @param options - Compression options
   * @returns Compression result
   */
  compress(prompt: string, options: {
    /** Remove redundant phrases (default: true) */
    removeRedundancy?: boolean;
    /** Normalize whitespace (default: true) */
    normalizeWhitespace?: boolean;
    /** Optimize formatting (default: true) */
    optimizeFormatting?: boolean;
    /** Target compression ratio (0-1) */
    targetRatio?: number;
  } = {}): PromptCompressionResult {
    const optimizations: string[] = [];
    let compressed = prompt;
    
    const originalTokens = this.estimateTokens(prompt);

    // Step 1: Remove redundant phrases
    if (options.removeRedundancy !== false) {
      const before = compressed;
      compressed = this.removeRedundancy(compressed);
      if (compressed !== before) {
        optimizations.push('redundancy_removal');
      }
    }

    // Step 2: Normalize whitespace
    if (options.normalizeWhitespace !== false) {
      const before = compressed;
      compressed = this.normalizeWhitespace(compressed);
      if (compressed !== before) {
        optimizations.push('whitespace_normalization');
      }
    }

    // Step 3: Optimize formatting
    if (options.optimizeFormatting !== false) {
      const before = compressed;
      compressed = this.optimizeFormatting(compressed);
      if (compressed !== before) {
        optimizations.push('formatting_optimization');
      }
    }

    // Step 4: Aggressive compression if target ratio specified
    if (options.targetRatio !== undefined) {
      const currentRatio = this.estimateTokens(compressed) / originalTokens;
      if (currentRatio > options.targetRatio) {
        compressed = this.aggressiveCompress(compressed, options.targetRatio);
        optimizations.push('aggressive_compression');
      }
    }

    const compressedTokens = this.estimateTokens(compressed);
    const tokensSaved = originalTokens - compressedTokens;
    const compressionRatio = originalTokens > 0 ? compressedTokens / originalTokens : 1;

    // Update stats
    this.stats.promptsProcessed++;
    this.stats.totalTokensSaved += tokensSaved;
    this.stats.averageCompressionRatio = 
      (this.stats.averageCompressionRatio * (this.stats.promptsProcessed - 1) + compressionRatio) / 
      this.stats.promptsProcessed;

    return {
      compressed,
      originalTokens,
      compressedTokens,
      tokensSaved,
      compressionRatio,
      optimizations,
      qualityScore: this.estimateQuality(prompt, compressed)
    };
  }

  /**
   * Render a template with variables
   * @param templateName - Template name
   * @param variables - Variable values
   * @returns Rendered prompt
   */
  renderTemplate(templateName: string, variables: Record<string, string>): string {
    const template = this.templates.get(templateName);
    
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Check required variables
    for (const required of template.required) {
      if (!(required in variables)) {
        throw new Error(`Missing required variable: ${required}`);
      }
    }

    // Merge with defaults
    const allVars = { ...template.defaults, ...variables };

    // Replace {{variable}} placeholders
    let rendered = template.template;
    for (const [key, value] of Object.entries(allVars)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return rendered;
  }

  /**
   * Compress and render template in one step
   * @param templateName - Template name
   * @param variables - Variable values
   * @param compressOptions - Compression options
   * @returns Compression result with rendered prompt
   */
  compressTemplate(
    templateName: string,
    variables: Record<string, string>,
    compressOptions?: Parameters<typeof this.compress>[1]
  ): PromptCompressionResult & { rendered: string } {
    const rendered = this.renderTemplate(templateName, variables);
    const result = this.compress(rendered, compressOptions);
    
    return {
      ...result,
      rendered
    };
  }

  /**
   * Remove redundant phrases from prompt
   * @param prompt - Prompt to process
   * @returns Prompt with redundancies removed
   */
  private removeRedundancy(prompt: string): string {
    let result = prompt;
    
    for (const { pattern, replacement } of this.redundantPhrases) {
      result = result.replace(pattern, replacement);
    }
    
    return result;
  }

  /**
   * Normalize whitespace
   * @param prompt - Prompt to process
   * @returns Prompt with normalized whitespace
   */
  private normalizeWhitespace(prompt: string): string {
    return prompt
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\t/g, '  ')             // Tabs to spaces
      .replace(/[ \t]+$/gm, '')         // Remove trailing spaces
      .replace(/\n{3,}/g, '\n\n')       // Max 2 consecutive newlines
      .trim();
  }

  /**
   * Optimize formatting for token efficiency
   * @param prompt - Prompt to process
   * @returns Prompt with optimized formatting
   */
  private optimizeFormatting(prompt: string): string {
    let result = prompt;
    
    // Replace bullet points with dashes (shorter)
    result = result.replace(/^[ \t]*[-•*]\s+/gm, '- ');
    
    // Replace numbered lists with bullets (when order doesn't matter)
    result = result.replace(/^[ \t]*\d+\.\s+/gm, '- ');
    
    // Remove unnecessary quotes around single words
    result = result.replace(/"(\w+)"/g, '$1');
    
    // Shorten common technical terms
    const termShorteners: Record<string, string> = {
      'configuration': 'config',
      'environment': 'env',
      'development': 'dev',
      'production': 'prod',
      'authentication': 'auth',
      'authorization': 'authz',
      'parameter': 'param',
      'argument': 'arg',
      'function': 'fn',
      'javascript': 'JS',
      'typescript': 'TS',
      'interface': 'iface',
      'implementation': 'impl',
      'specification': 'spec',
      'documentation': 'docs',
      'application': 'app',
      'directory': 'dir',
      'package': 'pkg',
      'module': 'mod',
      'component': 'comp',
      'variable': 'var',
      'constant': 'const',
      'constructor': 'ctor',
      'asynchronous': 'async',
      'synchronous': 'sync',
      'request': 'req',
      'response': 'res',
      'error': 'err',
      'message': 'msg',
      'number': 'num',
      'string': 'str',
      'boolean': 'bool',
      'object': 'obj',
      'array': 'arr',
      'property': 'prop',
      'attribute': 'attr',
      'element': 'el',
      'document': 'doc',
      'window': 'win',
      'database': 'db',
      'server': 'srv',
      'client': 'cli',
      'service': 'svc',
      'utility': 'util',
      'helper': 'hlp',
      'manager': 'mgr',
      'controller': 'ctrl',
      'handler': 'hdlr',
      'listener': 'lstn',
      'observer': 'obs',
      'subscriber': 'sub',
      'publisher': 'pub',
      'provider': 'prov',
      'consumer': 'cons',
      'producer': 'prod',
      'generator': 'gen',
      'builder': 'bldr',
      'factory': 'fctry',
      'strategy': 'strat',
      'adapter': 'adpt',
      'decorator': 'deco',
      'facade': 'fcde',
      'proxy': 'prox',
      'command': 'cmd',
      'query': 'qry',
      'result': 'res',
      'success': 'ok',
      'failure': 'fail',
      'pending': 'pend',
      'complete': 'done',
      'initialize': 'init',
      'execute': 'exec',
      'process': 'proc',
      'validate': 'valid',
      'check': 'chk',
      'verify': 'vrfy',
      'update': 'upd',
      'create': 'cre',
      'delete': 'del',
      'remove': 'rm',
      'add': 'add',
      'get': 'get',
      'set': 'set',
      'has': 'has',
      'is': 'is',
      'are': 'are',
      'was': 'was',
      'were': 'were',
      'been': 'been',
      'being': 'being',
      'have': 'have',
      'has': 'has',
      'had': 'had',
      'do': 'do',
      'does': 'does',
      'did': 'did',
      'will': 'will',
      'would': 'would',
      'could': 'could',
      'should': 'should',
      'may': 'may',
      'might': 'might',
      'must': 'must',
      'can': 'can',
      'need': 'need',
      'want': 'want',
      'like': 'like',
      'love': 'love',
      'hate': 'hate',
      'know': 'know',
      'think': 'think',
      'see': 'see',
      'hear': 'hear',
      'feel': 'feel',
      'look': 'look',
      'watch': 'watch',
      'listen': 'listen',
      'speak': 'speak',
      'talk': 'talk',
      'say': 'say',
      'tell': 'tell',
      'ask': 'ask',
      'answer': 'answer',
      'question': 'question',
      'problem': 'problem',
      'solution': 'solution',
      'issue': 'issue',
      'bug': 'bug',
      'feature': 'feature',
      'requirement': 'requirement',
      'task': 'task',
      'job': 'job',
      'work': 'work',
      'project': 'project',
      'team': 'team',
      'member': 'member',
      'leader': 'leader',
      'manager': 'manager',
      'director': 'director',
      'executive': 'executive',
      'officer': 'officer',
      'president': 'president',
      'ceo': 'ceo',
      'cto': 'cto',
      'cfo': 'cfo',
      'coo': 'coo',
      'vp': 'vp',
      'svp': 'svp',
      'evp': 'evp',
      'avp': 'avp',
      'sr': 'sr',
      'jr': 'jr',
      'ii': 'ii',
      'iii': 'iii',
      'iv': 'iv',
      'v': 'v',
      'vi': 'vi',
      'vii': 'vii',
      'viii': 'viii',
      'ix': 'ix',
      'x': 'x'
    };
    
    for (const [full, short] of Object.entries(termShorteners)) {
      // Only replace if the shortened version saves tokens
      if (full.length > short.length + 2) {
        const regex = new RegExp(`\\b${full}\\b`, 'gi');
        result = result.replace(regex, short);
      }
    }
    
    return result;
  }

  /**
   * Aggressive compression for target ratio
   * @param prompt - Prompt to compress
   * @param targetRatio - Target compression ratio
   * @returns Aggressively compressed prompt
   */
  private aggressiveCompress(prompt: string, targetRatio: number): string {
    const originalTokens = this.estimateTokens(prompt);
    const targetTokens = Math.floor(originalTokens * targetRatio);
    
    // Remove examples first (least critical)
    let compressed = this.removeExamples(prompt);
    
    if (this.estimateTokens(compressed) > targetTokens) {
      // Remove optional sections
      compressed = this.removeOptionalSections(compressed);
    }
    
    if (this.estimateTokens(compressed) > targetTokens) {
      // Truncate while preserving structure
      compressed = this.truncatePreservingStructure(compressed, targetTokens);
    }
    
    return compressed;
  }

  /**
   * Remove examples from prompt
   * @param prompt - Prompt to process
   * @returns Prompt without examples
   */
  private removeExamples(prompt: string): string {
    return prompt
      .replace(/For example[^.]*\./gi, '')
      .replace(/e\.g\.[^.]*\./gi, '')
      .replace(/Example[^:]*:[^.]*\./gi, '')
      .replace(/such as[^.]*\./gi, '');
  }

  /**
   * Remove optional sections
   * @param prompt - Prompt to process
   * @returns Prompt without optional sections
   */
  private removeOptionalSections(prompt: string): string {
    return prompt
      .replace(/\n\n?(Note|NOTE|Background|Context|Additional)[^:]*:[^\n]*(\n[^\n]*)*/gi, '')
      .replace(/\n\n?(Remember|Keep in mind)[^:]*:[^\n]*(\n[^\n]*)*/gi, '');
  }

  /**
   * Truncate while preserving structure
   * @param prompt - Prompt to truncate
   * @param targetTokens - Target token count
   * @returns Truncated prompt
   */
  private truncatePreservingStructure(prompt: string, targetTokens: number): string {
    const sentences = prompt.split(/(?<=[.!?])\s+/);
    let result = '';
    let currentTokens = 0;
    
    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);
      if (currentTokens + sentenceTokens <= targetTokens) {
        result += sentence + ' ';
        currentTokens += sentenceTokens;
      } else {
        break;
      }
    }
    
    return result.trim() + (result ? ' [...]' : '');
  }

  /**
   * Estimate token count from text
   * @param text - Text to estimate
   * @returns Estimated token count
   */
  private estimateTokens(text: string): number {
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate quality score of compressed prompt
   * @param original - Original prompt
   * @param compressed - Compressed prompt
   * @returns Quality score (0-1)
   */
  private estimateQuality(original: string, compressed: string): number {
    // Check if key information is preserved
    const originalKeywords = this.extractKeywords(original);
    const compressedKeywords = this.extractKeywords(compressed);
    
    const preservedKeywords = originalKeywords.filter(k => 
      compressedKeywords.includes(k)
    ).length;
    
    const keywordRatio = originalKeywords.length > 0 
      ? preservedKeywords / originalKeywords.length 
      : 1;
    
    // Check if structure is preserved
    const originalSections = original.split(/\n\n+/).length;
    const compressedSections = compressed.split(/\n\n+/).length;
    const structureRatio = Math.min(1, compressedSections / originalSections);
    
    // Weighted quality score
    return (keywordRatio * 0.7) + (structureRatio * 0.3);
  }

  /**
   * Extract keywords from text
   * @param text - Text to extract from
   * @returns Array of keywords
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .match(/\b[a-z]{5,}\b/g) || [];
  }

  /**
   * Get compression statistics
   * @returns Statistics object
   */
  getStats(): {
    promptsProcessed: number;
    totalTokensSaved: number;
    averageCompressionRatio: number;
  } {
    return { ...this.stats };
  }

  /**
   * Clear statistics
   */
  clearStats(): void {
    this.stats.promptsProcessed = 0;
    this.stats.totalTokensSaved = 0;
    this.stats.averageCompressionRatio = 0;
  }
}

export default PromptCompressor;
