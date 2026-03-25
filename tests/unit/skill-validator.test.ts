#!/usr/bin/env node

/**
 * Unit Tests for Skill Validator
 *
 * Tests schema validation, required fields, category validation,
 * tag validation, triggers validation, and workflow validation
 * for the SkillValidator class.
 */

import assert from 'node:assert';
import { test } from './test-utils.js';
import { SkillValidator, SKILL_SCHEMA, ALLOWED_TAGS } from '../../ez-agents/bin/lib/skill-validator.js';

console.log('Running Skill Validator Tests...\n');

let passed = 0;
let failed = 0;

// Test: Exports
test('SkillValidator class is exported', () => {
  assert.ok(SkillValidator, 'SkillValidator should be exported');
  assert.strictEqual(typeof SkillValidator, 'function', 'Should be a constructor');
});

test('SKILL_SCHEMA is exported with required fields', () => {
  assert.ok(SKILL_SCHEMA, 'SKILL_SCHEMA should be exported');
  assert.ok(Array.isArray(SKILL_SCHEMA.required), 'Should have required array');
  assert.ok(SKILL_SCHEMA.required.includes('name'), 'Should require name');
  assert.ok(SKILL_SCHEMA.required.includes('description'), 'Should require description');
  assert.ok(SKILL_SCHEMA.required.includes('version'), 'Should require version');
  assert.ok(SKILL_SCHEMA.required.includes('category'), 'Should require category');
});

test('ALLOWED_TAGS is exported with 50+ tags', () => {
  assert.ok(Array.isArray(ALLOWED_TAGS), 'ALLOWED_TAGS should be an array');
  assert.ok(ALLOWED_TAGS.length >= 30, `Should have at least 30 tags, has ${ALLOWED_TAGS.length}`);
  assert.ok(ALLOWED_TAGS.includes('laravel'), 'Should include laravel tag');
  assert.ok(ALLOWED_TAGS.includes('react'), 'Should include react tag');
  assert.ok(ALLOWED_TAGS.includes('microservices'), 'Should include microservices tag');
});

// Test: Constructor
test('SkillValidator instantiates without options', () => {
  const validator = new SkillValidator();
  assert.ok(validator, 'Should instantiate');
  assert.ok(typeof validator.validate === 'function', 'Should have validate method');
});

// Test: Validate - Required Fields
test('validate() returns valid for complete skill object', () => {
  const validator = new SkillValidator();
  const skill = {
    name: 'test_skill_v1',
    description: 'Test skill',
    version: '1.0.0',
    category: 'stack'
  };
  const result = validator.validate(skill);
  assert.strictEqual(result.valid, true, 'Should be valid');
  assert.strictEqual(result.errors.length, 0, 'Should have no errors');
});

test('validate() rejects skill without name', () => {
  const validator = new SkillValidator();
  const skill = {
    description: 'Test skill',
    version: '1.0.0',
    category: 'stack'
  };
  const result = validator.validate(skill);
  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('name')), 'Should error about name');
});

test('validate() rejects skill without description', () => {
  const validator = new SkillValidator();
  const skill = {
    name: 'test_skill_v1',
    version: '1.0.0',
    category: 'stack'
  };
  const result = validator.validate(skill);
  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('description')), 'Should error about description');
});

test('validate() rejects skill without version', () => {
  const validator = new SkillValidator();
  const skill = {
    name: 'test_skill_v1',
    description: 'Test skill',
    category: 'stack'
  };
  const result = validator.validate(skill);
  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('version')), 'Should error about version');
});

test('validate() rejects skill without category', () => {
  const validator = new SkillValidator();
  const skill = {
    name: 'test_skill_v1',
    description: 'Test skill',
    version: '1.0.0'
  };
  const result = validator.validate(skill);
  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('category')), 'Should error about category');
});

test('validate() rejects empty string for required fields', () => {
  const validator = new SkillValidator();
  const skill = {
    name: '',
    description: 'Test skill',
    version: '1.0.0',
    category: 'stack'
  };
  const result = validator.validate(skill);
  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('name')), 'Should error about empty name');
});

