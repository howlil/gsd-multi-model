/**
 * Frontmatter — YAML frontmatter parsing, serialization, and CRUD commands
 */

import * as fs from 'fs';
import * as path from 'path';
import { safeReadFile, output, error } from './core.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface FrontmatterData {
  [key: string]: any;
}

interface StackFrame {
  obj: any;
  key: string | null;
  indent: number;
}

// ─── Parsing engine ───────────────────────────────────────────────────────────

/**
 * Extract YAML frontmatter from markdown content
 * @param content - Markdown content with frontmatter
 * @returns Parsed frontmatter object
 */
export function extractFrontmatter(content: string): FrontmatterData {
  const frontmatter: FrontmatterData = {};
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return frontmatter;

  const yaml = match[1];
  const lines = yaml.split('\n');

  // Stack to track nested objects: [{obj, key, indent}]
  let stack: StackFrame[] = [{ obj: frontmatter, key: null, indent: -1 }];

  for (const line of lines) {
    // Skip empty lines
    if (line.trim() === '') continue;

    // Calculate indentation (number of leading spaces)
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;

    // Pop stack back to appropriate level
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1];

    // Check for key: value pattern
    const keyMatch = line.match(/^(\s*)([a-zA-Z0-9_-]+):\s*(.*)/);
    if (keyMatch) {
      const key = keyMatch[2];
      const value = keyMatch[3].trim();

      if (value === '' || value === '[') {
        // Key with no value or opening bracket — could be nested object or array
        current.obj[key] = value === '[' ? [] : {};
        current.key = null;
        // Push new context for potential nested content
        stack.push({ obj: current.obj[key], key: null, indent });
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array: key: [a, b, c]
        current.obj[key] = value
          .slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        current.key = null;
      } else {
        // Simple key: value
        current.obj[key] = value.replace(/^["']|["']$/g, '');
        current.key = null;
      }
    } else if (line.trim().startsWith('- ')) {
      // Array item
      const itemValue = line.trim().slice(2).replace(/^["']|["']$/g, '');

      // If current context is an empty object, convert to array
      if (typeof current.obj === 'object' && !Array.isArray(current.obj) && Object.keys(current.obj).length === 0) {
        // Find the key in parent that points to this object and convert it
        const parent = stack.length > 1 ? stack[stack.length - 2] : null;
        if (parent) {
          for (const k of Object.keys(parent.obj)) {
            if (parent.obj[k] === current.obj) {
              parent.obj[k] = [itemValue];
              current.obj = parent.obj[k];
              break;
            }
          }
        }
      } else if (Array.isArray(current.obj)) {
        current.obj.push(itemValue);
      }
    }
  }

  return frontmatter;
}

/**
 * Reconstruct YAML frontmatter from object
 * @param obj - Frontmatter data object
 * @returns YAML frontmatter string (without --- delimiters)
 */
export function reconstructFrontmatter(obj: FrontmatterData): string {
  const lines: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else if (value.every(v => typeof v === 'string') && value.length <= 3 && value.join(', ').length < 60) {
        lines.push(`${key}: [${value.join(', ')}]`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          const itemStr = typeof item === 'string' && (item.includes(':') || item.includes('#'))
            ? `"${item}"`
            : String(item);
          lines.push(`  - ${itemStr}`);
        }
      }
    } else if (typeof value === 'object') {
      lines.push(`${key}:`);
      for (const [subkey, subval] of Object.entries(value)) {
        if (subval === null || subval === undefined) continue;
        
        if (Array.isArray(subval)) {
          if (subval.length === 0) {
            lines.push(`  ${subkey}: []`);
          } else if (subval.every(v => typeof v === 'string') && subval.length <= 3 && subval.join(', ').length < 60) {
            lines.push(`  ${subkey}: [${subval.join(', ')}]`);
          } else {
            lines.push(`  ${subkey}:`);
            for (const item of subval) {
              const itemStr = typeof item === 'string' && (item.includes(':') || item.includes('#'))
                ? `"${item}"`
                : String(item);
              lines.push(`    - ${itemStr}`);
            }
          }
        } else if (typeof subval === 'object') {
          lines.push(`  ${subkey}:`);
          for (const [subsubkey, subsubval] of Object.entries(subval)) {
            if (subsubval === null || subsubval === undefined) continue;
            if (Array.isArray(subsubval)) {
              if (subsubval.length === 0) {
                lines.push(`    ${subsubkey}: []`);
              } else {
                lines.push(`    ${subsubkey}:`);
                for (const item of subsubval) {
                  const itemStr = typeof item === 'string' && (item.includes(':') || item.includes('#'))
                    ? `"${item}"`
                    : String(item);
                  lines.push(`      - ${itemStr}`);
                }
              }
            } else {
              const valStr = typeof subsubval === 'string' && (subsubval.includes(':') || subsubval.includes('#'))
                ? `"${subsubval}"`
                : String(subsubval);
              lines.push(`    ${subsubkey}: ${valStr}`);
            }
          }
        } else {
          const valStr = typeof subval === 'string' && (subval.includes(':') || subval.includes('#'))
            ? `"${subval}"`
            : String(subval);
          lines.push(`  ${subkey}: ${valStr}`);
        }
      }
    } else {
      const valStr = typeof value === 'string' && (value.includes(':') || value.includes('#'))
        ? `"${value}"`
        : String(value);
      lines.push(`${key}: ${valStr}`);
    }
  }

  return lines.join('\n');
}

/**
 * Parse frontmatter from a file
 * @param filePath - Path to file
 * @returns Parsed frontmatter object or null
 */
export function parseFrontmatterFile(filePath: string): FrontmatterData | null {
  const content = safeReadFile(filePath);
  if (!content) return null;
  return extractFrontmatter(content);
}

/**
 * Update frontmatter in a file
 * @param filePath - Path to file
 * @param updates - Frontmatter updates to apply
 */
export function updateFrontmatterFile(filePath: string, updates: FrontmatterData): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const hasFrontmatter = content.match(/^---\n([\s\S]+?)\n---/);
  
  let newContent: string;
  if (hasFrontmatter) {
    const existing = extractFrontmatter(content);
    const merged = { ...existing, ...updates };
    const newYaml = reconstructFrontmatter(merged);
    newContent = content.replace(/^---\n([\s\S]+?)\n---/, `---\n${newYaml}\n---`);
  } else {
    const newYaml = reconstructFrontmatter(updates);
    newContent = `---\n${newYaml}\n---\n${content}`;
  }
  
  fs.writeFileSync(filePath, newContent, 'utf-8');
}
