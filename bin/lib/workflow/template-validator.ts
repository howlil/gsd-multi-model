/**
 * Template Validator - Validates agent output against template schemas
 * 
 * Ensures workflows use correct templates and output matches expected structure.
 * Prevents workflow breaks when templates change.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getTemplatePath, getReferencePath } from '../core.js';
import { defaultLogger as logger } from '../logger/index.js';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  sections: SectionValidation[];
  template: string;
  timestamp: string;
}

export interface ValidationError {
  type: 'missing_section' | 'invalid_structure' | 'schema_violation' | 'format_error';
  section: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface SectionValidation {
  name: string;
  present: boolean;
  valid: boolean;
  issues: string[];
}

/**
 * Agent output format schema from agent-output-format.md
 */
const AGENT_OUTPUT_SCHEMA = {
  required_sections: [
    'Decision Log',
    'Trade-off Analysis', 
    'Artifacts Produced',
    'Skills Applied',
    'Verification Status'
  ],
  optional_sections: [
    'Context',
    'Approach',
    'Implementation Details',
    'Testing',
    'Next Steps'
  ]
};

/**
 * Template-specific schemas
 */
const TEMPLATE_SCHEMAS: Record<string, {
  required_sections?: string[];
  required_headers?: string[];
  required_frontmatter?: string[];
  patterns?: RegExp[];
}> = {
  'summary': {
    required_sections: ['Goal', 'Work Completed', 'Outcomes'],
    required_headers: ['Summary', 'Tasks'],
    patterns: [
      /##+\s+Summary/i,
      /##+\s+Tasks\s+Completed/i,
      /Files\s+(Modified|Created):/i
    ]
  },
  'phase-prompt': {
    required_frontmatter: ['phase', 'goal'],
    required_sections: ['Objective', 'Tasks', 'Success Criteria'],
    patterns: [
      /<objective>[\s\S]*?<\/objective>/i,
      /<task[\s\S]*?>([\s\S]*?)<\/task>/gi,
      /<verify>[\s\S]*?<\/verify>/i
    ]
  },
  'project': {
    required_sections: ['Overview', 'Goals', 'Scope', 'Constraints'],
    patterns: [
      /#.*Project.*Charter/i,
      /\*\*Goal:\*\*/i,
      /\*\*Scope:\*\*/i
    ]
  },
  'requirements': {
    required_sections: ['Functional Requirements', 'Non-Functional Requirements'],
    patterns: [
      /##+\s+Functional\s+Requirements/i,
      /##+\s+Non-Functional\s+Requirements/i,
      /\[FR-\d+\]/i,
      /\[NFR-\d+\]/i
    ]
  },
  'roadmap': {
    required_sections: ['Phases', 'Timeline'],
    patterns: [
      /##+\s+Phase\s+\d+/i,
      /\*\*Goal:\*\*/i,
      /Phase\s+\d+:\s*[^\n]+/gi
    ]
  }
};

/**
 * Validate agent output against the standard agent-output-format.md template
 * 
 * @param output - Agent output text to validate
 * @returns Validation result with errors and warnings
 */