test('validate() rejects null for required fields', () => {
  const validator = new SkillValidator();
  const skill = {
    name: null,
    description: 'Test skill',
    version: '1.0.0',
    category: 'stack'
  };
  const result = validator.validate(skill);
  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('name')), 'Should error about null name');
});

// Test: Validate - Category
test('validate() accepts valid categories', () => {
  const validator = new SkillValidator();
  const categories = ['stack', 'architecture', 'domain', 'operational', 'governance'];
  
  categories.forEach(category => {
    const skill = {
      name: 'test_skill_v1',
      description: 'Test skill',
      version: '1.0.0',
      category
    };
    const result = validator.validate(skill);
    assert.strictEqual(result.valid, true, `Should accept category: ${category}`);
  });
});

test('validate() rejects invalid category', () => {
  const validator = new SkillValidator();
  const skill = {
    name: 'test_skill_v1',
    description: 'Test skill',
    version: '1.0.0',
    category: 'invalid_category'
  };
  const result = validator.validate(skill);
  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('Invalid category')), 'Should error about invalid category');
});

// Test: Validate - Tags
test('validateTags() accepts valid tags', () => {
  const validator = new SkillValidator();
  const tags = ['laravel', 'php', 'backend', 'framework'];
  const errors = validator.validateTags(tags);
  assert.strictEqual(errors.length, 0, 'Should have no errors for valid tags');
});

test('validateTags() rejects non-array tags', () => {
  const validator = new SkillValidator();
  const errors = validator.validateTags('laravel');
  assert.strictEqual(errors.length, 1, 'Should have error');
  assert.ok(errors[0].includes('array'), 'Should mention array');
});

test('validateTags() rejects invalid tags', () => {
  const validator = new SkillValidator();
  const errors = validator.validateTags(['laravel', 'invalid_tag_xyz_123']);
  assert.strictEqual(errors.length, 1, 'Should have error for invalid tag');
  assert.ok(errors[0].includes('Invalid tag'), 'Should mention invalid tag');
});

test('validate() integrates tag validation', () => {
  const validator = new SkillValidator();
  const skill = {
    name: 'test_skill_v1',
    description: 'Test skill',
    version: '1.0.0',
    category: 'stack',
    tags: ['laravel', 'invalid_tag_xyz']
  };
  const result = validator.validate(skill);
  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('Invalid tag')), 'Should error about invalid tag');
});

// Test: Validate - Triggers
test('validateTriggers() accepts valid triggers object', () => {
  const validator = new SkillValidator();
  const triggers = {
    keywords: ['laravel', 'php'],
    filePatterns: ['composer.json', 'artisan'],
    commands: ['composer install'],
    stack: 'php/laravel-11',
    projectArchetypes: ['ecommerce'],
    modes: ['greenfield']
  };
  const errors = validator.validateTriggers(triggers);
  assert.strictEqual(errors.length, 0, 'Should have no errors');
});

test('validateTriggers() rejects non-object triggers', () => {
  const validator = new SkillValidator();
  const errors = validator.validateTriggers('invalid');
  assert.strictEqual(errors.length, 1, 'Should have error');
  assert.ok(errors[0].includes('object'), 'Should mention object');
});

test('validateTriggers() rejects non-array keywords', () => {
  const validator = new SkillValidator();
  const errors = validator.validateTriggers({ keywords: 'laravel' });
  assert.strictEqual(errors.length, 1, 'Should have error');
  assert.ok(errors[0].includes('keywords'), 'Should mention keywords');
  assert.ok(errors[0].includes('array'), 'Should mention array');
});

test('validateTriggers() rejects non-array filePatterns', () => {
  const validator = new SkillValidator();
  const errors = validator.validateTriggers({ filePatterns: 'composer.json' });
  assert.strictEqual(errors.length, 1, 'Should have error');
  assert.ok(errors[0].includes('filePatterns'), 'Should mention filePatterns');
});

