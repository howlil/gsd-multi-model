---
name: data_quality_v1
description: Data quality frameworks, validation, profiling, monitoring, anomaly detection, and data quality governance
version: 1.0.0
tags: [data-engineering, data-quality, data-validation, data-profiling, anomaly-detection, data-governance]
category: data
triggers:
  keywords: [data quality, data validation, data profiling, data monitoring, anomaly detection, data governance]
  filePatterns: [quality/*.ts, validation/*.ts, data-quality/*.ts, dq-rules/*.ts]
  commands: [data quality, data validation, quality monitoring]
  projectArchetypes: [data-platform, analytics-platform, data-warehouse, regulatory-reporting]
  modes: [greenfield, audit, compliance]
prerequisites:
  - data_pipeline_v1
  - data_modeling_v1
recommended_structure:
  directories:
    - src/quality/
    - src/quality/rules/
    - src/quality/monitors/
    - src/quality/reports/
workflow:
  setup:
    - Define quality dimensions
    - Identify critical data elements
    - Set quality thresholds
    - Select validation tools
  generate:
    - Implement validation rules
    - Build quality monitors
    - Create anomaly detectors
    - Set up alerting
  test:
    - Rule accuracy tests
    - False positive analysis
    - Performance tests
best_practices:
  - Define quality at ingestion
  - Fail fast on critical issues
  - Monitor trends not just thresholds
  - Document quality rules
  - Involve business in definitions
  - Automate remediation where possible
  - Track quality over time
anti_patterns:
  - No quality checks in pipelines
  - Silent data corruption
  - Quality as afterthought
  - No ownership of quality
  - Ignoring false positives
  - No remediation process
tools:
  - Great Expectations
  - dbt tests
  - Soda Core
  - Monte Carlo
  - Datafold
metrics:
  - Completeness score
  - Accuracy rate
  - Timeliness score
  - Consistency score
  - Uniqueness rate
  - Validity percentage
---

# Data Quality Skill

## Overview

This skill provides comprehensive guidance on data quality, including quality dimensions, validation frameworks, data profiling, monitoring, anomaly detection, and establishing data quality governance for reliable data systems.

Data quality ensures that data is fit for its intended purpose. Poor data quality leads to incorrect decisions, lost revenue, and compliance risks. This skill covers patterns for building robust data quality systems.

## When to Use

- **Critical business reporting** requiring accurate data
- **Regulatory compliance** (GDPR, SOX, Basel)
- **Data migration** validation
- **ML feature validation**
- **Data integration** from multiple sources
- **After data incidents** (prevent recurrence)

## When NOT to Use

- **Experimental/prototype** data
- **Non-critical analytics** where approximations are acceptable

---

## Core Concepts

### 1. Data Quality Dimensions

```typescript
enum QualityDimension {
  COMPLETENESS = 'completeness',    // Is all data present?
  ACCURACY = 'accuracy',            // Does data reflect reality?
  TIMELINESS = 'timeliness',        // Is data available when needed?
  CONSISTENCY = 'consistency',      // Is data consistent across systems?
  UNIQUENESS = 'uniqueness',        // Are there duplicates?
  VALIDITY = 'validity'             // Does data conform to rules?
}

interface QualityMetric {
  dimension: QualityDimension;
  name: string;
  description: string;
  calculation: () => Promise<number>; // Returns 0-100
  threshold: {
    warning: number;
    critical: number;
  };
}

class DataQualityAssessment {
  private metrics: QualityMetric[] = [];

  async assess(dataset: Dataset): Promise<QualityReport> {
    const results: MetricResult[] = [];

    for (const metric of this.metrics) {
      const score = await metric.calculation();
      results.push({
        metric: metric.name,
        dimension: metric.dimension,
        score,
        status: this.getStatus(score, metric.threshold),
        timestamp: new Date()
      });
    }

    return {
      dataset: dataset.name,
      overallScore: this.calculateOverallScore(results),
      results,
      assessedAt: new Date()
    };
  }

  private getStatus(score: number, threshold: { warning: number; critical: number }): 'good' | 'warning' | 'critical' {
    if (score >= threshold.warning) return 'good';
    if (score >= threshold.critical) return 'warning';
    return 'critical';
  }

  private calculateOverallScore(results: MetricResult[]): number {
    // Weighted average of all metrics
    const weights = {
      completeness: 0.25,
      accuracy: 0.25,
      timeliness: 0.15,
      consistency: 0.15,
      uniqueness: 0.10,
      validity: 0.10
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const result of results) {
      const weight = weights[result.dimension as keyof typeof weights] || 0.1;
      totalScore += result.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }
}
```

### 2. Completeness Checks

```typescript
class CompletenessChecker {
  async checkCompleteness(
    table: string,
    columns: string[],
    filters?: Record<string, any>
  ): Promise<CompletenessResult> {
    const results: ColumnCompleteness[] = [];

    for (const column of columns) {
      const result = await this.checkColumnCompleteness(table, column, filters);
      results.push(result);
    }

    return {
      table,
      columns: results,
      overallCompleteness: this.calculateOverall(results),
      checkedAt: new Date()
    };
  }

  private async checkColumnCompleteness(
    table: string,
    column: string,
    filters?: Record<string, any>
  ): Promise<ColumnCompleteness> {
    const whereClause = filters ? this.buildWhereClause(filters) : '1=1';

    const result = await db.query(`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(${column}) as non_null_count,
        COUNT(DISTINCT ${column}) as distinct_count
      FROM ${table}
      WHERE ${whereClause}
    `);

    const totalRows = result[0].total_rows;
    const nonNullCount = result[0].non_null_count;
    const completeness = totalRows > 0 ? (nonNullCount / totalRows) * 100 : 0;

    return {
      column,
      totalRows,
      nonNullCount,
      nullCount: totalRows - nonNullCount,
      completeness,
      distinctCount: result[0].distinct_count,
      distinctRatio: totalRows > 0 ? (result[0].distinct_count / totalRows) * 100 : 0
    };
  }

  // Check for expected row counts
  async checkRowCount(
    table: string,
    expectedMin: number,
    expectedMax?: number
  ): Promise<RowCountResult> {
    const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
    const count = result[0].count;

    return {
      table,
      actualCount: count,
      expectedMin,
      expectedMax,
      passed: count >= expectedMin && (expectedMax === undefined || count <= expectedMax),
      deviation: ((count - expectedMin) / expectedMin) * 100
    };
  }
}

// Usage
const completenessChecker = new CompletenessChecker();
const result = await completenessChecker.checkCompleteness('fact_orders', [
  'order_id',
  'customer_id',
  'order_date',
  'total_amount'
], {
  order_date: '>= 2026-01-01'
});
```

### 3. Validity Checks

```typescript
interface ValidationRule {
  name: string;
  column: string;
  rule: ValidationFunction;
  severity: 'warning' | 'critical';
}

type ValidationFunction = (value: any) => boolean | ValidationResult;

class ValidityChecker {
  private rules: Map<string, ValidationRule[]> = new Map();

  registerRule(table: string, rule: ValidationRule): void {
    if (!this.rules.has(table)) {
      this.rules.set(table, []);
    }
    this.rules.get(table)!.push(rule);
  }

  async validate(table: string): Promise<ValidationResult[]> {
    const tableRules = this.rules.get(table) || [];
    const results: ValidationResult[] = [];

    for (const rule of tableRules) {
      const result = await this.executeRule(table, rule);
      results.push(result);
    }

    return results;
  }

  private async executeRule(
    table: string, 
    rule: ValidationRule
  ): Promise<ValidationResult> {
    const startTime = Date.now();

    // Get sample data for validation
    const sample = await db.query(`
      SELECT ${rule.column} 
      FROM ${table} 
      TABLESAMPLE SYSTEM (10)
      LIMIT 10000
    `);

    let validCount = 0;
    let invalidCount = 0;
    const invalidSamples: any[] = [];

    for (const row of sample) {
      const value = row[rule.column];
      
      if (value === null || value === undefined) {
        continue; // Skip nulls (handled by completeness)
      }

      const result = rule.rule(value);
      
      if (typeof result === 'boolean') {
        if (result) {
          validCount++;
        } else {
          invalidCount++;
          if (invalidSamples.length < 10) {
            invalidSamples.push(value);
          }
        }
      } else {
        if (result.valid) {
          validCount++;
        } else {
          invalidCount++;
          if (invalidSamples.length < 10) {
            invalidSamples.push({ value, reason: result.reason });
          }
        }
      }
    }

    const totalChecked = validCount + invalidCount;
    const validityRate = totalChecked > 0 ? (validCount / totalChecked) * 100 : 100;

    return {
      rule: rule.name,
      column: rule.column,
      table,
      totalChecked,
      validCount,
      invalidCount,
      validityRate,
      invalidSamples,
      severity: rule.severity,
      passed: validityRate >= 99, // 99% threshold
      duration: Date.now() - startTime
    };
  }
}

// Example rules
const validityChecker = new ValidityChecker();

// Email format
validityChecker.registerRule('customers', {
  name: 'valid_email_format',
  column: 'email',
  severity: 'warning',
  rule: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
});

// Positive amount
validityChecker.registerRule('orders', {
  name: 'positive_amount',
  column: 'total_amount',
  severity: 'critical',
  rule: (value: number) => value >= 0
});

// Valid date range
validityChecker.registerRule('orders', {
  name: 'valid_order_date',
  column: 'order_date',
  severity: 'critical',
  rule: (value: Date) => {
    const now = new Date();
    const minDate = new Date('2020-01-01');
    return value >= minDate && value <= now;
  }
});

// Foreign key existence
validityChecker.registerRule('orders', {
  name: 'valid_customer_id',
  column: 'customer_id',
  severity: 'critical',
  rule: async (value: number) => {
    const exists = await db.query(
      'SELECT 1 FROM customers WHERE customer_id = $1',
      [value]
    );
    return exists.length > 0;
  }
});
```

### 4. Uniqueness Checks

```typescript
class UniquenessChecker {
  async checkUniqueness(
    table: string,
    columns: string[]
  ): Promise<UniquenessResult> {
    const columnList = columns.join(', ');

    const result = await db.query(`
      SELECT 
        ${columnList},
        COUNT(*) as occurrence_count
      FROM ${table}
      GROUP BY ${columnList}
      HAVING COUNT(*) > 1
      ORDER BY occurrence_count DESC
      LIMIT 100
    `);

    const duplicateCount = result.length;
    
    const totalRows = await db.query(
      `SELECT COUNT(*) as count FROM ${table}`
    );

    const uniqueRows = await db.query(`
      SELECT COUNT(DISTINCT ${columnList}) as count FROM ${table}
    `);

    const uniquenessRate = totalRows[0].count > 0 
      ? (uniqueRows[0].count / totalRows[0].count) * 100 
      : 100;

    return {
      table,
      columns,
      totalRows: totalRows[0].count,
      uniqueRows: uniqueRows[0].count,
      duplicateCount,
      duplicates: result.slice(0, 20), // Sample
      uniquenessRate,
      passed: duplicateCount === 0
    };
  }

  async checkExactDuplicates(table: string): Promise<DuplicateResult> {
    const result = await db.query(`
      WITH duplicates AS (
        SELECT *, 
               ROW_NUMBER() OVER (PARTITION BY * ORDER BY (SELECT NULL)) as rn
        FROM ${table}
      )
      SELECT * FROM duplicates WHERE rn > 1
      LIMIT 100
    `);

    return {
      table,
      duplicateRows: result.length,
      duplicates: result,
      passed: result.length === 0
    };
  }
}
```

### 5. Consistency Checks

```typescript
class ConsistencyChecker {
  // Cross-table consistency
  async checkReferentialIntegrity(
    sourceTable: string,
    sourceColumn: string,
    targetTable: string,
    targetColumn: string
  ): Promise<ReferentialIntegrityResult> {
    const orphans = await db.query(`
      SELECT s.${sourceColumn}, COUNT(*) as orphan_count
      FROM ${sourceTable} s
      LEFT JOIN ${targetTable} t 
        ON s.${sourceColumn} = t.${targetColumn}
      WHERE t.${targetColumn} IS NULL
      GROUP BY s.${sourceColumn}
      ORDER BY orphan_count DESC
      LIMIT 100
    `);

    const totalSource = await db.query(
      `SELECT COUNT(*) as count FROM ${sourceTable}`
    );

    const orphanCount = orphans.reduce((sum, r) => sum + r.orphan_count, 0);
    const consistencyRate = totalSource[0].count > 0
      ? ((totalSource[0].count - orphanCount) / totalSource[0].count) * 100
      : 100;

    return {
      sourceTable,
      sourceColumn,
      targetTable,
      targetColumn,
      totalSourceRows: totalSource[0].count,
      orphanCount,
      orphanSamples: orphans.slice(0, 20),
      consistencyRate,
      passed: orphanCount === 0
    };
  }

  // Cross-system consistency
  async checkCrossSystemConsistency(
    checks: CrossSystemCheck[]
  ): Promise<ConsistencyReport> {
    const results: ConsistencyResult[] = [];

    for (const check of checks) {
      // Query both systems
      const [systemA, systemB] = await Promise.all([
        check.querySystemA(),
        check.querySystemB()
      ]);

      const discrepancy = this.calculateDiscrepancy(systemA, systemB, check.tolerance);

      results.push({
        check: check.name,
        systemAValue: systemA,
        systemBValue: systemB,
        discrepancy,
        passed: discrepancy <= check.tolerance
      });
    }

    return {
      checks: results,
      overallConsistency: results.filter(r => r.passed).length / results.length * 100,
      checkedAt: new Date()
    };
  }

  // Business rule consistency
  async checkBusinessRules(
    table: string,
    rules: BusinessRule[]
  ): Promise<BusinessRuleResult[]> {
    const results: BusinessRuleResult[] = [];

    for (const rule of rules) {
      const violations = await db.query(`
        SELECT * FROM ${table}
        WHERE NOT (${rule.condition})
        LIMIT 100
      `);

      const totalRows = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
      
      results.push({
        rule: rule.name,
        description: rule.description,
        totalRows: totalRows[0].count,
        violationCount: violations.length,
        violationRate: (violations.length / totalRows[0].count) * 100,
        violations: violations.slice(0, 20),
        passed: violations.length === 0,
        severity: rule.severity
      });
    }

    return results;
  }
}

// Example business rules
const businessRules: BusinessRule[] = [
  {
    name: 'order_date_before_ship_date',
    description: 'Order date must be before or equal to ship date',
    condition: 'order_date <= COALESCE(ship_date, order_date)',
    severity: 'critical'
  },
  {
    name: 'positive_quantity',
    description: 'Quantity must be positive',
    condition: 'quantity > 0',
    severity: 'critical'
  },
  {
    name: 'discount_within_limits',
    description: 'Discount must be between 0 and 100 percent',
    condition: 'discount_percent BETWEEN 0 AND 100',
    severity: 'warning'
  }
];
```

### 6. Anomaly Detection

```typescript
class AnomalyDetector {
  private historicalData: Map<string, number[]> = new Map();

  // Statistical anomaly detection
  async detectStatisticalAnomalies(
    metric: string,
    currentValue: number,
    windowSize: number = 30
  ): Promise<AnomalyResult> {
    const history = this.historicalData.get(metric) || [];
    
    if (history.length < 7) {
      return {
        metric,
        value: currentValue,
        isAnomaly: false,
        reason: 'Insufficient historical data'
      };
    }

    // Calculate statistics
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const stdDev = Math.sqrt(
      history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / history.length
    );

    // Z-score
    const zScore = Math.abs(currentValue - mean) / stdDev;
    const isAnomaly = zScore > 3; // 3 sigma

    return {
      metric,
      value: currentValue,
      isAnomaly,
      zScore,
      mean,
      stdDev,
      threshold: mean + (3 * stdDev),
      reason: isAnomaly ? `Value ${zScore.toFixed(2)} standard deviations from mean` : 'Within normal range'
    };
  }

  // Time-series anomaly detection
  async detectTimeSeriesAnomalies(
    metric: string,
    timeSeriesData: TimeSeriesPoint[]
  ): Promise<AnomalyResult[]> {
    const results: AnomalyResult[] = [];

    // Simple moving average + std dev
    const windowSize = 7;
    
    for (let i = windowSize; i < timeSeriesData.length; i++) {
      const window = timeSeriesData.slice(i - windowSize, i);
      const mean = window.reduce((sum, p) => sum + p.value, 0) / windowSize;
      const stdDev = Math.sqrt(
        window.reduce((sum, p) => sum + Math.pow(p.value - mean, 2), 0) / windowSize
      );

      const currentValue = timeSeriesData[i].value;
      const zScore = Math.abs(currentValue - mean) / stdDev;

      results.push({
        metric,
        timestamp: timeSeriesData[i].timestamp,
        value: currentValue,
        isAnomaly: zScore > 3,
        zScore,
        mean,
        stdDev
      });
    }

    return results;
  }

  // Distribution-based anomaly detection
  async detectDistributionShift(
    column: string,
    currentDistribution: Distribution,
    referenceDistribution: Distribution
  ): Promise<DistributionShiftResult> {
    // Calculate PSI (Population Stability Index)
    const psi = this.calculatePSI(referenceDistribution, currentDistribution);

    return {
      column,
      psi,
      shift: psi > 0.1, // 0.1 threshold for significant shift
      severity: psi > 0.25 ? 'high' : psi > 0.1 ? 'medium' : 'low',
      referenceDistribution,
      currentDistribution,
      interpretation: this.interpretPSI(psi)
    };
  }

  private calculatePSI(expected: number[], actual: number[]): number {
    let psi = 0;
    for (let i = 0; i < expected.length; i++) {
      const exp = expected[i];
      const act = actual[i];
      if (exp > 0 && act > 0) {
        psi += (act - exp) * Math.log(act / exp);
      }
    }
    return psi;
  }

  private interpretPSI(psi: number): string {
    if (psi < 0.1) return 'No significant change';
    if (psi < 0.25) return 'Moderate change detected';
    return 'Significant distribution shift';
  }
}
```

### 7. Data Quality Dashboard

```typescript
class DataQualityDashboard {
  private qualityStore: QualityStore;
  private alertingService: AlertingService;

  async generateReport(dataset: string, period: Period): Promise<QualityReport> {
    const metrics = await this.qualityStore.getMetrics(dataset, period);
    const trends = await this.calculateTrends(dataset, period);
    const issues = await this.qualityStore.getIssues(dataset, period);

    return {
      dataset,
      period,
      summary: {
        overallScore: this.calculateOverallScore(metrics),
        totalChecks: metrics.length,
        passedChecks: metrics.filter(m => m.passed).length,
        criticalIssues: issues.filter(i => i.severity === 'critical').length,
        warningIssues: issues.filter(i => i.severity === 'warning').length
      },
      dimensions: this.groupByDimension(metrics),
      trends,
      topIssues: issues.slice(0, 10),
      recommendations: this.generateRecommendations(metrics, issues),
      generatedAt: new Date()
    };
  }

  async monitorAndAlert(): Promise<void> {
    const datasets = await this.qualityStore.getAllDatasets();

    for (const dataset of datasets) {
      const latestMetrics = await this.qualityStore.getLatestMetrics(dataset);

      for (const metric of latestMetrics) {
        if (metric.status === 'critical') {
          await this.alertingService.alert({
            type: 'data_quality_critical',
            dataset,
            metric: metric.name,
            value: metric.score,
            threshold: metric.threshold.critical,
            severity: 'critical'
          });
        } else if (metric.status === 'warning') {
          await this.alertingService.alert({
            type: 'data_quality_warning',
            dataset,
            metric: metric.name,
            value: metric.score,
            threshold: metric.threshold.warning,
            severity: 'warning'
          });
        }
      }
    }
  }
}
```

---

## Best Practices

### 1. Define Quality at Ingestion
```typescript
// ✅ Good: Validate at pipeline entry
class ValidatingIngestion {
  async ingest(data: Record[]): Promise<void> {
    // Validate before processing
    const validationResult = await this.validator.validate(data);
    
    if (!validationResult.passed) {
      throw new DataQualityError('Validation failed', validationResult.errors);
    }

    await this.process(data);
  }
}
```

### 2. Fail Fast on Critical Issues
```typescript
// ✅ Good: Stop pipeline on critical issues
if (qualityScore < criticalThreshold) {
  await pipeline.stop();
  await alerting.alert('Critical data quality issue');
}
```

### 3. Monitor Trends
```typescript
// ✅ Good: Track quality over time
const trend = await qualityStore.getTrend('completeness', 30);
if (trend.direction === 'declining' && trend.slope < -0.01) {
  await alerting.alert('Data quality trending downward');
}
```

---

## Anti-Patterns

### ❌ Silent Data Corruption
```typescript
// ❌ Bad: Errors swallowed
try {
  await processData(data);
} catch (e) {
  console.error(e); // And nothing else!
}

// ✅ Good: Alert and quarantine
try {
  await processData(data);
} catch (e) {
  await quarantine.send(data);
  await alerting.alert({ type: 'processing_error', error: e });
}
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Completeness** | >99% | Data availability |
| **Accuracy** | >98% | Correctness |
| **Timeliness** | >95% | Freshness |
| **Consistency** | >99% | Cross-system alignment |
| **Uniqueness** | >99.9% | No duplicates |
| **Validity** | >99% | Rule compliance |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **Great Expectations** | Validation framework | Comprehensive testing |
| **dbt tests** | SQL-based tests | dbt users |
| **Soda Core** | Quality monitoring | Open-source option |
| **Monte Carlo** | Data observability | Enterprise |
| **Datafold** | Diff testing | CI/CD integration |

---

## Implementation Checklist

### Foundation
- [ ] Quality dimensions defined
- [ ] Critical data elements identified
- [ ] Quality thresholds set
- [ ] Ownership assigned

### Implementation
- [ ] Validation rules implemented
- [ ] Quality monitors deployed
- [ ] Anomaly detection enabled
- [ ] Alerting configured

### Operations
- [ ] Dashboard created
- [ ] Runbooks documented
- [ ] Remediation process defined
- [ ] Regular reviews scheduled

---

## Related Skills

- **Data Pipeline**: `skills/data/data-pipeline/data_pipeline_v1/SKILL.md`
- **Data Modeling**: `skills/data/data-modeling/data_modeling_v1/SKILL.md`
- **Stream Processing**: `skills/data/stream-processing/stream_processing_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
