/**
 * Tests for TechDebtAnalyzer
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { TechDebtAnalyzer } = require('../../bin/lib/tech-debt-analyzer.cjs');

describe('TechDebtAnalyzer', () => {
  let analyzer;
  const testDir = path.join(__dirname, '..', 'fixtures', 'test-project');

  before(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    }
    
    // Create test files with debt markers
    fs.writeFileSync(
      path.join(testDir, 'src', 'todo-file.ts'),
      '// TODO: Implement this feature\nexport const todo = true;'
    );
    fs.writeFileSync(
      path.join(testDir, 'src', 'fixme-file.ts'),
      '// FIXME: This is broken\nexport const broken = true;'
    );
    fs.writeFileSync(
      path.join(testDir, 'src', 'xxx-file.ts'),
      '// XXX: Performance issue here\nexport const slow = true;'
    );
    fs.writeFileSync(
      path.join(testDir, 'src', 'deprecated-file.ts'),
      '// DEPRECATED: Use new API instead\nexport const old = true;'
    );
    
    analyzer = new TechDebtAnalyzer(testDir);
  });

  describe('detectDebtMarkers', () => {
    it('finds TODO comments with Low severity', () => {
      const markers = analyzer.detectDebtMarkers(testDir);
      const todos = markers.filter(m => m.marker === 'TODO');
      
      assert.ok(todos.length > 0);
      assert.strictEqual(todos[0].severity, 'Low');
    });

    it('finds FIXME comments with Medium severity', () => {
      const markers = analyzer.detectDebtMarkers(testDir);
      const fixes = markers.filter(m => m.marker === 'FIXME');
      
      assert.ok(fixes.length > 0);
      assert.strictEqual(fixes[0].severity, 'Medium');
    });

    it('finds XXX comments with High severity', () => {
      const markers = analyzer.detectDebtMarkers(testDir);
      const xxx = markers.filter(m => m.marker === 'XXX');
      
      assert.ok(xxx.length > 0);
      assert.strictEqual(xxx[0].severity, 'High');
    });

    it('finds DEPRECATED comments with Critical severity', () => {
      const markers = analyzer.detectDebtMarkers(testDir);
      const deprecated = markers.filter(m => m.marker === 'DEPRECATED');
      
      assert.ok(deprecated.length > 0);
      assert.strictEqual(deprecated[0].severity, 'Critical');
    });

    it('returns results sorted by severity (Critical first)', () => {
      const markers = analyzer.detectDebtMarkers(testDir);
      
      if (markers.length > 1) {
        for (let i = 1; i < markers.length; i++) {
          assert.ok(markers[i - 1].weight >= markers[i].weight);
        }
      }
    });

    it('includes file path and line number', () => {
      const markers = analyzer.detectDebtMarkers(testDir);
      
      for (const marker of markers) {
        assert.ok(marker.file);
        assert.ok(typeof marker.line === 'number');
      }
    });
  });

  describe('analyzeDependencyRisk', () => {
    it('parses npm audit JSON output', () => {
      const risks = analyzer.analyzeDependencyRisk(testDir);
      
      // May be empty if no vulnerabilities
      assert.ok(Array.isArray(risks));
    });

    it('returns risk objects with severity and score', () => {
      const risks = analyzer.analyzeDependencyRisk(testDir);
      
      for (const risk of risks) {
        assert.ok(risk.type);
        assert.ok(risk.severity);
        assert.ok(typeof risk.score === 'number');
      }
    });
  });

  describe('aggregateFindings', () => {
    it('combines all findings and sorts by score', () => {
      const debtMarkers = [
        { file: 'a.ts', line: 1, marker: 'TODO', severity: 'Low', weight: 1 }
      ];
      const complexityIssues = [
        { file: 'b.ts', line: 5, rule: 'complexity', severity: 'High', message: 'Too complex', score: 3 }
      ];
      const largeFiles = [
        { file: 'c.ts', lines: 600, sizeKB: 50, severity: 'Medium', score: 2 }
      ];
      const duplicates = [];
      const dependencyRisks = [];

      const aggregated = analyzer.aggregateFindings(
        debtMarkers,
        complexityIssues,
        largeFiles,
        duplicates,
        dependencyRisks
      );

      assert.ok(aggregated.length > 0);
      
      // Should be sorted by score descending
      if (aggregated.length > 1) {
        for (let i = 1; i < aggregated.length; i++) {
          assert.ok((aggregated[i - 1].score || 0) >= (aggregated[i].score || 0));
        }
      }
    });
  });

  describe('getSummary', () => {
    it('returns summary object with counts by type and severity', () => {
      const findings = [
        { type: 'debt_marker', severity: 'Low', score: 1 },
        { type: 'debt_marker', severity: 'High', score: 3 },
        { type: 'complexity', severity: 'Medium', score: 2 }
      ];

      const summary = analyzer.getSummary(findings);

      assert.ok(typeof summary.total === 'number');
      assert.ok(summary.byType);
      assert.ok(summary.bySeverity);
      assert.strictEqual(summary.bySeverity.Low, 1);
      assert.strictEqual(summary.bySeverity.High, 1);
      assert.strictEqual(summary.bySeverity.Medium, 1);
    });
  });

  describe('getByFile', () => {
    it('groups findings by file', () => {
      const findings = [
        { file: 'a.ts', type: 'debt_marker', score: 1 },
        { file: 'a.ts', type: 'complexity', score: 2 },
        { file: 'b.ts', type: 'debt_marker', score: 1 }
      ];

      const byFile = analyzer.getByFile(findings);

      assert.ok(Array.isArray(byFile));
      assert.ok(byFile.length > 0);
      
      const aFile = byFile.find(f => f.file === 'a.ts');
      assert.ok(aFile);
      assert.strictEqual(aFile.issues.length, 2);
    });
  });
});
