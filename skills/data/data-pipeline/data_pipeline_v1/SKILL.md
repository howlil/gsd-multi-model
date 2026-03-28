---
name: data_pipeline_v1
description: Data pipeline architecture, ETL/ELT patterns, data ingestion, transformation, orchestration, and production data pipeline design
version: 1.0.0
tags: [data-engineering, data-pipeline, etl, elt, data-ingestion, data-transformation, orchestration]
category: data
triggers:
  keywords: [data pipeline, etl, elt, data ingestion, data transformation, data orchestration, data processing]
  filePatterns: [pipeline/*.ts, etl/*.ts, data-pipeline/*.ts, ingestion/*.ts]
  commands: [pipeline design, etl implementation, data ingestion]
  projectArchetypes: [data-platform, analytics-platform, data-warehouse, data-lake]
  modes: [greenfield, refactor, scaling]
prerequisites:
  - event_driven_v1
  - queue_based_async_v1
recommended_structure:
  directories:
    - src/pipeline/
    - src/pipeline/sources/
    - src/pipeline/transform/
    - src/pipeline/sinks/
    - src/pipeline/orchestration/
workflow:
  setup:
    - Define data requirements
    - Identify data sources and sinks
    - Select pipeline architecture
    - Set up orchestration
  generate:
    - Implement data extractors
    - Build transformation logic
    - Create data loaders
    - Add monitoring and alerting
  test:
    - Data quality tests
    - Pipeline integration tests
    - Performance tests
    - Recovery tests
best_practices:
  - Schema validation at ingestion
  - Idempotent operations
  - Handle late-arriving data
  - Implement dead letter queues
  - Monitor data quality
  - Version transformation logic
  - Design for failure and recovery
anti_patterns:
  - No error handling
  - Silent data loss
  - No data quality checks
  - Tight coupling between stages
  - No monitoring or alerting
  - Hardcoded schemas
  - No backfill capability
tools:
  - Apache Airflow / Dagster / Prefect
  - Apache Spark / Flink
  - dbt (transformations)
  - Kafka / Kinesis (streaming)
  - Snowflake / BigQuery (warehouse)
metrics:
  - Pipeline latency
  - Data freshness
  - Success/failure rate
  - Data quality score
  - Processing throughput
  - Error recovery time
---

# Data Pipeline Skill

## Overview

This skill provides comprehensive guidance on building data pipelines, including ETL/ELT patterns, data ingestion strategies, transformation logic, orchestration, error handling, and production-ready data pipeline architecture.

Data pipelines move and transform data from sources to destinations, enabling analytics, reporting, and data-driven decision making. This skill covers patterns for building reliable, scalable, and maintainable data pipelines.

## When to Use

- **Data integration** from multiple sources
- **Analytics and reporting** data preparation
- **Data warehouse/lake** population
- **Real-time data processing** needs
- **Data migration** between systems
- **ML feature preparation**

## When NOT to Use

- **Simple data sync** (use CDC tools)
- **Real-time requirements <100ms** (use streaming)
- **One-time data transfer** (use scripts)

---

## Core Concepts

### 1. Pipeline Architecture Patterns

#### Batch ETL Pipeline
```typescript
interface BatchPipeline {
  name: string;
  schedule: string; // Cron expression
  stages: PipelineStage[];
}

interface PipelineStage {
  name: string;
  type: 'extract' | 'transform' | 'load';
  config: Record<string, any>;
  dependencies?: string[];
}

class BatchETLPipeline {
  private extractor: DataExtractor;
  private transformer: DataTransformer;
  private loader: DataLoader;
  private checkpointManager: CheckpointManager;

  async run(executionId: string): Promise<PipelineResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsFailed = 0;

    try {
      // Extract
      const extractResult = await this.extractor.extract({
        startTime: this.getRunWindow().start,
        endTime: this.getRunWindow().end
      });

      recordsProcessed = extractResult.records.length;

      // Transform
      const transformResult = await this.transformer.transform(
        extractResult.records,
        extractResult.schema
      );

      // Load
      const loadResult = await this.loader.load(
        transformResult.records,
        transformResult.schema
      );

      // Checkpoint
      await this.checkpointManager.save(executionId, {
        status: 'success',
        recordsProcessed,
        recordsLoaded: loadResult.count
      });

      return {
        executionId,
        status: 'success',
        recordsProcessed,
        recordsFailed,
        duration: Date.now() - startTime
      };
    } catch (error) {
      recordsFailed = recordsProcessed;
      
      await this.checkpointManager.save(executionId, {
        status: 'failed',
        error: error.message,
        recordsProcessed
      });

      throw error;
    }
  }
}
```

#### Streaming Pipeline
```typescript
interface StreamingPipeline {
  name: string;
  source: StreamSource;
  processors: StreamProcessor[];
  sink: StreamSink;
}

class StreamingDataPipeline {
  private source: StreamSource;
  private processors: StreamProcessor[];
  private sink: StreamSink;
  private stateStore: StateStore;

  async start(): Promise<void> {
    const stream = await this.source.subscribe();

    for await (const event of stream) {
      try {
        // Process through each stage
        let processedEvent = event;
        
        for (const processor of this.processors) {
          processedEvent = await processor.process(processedEvent);
        }

        // Write to sink
        await this.sink.write(processedEvent);

        // Commit offset
        await this.source.commitOffset(event.offset);
      } catch (error) {
        // Send to dead letter queue
        await this.handleProcessingError(event, error);
      }
    }
  }

  private async handleProcessingError(event: StreamEvent, error: Error): Promise<void> {
    await this.deadLetterQueue.send({
      event,
      error: error.message,
      timestamp: new Date(),
      retryCount: event.retryCount || 0
    });

    // Alert if error rate is high
    await this.errorRateMonitor.record(error);
  }
}
```

#### ELT Pipeline (Modern Data Warehouse)
```typescript
class ELTPipeline {
  private extractor: DataExtractor;
  private warehouse: DataWarehouse;
  private transformationEngine: TransformationEngine; // dbt, SQL

  async run(): Promise<void> {
    // Extract: Load raw data to staging
    const rawData = await this.extractor.extract();
    await this.warehouse.loadRaw(rawData, 'staging');

    // Load: Data is already in warehouse

    // Transform: Use SQL/dbt in warehouse
    await this.transformationEngine.run({
      targetSchema: 'analytics',
      models: [
        'dim_customers',
        'dim_products',
        'fact_orders',
        'fact_payments'
      ]
    });
  }
}
```

### 2. Data Extraction Patterns

#### Full Load
```typescript
class FullLoadExtractor {
  async extract(source: DataSource): Promise<ExtractResult> {
    const allData = await source.query('SELECT * FROM table');
    
    return {
      records: allData,
      schema: await source.getSchema(),
      extractedAt: new Date(),
      type: 'full'
    };
  }
}
```

#### Incremental Load
```typescript
class IncrementalExtractor {
  private stateStore: PipelineStateStore;

  async extract(source: DataSource): Promise<ExtractResult> {
    // Get last successful extract timestamp
    const lastExtract = await this.stateStore.get('last_extract_timestamp');
    
    // Extract only new/updated records
    const newData = await source.query(
      `SELECT * FROM table 
       WHERE updated_at > $1 
       ORDER BY updated_at`,
      [lastExtract]
    );

    return {
      records: newData,
      schema: await source.getSchema(),
      extractedAt: new Date(),
      type: 'incremental',
      watermark: newData.length > 0 
        ? newData[newData.length - 1].updated_at 
        : lastExtract
    };
  }
}
```

#### CDC (Change Data Capture)
```typescript
class CDCExtractor {
  private connection: DatabaseConnection;
  private replicationSlot: string;

  async startCapture(): Promise<AsyncIterable<ChangeEvent>> {
    // PostgreSQL logical decoding example
    await this.connection.query(
      `CREATE_REPLICATION_SLOT ${this.replicationSlot} 
       LOGICAL pgoutput 
       EXPORT_SNAPSHOT`
    );

    return {
      async *[Symbol.asyncIterator]() {
        while (true) {
          const changes = await this.connection.query(
            `SELECT * FROM pg_logical_slot_get_changes(
              '${this.replicationSlot}', 
              NULL, NULL, 
              'include-pk', '1',
              'include-transaction', '0'
            )`
          );

          for (const change of changes) {
            yield this.parseChange(change);
          }

          // Wait for more changes
          await sleep(1000);
        }
      }
    };
  }

  private parseChange(raw: any): ChangeEvent {
    return {
      operation: raw.operation, // INSERT, UPDATE, DELETE
      table: raw.table,
      before: raw.before,
      after: raw.after,
      timestamp: raw.timestamp,
      lsn: raw.lsn
    };
  }
}
```

### 3. Data Transformation Patterns

#### Map Transformation
```typescript
class MapTransformer implements DataTransformer {
  private mappings: Record<string, TransformFunction>;

  async transform(records: Record[], schema: Schema): Promise<TransformResult> {
    const transformed = records.map(record => {
      const output: Record<string, any> = {};

      for (const [field, transformFn] of Object.entries(this.mappings)) {
        output[field] = transformFn(record);
      }

      return output;
    });

    return {
      records: transformed,
      schema: this.buildOutputSchema()
    };
  }

  private buildOutputSchema(): Schema {
    return {
      fields: Object.entries(this.mappings).map(([field, fn]) => ({
        name: field,
        type: fn.outputType,
        nullable: fn.nullable
      }))
    };
  }
}

// Usage
const transformer = new MapTransformer({
  mappings: {
    customer_id: (r) => r.id,
    full_name: (r) => `${r.first_name} ${r.last_name}`,
    email_lower: (r) => r.email?.toLowerCase(),
    created_date: (r) => new Date(r.created_at).toISOString().split('T')[0]
  }
});
```

#### Aggregation Transformation
```typescript
class AggregationTransformer implements DataTransformer {
  private groupBy: string[];
  private aggregations: AggregationSpec[];

  async transform(records: Record[]): Promise<TransformResult> {
    // Group records
    const groups = this.groupByFields(records, this.groupBy);

    // Apply aggregations
    const aggregated = groups.map(group => ({
      ...group.key,
      ...this.applyAggregations(group.records, this.aggregations)
    }));

    return {
      records: aggregated,
      schema: this.buildAggregationSchema()
    };
  }

  private applyAggregations(
    records: Record[], 
    aggregations: AggregationSpec[]
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const agg of aggregations) {
      const values = records.map(r => r[agg.field]).filter(v => v !== null);
      
      switch (agg.function) {
        case 'COUNT':
          result[agg.alias] = records.length;
          break;
        case 'COUNT_DISTINCT':
          result[agg.alias] = new Set(values).size;
          break;
        case 'SUM':
          result[agg.alias] = values.reduce((a, b) => a + b, 0);
          break;
        case 'AVG':
          result[agg.alias] = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'MIN':
          result[agg.alias] = Math.min(...values);
          break;
        case 'MAX':
          result[agg.alias] = Math.max(...values);
          break;
      }
    }

    return result;
  }
}
```

#### Join Transformation
```typescript
class JoinTransformer implements DataTransformer {
  async transform(
    left: Record[], 
    right: Record[],
    joinSpec: JoinSpecification
  ): Promise<TransformResult> {
    const rightIndex = this.buildIndex(right, joinSpec.rightKey);
    const joined: Record[] = [];

    for (const leftRecord of left) {
      const leftKey = leftRecord[joinSpec.leftKey];
      const matchingRight = rightIndex.get(leftKey) || [];

      if (joinSpec.type === 'inner' && matchingRight.length === 0) {
        continue;
      }

      if (matchingRight.length === 0) {
        // Left join with no match
        joined.push({ ...leftRecord, ...this.nullRight(joinSpec.rightFields) });
      } else {
        for (const rightRecord of matchingRight) {
          joined.push({ ...leftRecord, ...rightRecord });
        }
      }
    }

    return {
      records: joined,
      schema: this.buildJoinSchema()
    };
  }

  private buildIndex(records: Record[], key: string): Map<any, Record[]> {
    const index = new Map();
    
    for (const record of records) {
      const keyValue = record[key];
      if (!index.has(keyValue)) {
        index.set(keyValue, []);
      }
      index.get(keyValue).push(record);
    }

    return index;
  }
}
```

### 4. Data Loading Patterns

#### Upsert Load
```typescript
class UpsertLoader implements DataLoader {
  private warehouse: DataWarehouse;

  async load(records: Record[], schema: Schema): Promise<LoadResult> {
    const inserted = 0;
    const updated = 0;

    for (const record of records) {
      const exists = await this.warehouse.exists(
        schema.table, 
        schema.primaryKey, 
        record[schema.primaryKey]
      );

      if (exists) {
        await this.warehouse.update(schema.table, record, schema.primaryKey);
        updated++;
      } else {
        await this.warehouse.insert(schema.table, record);
        inserted++;
      }
    }

    return { inserted, updated, failed: 0 };
  }
}
```

#### Bulk Load
```typescript
class BulkLoader implements DataLoader {
  private warehouse: DataWarehouse;

  async load(records: Record[], schema: Schema): Promise<LoadResult> {
    // Use bulk insert API
    const result = await this.warehouse.bulkInsert(
      schema.table,
      records,
      {
        batchSize: 10000,
        parallelism: 4,
        onError: 'abort' // or 'continue'
      }
    );

    return {
      inserted: result.successCount,
      updated: 0,
      failed: result.errorCount
    };
  }
}
```

#### Append Load (for fact tables)
```typescript
class AppendLoader implements DataLoader {
  private warehouse: DataWarehouse;

  async load(records: Record[], schema: Schema): Promise<LoadResult> {
    // Deduplicate within batch
    const deduped = this.deduplicate(records, schema.primaryKey);
    
    // Check for existing records
    const newRecords = await this.filterExisting(deduped, schema);

    // Append
    const result = await this.warehouse.bulkInsert(schema.table, newRecords);

    return {
      inserted: result.successCount,
      updated: 0,
      failed: result.errorCount
    };
  }
}
```

### 5. Pipeline Orchestration

```typescript
interface PipelineDefinition {
  id: string;
  name: string;
  schedule?: string;
  tasks: Task[];
  dependencies: TaskDependency[];
}

interface Task {
  id: string;
  type: 'extract' | 'transform' | 'load' | 'quality' | 'notification';
  config: Record<string, any>;
  retryPolicy?: RetryPolicy;
  timeout?: number;
}

class PipelineOrchestrator {
  private taskRunner: TaskRunner;
  private stateStore: OrchestrationStateStore;
  private alertingService: AlertingService;

  async execute(pipeline: PipelineDefinition): Promise<ExecutionResult> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    try {
      // Build execution graph
      const graph = this.buildExecutionGraph(pipeline);
      
      // Execute tasks respecting dependencies
      const results = await this.executeGraph(graph, executionId);

      return {
        executionId,
        status: 'success',
        taskResults: results,
        duration: Date.now() - startTime
      };
    } catch (error) {
      await this.alertingService.alert({
        type: 'pipeline_failure',
        pipelineId: pipeline.id,
        executionId,
        error: error.message
      });

      return {
        executionId,
        status: 'failed',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  private async executeGraph(
    graph: ExecutionGraph, 
    executionId: string
  ): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    const completed = new Set<string>();

    while (completed.size < graph.tasks.length) {
      // Get runnable tasks (all dependencies met)
      const runnable = graph.tasks.filter(
        task => !completed.has(task.id) && 
                task.dependencies.every(d => completed.has(d))
      );

      // Execute in parallel
      const taskResults = await Promise.all(
        runnable.map(task => this.executeTask(task, executionId))
      );

      for (const result of taskResults) {
        results.push(result);
        completed.add(result.taskId);
      }
    }

    return results;
  }

  private async executeTask(task: Task, executionId: string): Promise<TaskResult> {
    const startTime = Date.now();

    for (let attempt = 1; attempt <= (task.retryPolicy?.maxRetries || 1); attempt++) {
      try {
        const result = await this.taskRunner.run(task);
        
        return {
          taskId: task.id,
          status: 'success',
          duration: Date.now() - startTime,
          attempt
        };
      } catch (error) {
        if (attempt === task.retryPolicy?.maxRetries) {
          return {
            taskId: task.id,
            status: 'failed',
            error: error.message,
            duration: Date.now() - startTime,
            attempt
          };
        }
        
        // Wait before retry
        await sleep(task.retryPolicy?.delayMs || 1000);
      }
    }

    throw new Error('Unreachable');
  }
}
```

### 6. Error Handling & Recovery

```typescript
class PipelineErrorHandler {
  private deadLetterQueue: DeadLetterQueue;
  private retryManager: RetryManager;
  private alertingService: AlertingService;

  async handleError(error: PipelineError, context: ErrorContext): Promise<void> {
    // Categorize error
    const category = this.categorizeError(error);

    switch (category) {
      case 'transient':
        // Retry with backoff
        await this.retryManager.retry(context);
        break;

      case 'data_quality':
        // Send to DLQ for investigation
        await this.deadLetterQueue.send({
          error,
          context,
          timestamp: new Date()
        });
        break;

      case 'permanent':
        // Alert and stop pipeline
        await this.alertingService.alert({
          type: 'pipeline_error',
          severity: 'critical',
          error: error.message,
          context
        });
        throw error;

      case 'schema_mismatch':
        // Alert for schema evolution handling
        await this.alertingService.alert({
          type: 'schema_change',
          error: error.message,
          context
        });
        break;
    }
  }

  private categorizeError(error: PipelineError): ErrorCategory {
    if (error.code === 'CONNECTION_TIMEOUT' || error.code === 'RATE_LIMITED') {
      return 'transient';
    }

    if (error.code === 'VALIDATION_FAILED' || error.code === 'NULL_IN_REQUIRED') {
      return 'data_quality';
    }

    if (error.code === 'SCHEMA_CHANGED' || error.code === 'TYPE_MISMATCH') {
      return 'schema_mismatch';
    }

    return 'permanent';
  }
}
```

---

## Best Practices

### 1. Schema Validation at Ingestion
```typescript
// ✅ Good: Validate early
class ValidatingExtractor {
  async extract(): Promise<ExtractResult> {
    const data = await this.source.read();
    
    // Validate against schema
    const validation = this.schemaValidator.validate(data);
    if (!validation.valid) {
      throw new DataQualityError('Schema validation failed', validation.errors);
    }

    return { records: data, schema: this.schema };
  }
}
```

### 2. Idempotent Operations
```typescript
// ✅ Good: Can safely retry
class IdempotentLoader {
  async load(records: Record[]): Promise<void> {
    // Use upsert with unique key
    await this.warehouse.upsert(records, 'unique_id');
  }
}
```

### 3. Monitor Data Quality
```typescript
// ✅ Good: Continuous quality checks
class DataQualityMonitor {
  async check(records: Record[]): Promise<QualityReport> {
    return {
      completeness: this.checkCompleteness(records),
      uniqueness: this.checkUniqueness(records),
      validity: this.checkValidity(records),
      consistency: this.checkConsistency(records)
    };
  }
}
```

---

## Anti-Patterns

### ❌ Silent Data Loss
```typescript
// ❌ Bad: Errors swallowed
try {
  await process(record);
} catch (e) {
  console.error(e); // And nothing else!
}

// ✅ Good: Proper error handling
try {
  await process(record);
} catch (e) {
  await deadLetterQueue.send({ record, error: e });
  await alertingService.alert({ type: 'processing_error', error: e });
}
```

### ❌ No Backfill Capability
```typescript
// ❌ Bad: Can only process new data
async function run() {
  await processToday();
}

// ✅ Good: Can process any time range
async function run(startTime: Date, endTime: Date) {
  await processRange(startTime, endTime);
}
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Pipeline Latency** | <SLA | Data freshness |
| **Success Rate** | >99% | Reliability |
| **Data Quality Score** | >95% | Data trust |
| **Processing Throughput** | Track trend | Capacity planning |
| **Error Recovery Time** | <30 min | Operational efficiency |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **Airflow** | Orchestration | Complex DAGs |
| **Dagster** | Orchestration + assets | Data-aware scheduling |
| **Prefect** | Orchestration | Modern Python |
| **dbt** | Transformations | SQL-based transforms |
| **Spark** | Processing | Large-scale batch |
| **Flink** | Processing | Real-time streaming |
| **Kafka** | Streaming | Event ingestion |

---

## Implementation Checklist

### Design
- [ ] Data sources identified
- [ ] Data sinks defined
- [ ] Transformation logic documented
- [ ] SLA requirements defined

### Implementation
- [ ] Extractors implemented
- [ ] Transformations built
- [ ] Loaders configured
- [ ] Error handling added

### Operations
- [ ] Monitoring configured
- [ ] Alerting set up
- [ ] Runbooks documented
- [ ] Backfill procedure tested

### Quality
- [ ] Schema validation enabled
- [ ] Data quality checks added
- [ ] Testing framework in place
- [ ] Documentation complete

---

## Related Skills

- **Event-Driven Architecture**: `skills/architecture/event-driven/event_driven_v1/SKILL.md`
- **Queue-Based Async**: `skills/architecture/queue-based-async/queue_based_async_v1/SKILL.md`
- **Stream Processing**: `skills/data/stream-processing/stream_processing_v1/SKILL.md`
- **Data Quality**: `skills/data/data-quality/data_quality_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
