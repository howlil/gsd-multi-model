/**
 * Context Topics — Topic-based context categorization
 *
 * Provides automatic topic extraction and categorization for context sharing.
 * Enables zero-config automatic subscription based on task context.
 *
 * Token overhead: +0.01% (topic metadata)
 */

import { defaultLogger as logger } from '../logger/index.js';

export interface TopicConfig {
  autoExtract: boolean;
  maxTopics: number;
  minRelevance: number;
  priority: 'fifo';
}

export interface TopicExtraction {
  topics: string[];
  confidence: number;
  source: 'file-path' | 'content' | 'task-description';
}

const defaultConfig: TopicConfig = {
  autoExtract: true,
  maxTopics: 5,
  minRelevance: 0.3,
  priority: 'fifo'
};

/**
 * Extract topics from file path
 */
export function extractTopicsFromPath(filePath: string): string[] {
  const topics: string[] = [];
  
  // Extract directory structure as topics
  const parts = filePath.split(/[\\/]/);
  
  for (const part of parts) {
    // Skip empty parts and file extensions
    if (!part || part.includes('.')) continue;
    
    // Convert to topic format
    const topic = part.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (topic && !topics.includes(topic)) {
      topics.push(topic);
    }
  }
  
  // Extract file name without extension
  const fileName = parts[parts.length - 1];
  if (fileName) {
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    const nameTopic = nameWithoutExt.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (nameTopic && !topics.includes(nameTopic)) {
      topics.push(nameTopic);
    }
  }
  
  return topics.slice(0, 5);
}

/**
 * Extract topics from content keywords
 */
export function extractTopicsFromContent(content: string, maxTopics: number = 5): string[] {
  const topics: string[] = [];
  
  // Common programming keywords that indicate topics
  const keywordPatterns = [
    /\b(class|interface|type|enum)\s+([A-Z][a-zA-Z0-9_]*)/g,
    /\bfunction\s+([a-zA-Z][a-zA-Z0-9_]*)/g,
    /\bconst\s+([a-zA-Z][a-zA-Z0-9_]*)\s*=/g,
    /\bimport.*from\s+['"]([^'"]+)['"]/g
  ];
  
  for (const pattern of keywordPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[2]) {
        // Class/interface/enum name
        const topic = match[2].toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (!topics.includes(topic)) {
          topics.push(topic);
        }
      } else if (match[1]) {
        // Import path or function name
        const importPath = match[1];
        const pathParts = importPath.split(/[\\/]/);
        const lastPart = pathParts[pathParts.length - 1];
        const topic = lastPart.toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (!topics.includes(topic)) {
          topics.push(topic);
        }
      }
      
      if (topics.length >= maxTopics) break;
    }
    if (topics.length >= maxTopics) break;
  }
  
  return topics;
}

/**
 * Extract topics from task description
 */
export function extractTopicsFromTask(taskDescription: string, maxTopics: number = 5): string[] {
  const topics: string[] = [];
  
  // Extract key terms from task description
  const words = taskDescription.toLowerCase().split(/\s+/);
  
  // Filter out common words
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'what', 'which'
  ]);
  
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z0-9]/g, '');
    if (cleanWord.length > 3 && !stopWords.has(cleanWord) && !topics.includes(cleanWord)) {
      topics.push(cleanWord);
    }
    
    if (topics.length >= maxTopics) break;
  }
  
  return topics;
}

/**
 * Main topic extraction function
 */
export function extractTopics(options: {
  filePath?: string;
  content?: string;
  taskDescription?: string;
  config?: Partial<TopicConfig>;
}): TopicExtraction {
  const config = { ...defaultConfig, ...options.config };
  const allTopics = new Set<string>();
  let confidence = 0;
  let source: TopicExtraction['source'] = 'task-description';
  
  // Extract from file path (highest priority)
  if (options.filePath) {
    const pathTopics = extractTopicsFromPath(options.filePath);
    for (const topic of pathTopics) {
      allTopics.add(topic);
    }
    confidence += 0.5;
    source = 'file-path';
  }
  
  // Extract from content
  if (options.content && allTopics.size < config.maxTopics) {
    const contentTopics = extractTopicsFromContent(options.content, config.maxTopics - allTopics.size);
    for (const topic of contentTopics) {
      allTopics.add(topic);
    }
    confidence += 0.3;
    source = 'content';
  }
  
  // Extract from task description
  if (options.taskDescription && allTopics.size < config.maxTopics) {
    const taskTopics = extractTopicsFromTask(options.taskDescription, config.maxTopics - allTopics.size);
    for (const topic of taskTopics) {
      allTopics.add(topic);
    }
    confidence += 0.2;
  }
  
  const topics = Array.from(allTopics).slice(0, config.maxTopics);
  
  logger.debug('Topics extracted', {
    topics: topics.length,
    confidence,
    source
  });
  
  return {
    topics,
    confidence,
    source
  };
}

/**
 * Get topic priority (FIFO - all topics have same priority)
 */
export function getTopicPriority(topic: string): number {
  // FIFO: all topics have same priority
  return 0;
}

/**
 * Validate topic format
 */
export function isValidTopic(topic: string): boolean {
  // Topic must be lowercase alphanumeric with hyphens
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(topic);
}

/**
 * Normalize topic string
 */
export function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