export function validateAgentOutput(output: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    sections: [],
    template: 'agent-output-format',
    timestamp: new Date().toISOString()
  };

  // Check required sections from agent-output-format.md
  for (const section of AGENT_OUTPUT_SCHEMA.required_sections) {
    const sectionValidation: SectionValidation = {
      name: section,
      present: false,
      valid: false,
      issues: []
    };

    // Check for section header (various formats)
    const patterns = [
      new RegExp(`##+\\s+${escapeRegex(section)}`, 'i'),
      new RegExp(`\\*\\*${escapeRegex(section)}\\*\\*`, 'i'),
      new RegExp(`<${section.toLowerCase().replace(/\s+/g, '-')}[^>]*>`, 'i'),
      new RegExp(`###?\\s+${section.replace(/\s+/g, '')}`, 'i')
    ];

    const found = patterns.some(pattern => pattern.test(output));
    sectionValidation.present = found;

    if (!found) {
      result.errors.push({
        type: 'missing_section',
        section,
        message: `Required section "${section}" not found in output`,
        severity: 'error'
      });
      result.valid = false;
    } else {
      sectionValidation.valid = true;
    }

    result.sections.push(sectionValidation);
  }

  // Check for optional sections (warn if missing important ones)
  const importantOptional = ['Context', 'Approach'];
  for (const section of importantOptional) {
    const present = new RegExp(`##+\\s+${escapeRegex(section)}`, 'i').test(output);
    
    if (!present) {
      result.warnings.push(`Optional but recommended section "${section}" not found`);
    }
  }

  // Check for proper structure (headers should be in order)
  const headerPattern = /^(#{1,6})\s+(.+)$/gm;
  const headers: { level: number; text: string; position: number }[] = [];
  let match;
  
  while ((match = headerPattern.exec(output)) !== null) {
    headers.push({
      level: match[1].length,
      text: match[2]!.trim(),
      position: match.index
    });
  }

  // Check header hierarchy (no skipping levels)
  for (let i = 1; i < headers.length; i++) {
    const prev = headers[i - 1]!;
    const curr = headers[i]!;
    
    if (curr.level > prev.level + 1) {
      result.errors.push({
        type: 'invalid_structure',
        section: curr.text,
        message: `Header level skip: H${prev.level} → H${curr.level} (should be H${prev.level + 1})`,
        severity: 'warning'
      });
      result.warnings.push(`Header hierarchy issue at "${curr.text}"`);
    }
  }

  // Log validation result
  logger.info('Agent output validation complete', {
    valid: result.valid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
    sectionCount: result.sections.length
  });

  return result;
}

/**
 * Validate output against a specific template schema
 * 
 * @param output - Output text to validate
 * @param templateName - Template name (without .md extension)
 * @returns Validation result
 */
export function validateTemplate(output: string, templateName: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    sections: [],
    template: templateName,
    timestamp: new Date().toISOString()
  };

  const schema = TEMPLATE_SCHEMAS[templateName];
  
  if (!schema) {
    result.warnings.push(`No schema defined for template "${templateName}", using generic validation`);
    return validateAgentOutput(output);
  }

  // Check required sections
  if (schema.required_sections) {
    for (const section of schema.required_sections) {
      const sectionValidation: SectionValidation = {
        name: section,
        present: false,
        valid: false,
        issues: []
      };

      const found = new RegExp(`##+\\s+${escapeRegex(section)}`, 'i').test(output);
      sectionValidation.present = found;

      if (!found) {
        result.errors.push({
          type: 'missing_section',
          section,
          message: `Template "${templateName}" requires section "${section}"`,
          severity: 'error'
        });
        result.valid = false;
      } else {
        sectionValidation.valid = true;
      }

      result.sections.push(sectionValidation);
    }
  }

  // Check required headers
  if (schema.required_headers) {
    for (const header of schema.required_headers) {
      const found = new RegExp(`##+\\s+${escapeRegex(header)}`, 'i').test(output);
      
      if (!found) {
        result.errors.push({
          type: 'missing_section',
          section: header,
          message: `Template "${templateName}" requires header "${header}"`,
          severity: 'error'
        });
        result.valid = false;
      }
    }
  }

  // Check required patterns
  if (schema.patterns) {
    for (const pattern of schema.patterns) {
      const found = pattern.test(output);
      
      if (!found) {
        result.errors.push({
          type: 'schema_violation',
          section: 'structure',
          message: `Template "${templateName}" pattern not matched: ${pattern}`,
          severity: 'warning'
        });
        result.warnings.push(`Pattern not found: ${pattern}`);
      }
    }
  }

  // Check frontmatter if required
  if (schema.required_frontmatter) {
    const frontmatterMatch = output.match(/^---\n([\s\S]*?)\n---/);
    
    if (!frontmatterMatch) {
      result.errors.push({
        type: 'format_error',
        section: 'frontmatter',
        message: 'Template requires frontmatter but none found',
        severity: 'error'
      });
      result.valid = false;
    } else {
      const frontmatter = frontmatterMatch[1]!;
      
      for (const field of schema.required_frontmatter) {
        const found = new RegExp(`^${escapeRegex(field)}\\s*:`, 'm').test(frontmatter);
        
        if (!found) {
          result.errors.push({
            type: 'schema_violation',
            section: 'frontmatter',
            message: `Frontmatter field "${field}" required but not found`,
            severity: 'error'
          });
          result.valid = false;
        }
      }
    }
  }

  logger.info('Template validation complete', {
    template: templateName,
    valid: result.valid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length
  });

  return result;
}