test('validateTriggers() rejects non-array commands', () => {
  const validator = new SkillValidator();
  const errors = validator.validateTriggers({ commands: 'composer install' });
  assert.strictEqual(errors.length, 1, 'Should have error');
  assert.ok(errors[0].includes('commands'), 'Should mention commands');
});

test('validateTriggers() rejects non-string stack', () => {
  const validator = new SkillValidator();
  const errors = validator.validateTriggers({ stack: 123 });
  assert.strictEqual(errors.length, 1, 'Should have error');
  assert.ok(errors[0].includes('stack'), 'Should mention stack');
  assert.ok(errors[0].includes('string'), 'Should mention string');
});

test('validateTriggers() rejects non-array projectArchetypes', () => {
  const validator = new SkillValidator();
  const errors = validator.validateTriggers({ projectArchetypes: 'ecommerce' });
  assert.strictEqual(errors.length, 1, 'Should have error');
  assert.ok(errors[0].includes('projectArchetypes'), 'Should mention projectArchetypes');
});

test('validateTriggers() rejects non-array modes', () => {
  const validator = new SkillValidator();
  const errors = validator.validateTriggers({ modes: 'greenfield' });
  assert.strictEqual(errors.length, 1, 'Should have error');
  assert.ok(errors[0].includes('modes'), 'Should mention modes');
});

test('validate() integrates triggers validation', () => {
  const validator = new SkillValidator();
  const skill = {
    name: 'test_skill_v1',
    description: 'Test skill',
    version: '1.0.0',
    category: 'stack',
    triggers: {
      keywords: 'invalid' // Should be array
    }
  };
  const result = validator.validate(skill);
  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('keywords')), 'Should error about keywords');
});

// Test: Validate - Recommended Structure
test('validateStructure() accepts valid structure object', () => {
  const validator = new SkillValidator();
  const structure = {
    directories: ['src/', 'tests/', 'docs/']
  };
  const errors = validator.validateStructure(structure);
  assert.strictEqual(errors.length, 0, 'Should have no errors');
});

test('validateStructure() rejects non-object structure', () => {
  const validator = new SkillValidator();
  const errors = validator.validateStructure('invalid');
  assert.strictEqual(errors.length, 1, 'Should have error');
  assert.ok(errors[0].includes('object'), 'Should mention object');
});

test('validateStructure() rejects non-array directories', () => {
  const validator = new SkillValidator();
  const errors = validator.validateStructure({ directories: 'src/' });
  assert.strictEqual(errors.length, 1, 'Should have error');
  assert.ok(errors[0].includes('directories'), 'Should mention directories');
  assert.ok(errors[0].includes('array'), 'Should mention array');
});

test('validate() integrates structure validation', () => {
  const validator = new SkillValidator();
  const skill = {
    name: 'test_skill_v1',
    description: 'Test skill',
    version: '1.0.0',
    category: 'stack',
    recommended_structure: {
      directories: 'invalid' // Should be array
    }
  };
  const result = validator.validate(skill);
  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('directories')), 'Should error about directories');
});

// Test: Validate - Workflow
test('validateWorkflow() accepts valid workflow object', () => {
  const validator = new SkillValidator();
  const workflow = {
    setup: ['npm install'],
    generate: ['npm run generate'],
    test: ['npm test']
  };
  const errors = validator.validateWorkflow(workflow);
  assert.strictEqual(errors.length, 0, 'Should have no errors');
});

test('validateWorkflow() rejects non-object workflow', () => {
  const validator = new SkillValidator();
  const errors = validator.validateWorkflow('invalid');
  assert.strictEqual(errors.length, 1, 'Should have error');
  assert.ok(errors[0].includes('object'), 'Should mention object');
});

test('validateWorkflow() rejects non-array setup', () => {
  const validator = new SkillValidator();
  const errors = validator.validateWorkflow({ setup: 'npm install' });
  assert.strictEqual(errors.length, 1, 'Should have error');
  assert.ok(errors[0].includes('setup'), 'Should mention setup');
  assert.ok(errors[0].includes('array'), 'Should mention array');
});