/**
 * Validate a template file itself (checks template structure)
 * 
 * @param templateName - Template name to validate
 * @returns Validation result
 */
export function validateTemplateFile(templateName: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    sections: [],
    template: templateName,
    timestamp: new Date().toISOString()
  };

  try {
    const templatePath = getTemplatePath(templateName);
    
    if (!fs.existsSync(templatePath)) {
      result.errors.push({
        type: 'format_error',
        section: 'file',
        message: `Template file not found: ${templatePath}`,
        severity: 'error'
      });
      result.valid = false;
      return result;
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');

    // Check for basic template structure
    const hasContent = templateContent.trim().length > 0;
    const hasPlaceholders = /\{[^}]+\}/.test(templateContent) || /<[^>]+>/.test(templateContent);

    if (!hasContent) {
      result.errors.push({
        type: 'format_error',
        section: 'content',
        message: 'Template file is empty',
        severity: 'error'
      });
      result.valid = false;
    }

    if (!hasPlaceholders) {
      result.warnings.push('Template has no placeholders - may be static content');
    }

    // Check for template variables syntax
    const variablePattern = /\{[a-z_][a-z0-9_]*\}/gi;
    const variables = templateContent.match(variablePattern) || [];
    
    if (variables.length > 0) {
      logger.debug('Template variables found', {
        template: templateName,
        variables: [...new Set(variables)]
      });
    }

  } catch (error) {
    const err = error as Error;
    result.errors.push({
      type: 'format_error',
      section: 'file',
      message: `Failed to read template: ${err.message}`,
      severity: 'error'
    });
    result.valid = false;
  }

  return result;
}

/**
 * Batch validate multiple outputs
 * 
 * @param outputs - Array of {output, template} pairs
 * @returns Array of validation results
 */
export function batchValidate(outputs: Array<{ output: string; template: string }>): ValidationResult[] {
  return outputs.map(({ output, template }) => validateTemplate(output, template));
}

/**
 * Get validation summary for reporting
 * 
 * @param results - Array of validation results
 * @returns Summary statistics
 */
export function getValidationSummary(results: ValidationResult[]): {
  total: number;
  valid: number;
  invalid: number;
  totalErrors: number;
  totalWarnings: number;
  byTemplate: Record<string, { valid: number; invalid: number }>;
} {
  const summary = {
    total: results.length,
    valid: 0,
    invalid: 0,
    totalErrors: 0,
    totalWarnings: 0,
    byTemplate: {} as Record<string, { valid: number; invalid: number }>
  };

  for (const result of results) {
    if (result.valid) {
      summary.valid++;
    } else {
      summary.invalid++;
    }

    summary.totalErrors += result.errors.length;
    summary.totalWarnings += result.warnings.length;

    if (!summary.byTemplate[result.template]) {
      summary.byTemplate[result.template] = { valid: 0, invalid: 0 };
    }

    if (result.valid) {
      summary.byTemplate[result.template]!.valid++;
    } else {
      summary.byTemplate[result.template]!.invalid++;
    }
  }

  return summary;
}

/**
 * Escape special regex characters
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push(`Template: ${result.template}`);
  lines.push(`Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
  lines.push(`Timestamp: ${result.timestamp}`);
  lines.push('');

  if (result.errors.length > 0) {
    lines.push(`Errors (${result.errors.length}):`);
    for (const error of result.errors) {
      lines.push(`  [${error.severity.toUpperCase()}] ${error.type}: ${error.message}`);
      lines.push(`    Section: ${error.section}`);
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push(`Warnings (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      lines.push(`  ⚠️  ${warning}`);
    }
    lines.push('');
  }

  if (result.sections.length > 0) {
    lines.push('Sections:');
    for (const section of result.sections) {
      const status = section.valid ? '✅' : section.present ? '⚠️' : '❌';
      lines.push(`  ${status} ${section.name} (${section.present ? 'present' : 'missing'})`);
      if (section.issues.length > 0) {
        for (const issue of section.issues) {
          lines.push(`      - ${issue}`);
        }
      }
    }
  }

  return lines.join('\n');
}