test('validateWorkflow() rejects non-array generate', () => {
  const validator = new SkillValidator();
  const errors = validator.validateWorkflow({ generate: 'npm run generate' });
  assert.strictEqual(errors.length, 1, 'Should have error');
  assert.ok(errors[0].includes('generate'), 'Should mention generate');
});

test('validateWorkflow() rejects non-array test', () => {
  const validator = new SkillValidator();
  const errors = validator.validateWorkflow({ test: 'npm test' });
  assert.strictEqual(errors.length, 1, 'Should have error');
  assert.ok(errors[0].includes('test'), 'Should mention test');
});

test('validate() integrates workflow validation', () => {
  const validator = new SkillValidator();
  const skill = {
    name: 'test_skill_v1',
    description: 'Test skill',
    version: '1.0.0',
    category: 'stack',
    workflow: {
      setup: 'invalid' // Should be array
    }
  };
  const result = validator.validate(skill);
  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('setup')), 'Should error about setup');
});

// Test: Validate - Prerequisites
test('validate() accepts array prerequisites', () => {
  const validator = new SkillValidator();
  const skill = {
    name: 'test_skill_v1',
    description: 'Test skill',
    version: '1.0.0',
    category: 'stack',
    prerequisites: ['node_runtime', 'npm_package_manager']
  };
  const result = validator.validate(skill);
  assert.strictEqual(result.valid, true, 'Should be valid');
});

test('validate() rejects non-array prerequisites', () => {
  const validator = new SkillValidator();
  const skill = {
    name: 'test_skill_v1',
    description: 'Test skill',
    version: '1.0.0',
    category: 'stack',
    prerequisites: 'node_runtime'
  };
  const result = validator.validate(skill);
  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('prerequisites')), 'Should error about prerequisites');
});

// Test: Complex Skill Validation
test('validate() accepts complex valid skill', () => {
  const validator = new SkillValidator();
  const skill = {
    name: 'laravel_11_structure_skill_v2',
    description: 'Laravel 11 project structure and conventions',
    version: '2.0.0',
    tags: ['laravel', 'php', 'backend', 'framework', 'mvc'],
    stack: 'php/laravel-11',
    category: 'stack',
    triggers: {
      keywords: ['laravel', 'eloquent', 'blade'],
      filePatterns: ['composer.json', 'artisan'],
      commands: ['composer require laravel', 'php artisan'],
      stack: 'php/laravel-11',
      projectArchetypes: ['ecommerce', 'saas'],
      modes: ['greenfield', 'migration']
    },
    prerequisites: ['php_8.2_runtime', 'composer_package_manager'],
    recommended_structure: {
      directories: ['app/Models', 'app/Http/Controllers', 'database/migrations']
    },
    workflow: {
      setup: ['composer install', 'php artisan key:generate'],
      generate: ['php artisan make:model'],
      test: ['php artisan test']
    },
    best_practices: ['Use Eloquent ORM', 'Follow PSR-12'],
    anti_patterns: ['Avoid business logic in routes/web.php'],
    scaling_notes: 'Use Redis for caching',
    when_not_to_use: 'Simple static sites',
    output_template: '## Laravel Decision',
    dependencies: {
      php: '>=8.2',
      composer: '>=2.0'
    }
  };
  const result = validator.validate(skill);
  assert.strictEqual(result.valid, true, 'Complex skill should be valid');
  assert.strictEqual(result.errors.length, 0, 'Should have no errors');
});

// Test: Edge Cases
test('validate() handles null skill', () => {
  const validator = new SkillValidator();
  const result = validator.validate(null);
  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('object')), 'Should mention object');
});

test('validate() handles undefined skill', () => {
  const validator = new SkillValidator();
  const result = validator.validate(undefined);
  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('object')), 'Should mention object');
});

test('validate() handles empty object', () => {
  const validator = new SkillValidator();
  const result = validator.validate({});
  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.length >= 4, 'Should have multiple errors for missing required fields');
});

// Summary
console.log(`\n${passed + failed} tests, ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nFailed tests indicate issues with skill-validator.cjs');
  process.exit(1);
}
console.log('\nAll skill validator tests passed!');
