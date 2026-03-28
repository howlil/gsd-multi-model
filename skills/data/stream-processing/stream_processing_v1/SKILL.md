---
name: stream_processing_v1
description: Stream processing patterns, event streaming, real-time data processing, stateful computations, and stream analytics
version: 1.0.0
tags: [data-engineering, stream-processing, event-streaming, real-time, kafka, flink, kinesis]
category: data
triggers:
  keywords: [stream processing, event streaming, real-time processing, kafka streams, flink, kinesis]
  filePatterns: [stream/*.ts, streaming/*.ts, event-processing/*.ts, real-time/*.ts]
  commands: [stream processing, real-time pipeline, event streaming]
  projectArchetypes: [real-time-analytics, fraud-detection, iot-platform, monitoring-system]
  modes: [greenfield, refactor, scaling]
prerequisites:
  - data_pipeline_v1
  - event_driven_v1
  - kafka_messaging_skill_v1
recommended_structure:
  directories:
    - src/streaming/
    - src/streaming/sources/
    - src/streaming/processors/
    - src/streaming/sinks/
    - src/streaming/state/
workflow:
  setup:
    - Define stream requirements
    - Select stream processing engine
    - Design stream topology
    - Set up state management
  generate:
    - Implement stream processors
    - Build windowing logic
    - Create state stores
    - Add exactly-once processing
  test:
    - Stream processing tests
    - State consistency tests
    - Latency tests
    - Failure recovery tests
best_practices:
  - Use event time for windowing
  - Handle late-arriving data
  - Implement proper watermarks
  - Design for exactly-once semantics
  - Monitor processing lag
  - Plan for state recovery
  - Use idempotent operations
anti_patterns:
  - Using processing time for event-time logic
  - No handling for late data
  - State without fault tolerance
  - No backpressure handling
  - Ignoring poison pills
  - No monitoring of lag
tools:
  - Apache Kafka / Kafka Streams
  - Apache Flink
  - Apache Spark Streaming
  - AWS Kinesis
  - Google Cloud Dataflow
metrics:
  - Processing latency (p50, p99)
  - Consumer lag
  - Throughput (events/sec)
  - State store size
  - Exactly-once success rate
  - Late data percentage
---

# Stream Processing Skill

## Overview

This skill provides comprehensive guidance on stream processing, including event streaming patterns, real-time data processing, stateful computations, windowing operations, watermarks, and building production-ready stream processing applications.

Stream processing enables real-time analytics, event-driven architectures, and immediate response to data as it arrives. This skill covers patterns for building reliable, scalable stream processing systems.

## When to Use

- **Real-time analytics** and dashboards
- **Fraud detection** requiring immediate response
- **IoT data processing** from sensors
- **Real-time recommendations**
- **Event-driven microservices**
- **Complex event processing** (CEP)

## When NOT to Use

- **Batch-oriented workloads** (use batch processing)
- **When eventual consistency is unacceptable** and exactly-once is required but hard to achieve
- **Simple data forwarding** (use messaging without processing)

---

## Core Concepts

### 1. Stream Processing Architecture

```typescript
interface StreamProcessor {
  name: string;
  inputTopics: string[];
  outputTopics: string[];
  stateStores?: StateStore[];
}

class StreamProcessingApplication {
  private streamBuilder: StreamBuilder;
  private kafkaConsumer: KafkaConsumer;
  private kafkaProducer: KafkaProducer;
  private stateManager: StateManager;

  async start(): Promise<void> {
    // Build processing topology
    const topology = this.streamBuilder
      .stream('input-topic')
      .filter((key, value) => this.isValid(value))
      .map((key, value) => this.transform(key, value))
      .groupBy((key, value) => this.groupByKey(key, value))
      .windowedBy(TimeWindows.of(60000))
      .aggregate(
        () => this.initialValue(),
        (key, value, aggregate) => this.adder(aggregate, value),
        (key, aggregate) => this.remover(aggregate)
      )
      .toStream()
      .map((key, aggregate) => this.formatOutput(key, aggregate))
      .to('output-topic');

    // Start processing
    await this.processTopology(topology);
  }
}
```

### 2. Windowing Operations

#### Tumbling Window
```typescript
class TumblingWindowProcessor {
  private windowSize: number; // milliseconds

  process(events: StreamEvent[]): WindowedResult[] {
    const windows = new Map<number, StreamEvent[]>();

    for (const event of events) {
      // Calculate window start time
      const windowStart = Math.floor(event.timestamp / this.windowSize) * this.windowSize;
      
      if (!windows.has(windowStart)) {
        windows.set(windowStart, []);
      }
      windows.get(windowStart)!.push(event);
    }

    // Process each window
    return Array.from(windows.entries()).map(([windowStart, events]) => ({
      windowStart,
      windowEnd: windowStart + this.windowSize,
      result: this.aggregate(events)
    }));
  }
}

// Example: Count events per 5-minute tumbling window
const processor = new TumblingWindowProcessor(5 * 60 * 1000);
```

#### Hopping Window
```typescript
class HoppingWindowProcessor {
  private windowSize: number;
  private hopSize: number;

  process(events: StreamEvent[]): WindowedResult[] {
    const windows = new Map<number, StreamEvent[]>();

    for (const event of events) {
      // Event belongs to multiple overlapping windows
      let windowStart = Math.floor(event.timestamp / this.hopSize) * this.hopSize;
      
      // Find all windows this event belongs to
      while (windowStart > event.timestamp - this.windowSize) {
        if (!windows.has(windowStart)) {
          windows.set(windowStart, []);
        }
        windows.get(windowStart)!.push(event);
        windowStart -= this.hopSize;
      }
    }

    return Array.from(windows.entries()).map(([windowStart, events]) => ({
      windowStart,
      windowEnd: windowStart + this.windowSize,
      result: this.aggregate(events)
    }));
  }
}

// Example: 10-minute window, hopping every 5 minutes
const processor = new HoppingWindowProcessor(
  10 * 60 * 1000, // window size
  5 * 60 * 1000   // hop size
);
```

#### Session Window
```typescript
class SessionWindowProcessor {
  private gapSize: number; // milliseconds

  process(events: StreamEvent[]): WindowedResult[] {
    // Group by key first
    const byKey = new Map<string, StreamEvent[]>();
    for (const event of events) {
      if (!byKey.has(event.key)) {
        byKey.set(event.key, []);
      }
      byKey.get(event.key)!.push(event);
    }

    const results: WindowedResult[] = [];

    for (const [key, keyEvents] of byKey.entries()) {
      // Sort by timestamp
      keyEvents.sort((a, b) => a.timestamp - b.timestamp);

      // Create sessions
      const sessions: StreamEvent[][] = [];
      let currentSession: StreamEvent[] = [];

      for (const event of keyEvents) {
        if (currentSession.length === 0) {
          currentSession.push(event);
        } else {
          const lastEvent = currentSession[currentSession.length - 1];
          
          if (event.timestamp - lastEvent.timestamp <= this.gapSize) {
            // Same session
            currentSession.push(event);
          } else {
            // New session
            sessions.push(currentSession);
            currentSession = [event];
          }
        }
      }

      if (currentSession.length > 0) {
        sessions.push(currentSession);
      }

      // Process sessions
      for (const session of sessions) {
        results.push({
          key,
          windowStart: session[0].timestamp,
          windowEnd: session[session.length - 1].timestamp,
          result: this.aggregate(session)
        });
      }
    }

    return results;
  }
}

// Example: Session window with 30-minute gap
const processor = new SessionWindowProcessor(30 * 60 * 1000);
```

### 3. Watermarks & Late Data

```typescript
interface WatermarkStrategy {
  getWatermark(event: StreamEvent): number;
  getAllowedLateness(): number;
}

class BoundedOutOfOrdernessStrategy implements WatermarkStrategy {
  private maxOutOfOrderness: number;
  private currentMaxTimestamp: number = 0;

  constructor(maxOutOfOrderness: number) {
    this.maxOutOfOrderness = maxOutOfOrderness;
  }

  getWatermark(event: StreamEvent): number {
    this.currentMaxTimestamp = Math.max(
      this.currentMaxTimestamp, 
      event.timestamp
    );
    
    // Watermark = max timestamp - allowed lateness
    return this.currentMaxTimestamp - this.maxOutOfOrderness;
  }

  getAllowedLateness(): number {
    return this.maxOutOfOrderness;
  }
}

class LateDataHandler {
  private watermarkStrategy: WatermarkStrategy;
  private sideOutput: SideOutput;

  async processWithLateHandling(
    events: StreamEvent[],
    onTimeProcessor: (e: StreamEvent) => Promise<void>,
    lateProcessor: (e: StreamEvent, lateness: number) => Promise<void>
  ): Promise<void> {
    const currentWatermark = this.watermarkStrategy.getWatermark(
      events[events.length - 1]
    );

    for (const event of events) {
      const lateness = currentWatermark - event.timestamp;

      if (lateness <= 0) {
        // On-time event
        await onTimeProcessor(event);
      } else if (lateness <= this.watermarkStrategy.getAllowedLateness()) {
        // Late but within allowed lateness
        await lateProcessor(event, lateness);
      } else {
        // Too late - send to side output
        await this.sideOutput.send({
          event,
          lateness,
          reason: 'exceeded_allowed_lateness'
        });
      }
    }
  }
}
```

### 4. Stateful Processing

```typescript
interface StateStore {
  name: string;
  get(key: string): Promise<any>;
  put(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  all(): AsyncIterable<[string, any]>;
}

class FaultTolerantStateStore implements StateStore {
  private name: string;
  private localStore: Map<string, any>;
  private changelogProducer: ChangelogProducer;
  private checkpointManager: CheckpointManager;

  async put(key: string, value: any): Promise<void> {
    // Update local state
    this.localStore.set(key, value);

    // Write to changelog for fault tolerance
    await this.changelogProducer.send({
      storeName: this.name,
      key,
      value,
      timestamp: Date.now()
    });
  }

  async checkpoint(): Promise<void> {
    // Save state snapshot
    const snapshot = Array.from(this.localStore.entries());
    await this.checkpointManager.save(this.name, snapshot);
    
    // Purge old changelog entries
    await this.changelogProducer.purgeBefore(Date.now());
  }

  async restore(checkpointId: string): Promise<void> {
    // Restore from checkpoint
    const snapshot = await this.checkpointManager.load(checkpointId);
    this.localStore = new Map(snapshot);

    // Replay changelog since checkpoint
    const changes = await this.changelogProducer.readSince(checkpointId);
    for (const change of changes) {
      if (change.value === null) {
        this.localStore.delete(change.key);
      } else {
        this.localStore.set(change.key, change.value);
      }
    }
  }
}
```

### 5. Exactly-Once Processing

```typescript
class ExactlyOnceProcessor {
  private transactionManager: TransactionManager;
  private stateStore: StateStore;
  private outputProducer: TransactionalProducer;

  async processWithExactlyOnce(
    events: StreamEvent[],
    processor: (event: StreamEvent) => Promise<ProcessingResult>
  ): Promise<void> {
    // Begin transaction
    const transactionId = await this.transactionManager.begin();

    try {
      for (const event of events) {
        // Check if already processed (idempotency)
        const alreadyProcessed = await this.stateStore.get(
          `processed:${event.id}`
        );
        
        if (alreadyProcessed) {
          continue;
        }

        // Process event
        const result = await processor(event);

        // Update state (within transaction)
        await this.stateStore.put(`processed:${event.id}`, {
          processedAt: Date.now(),
          result
        });

        // Send output (within transaction)
        await this.outputProducer.send({
          topic: 'output-topic',
          key: result.key,
          value: result.value,
          transactionId
        });
      }

      // Commit transaction
      await this.transactionManager.commit(transactionId);
    } catch (error) {
      // Abort transaction (all changes rolled back)
      await this.transactionManager.abort(transactionId);
      throw error;
    }
  }
}
```

### 6. Complex Event Processing (CEP)

```typescript
interface Pattern {
  name: string;
  sequence: PatternStep[];
  within: number; // milliseconds
}

interface PatternStep {
  name: string;
  condition: (event: StreamEvent) => boolean;
  quantifier: 'one' | 'zero_or_one' | 'zero_or_more' | 'one_or_more';
}

class PatternDetector {
  private patterns: Pattern[];
  private partialMatches: Map<string, PartialMatch[]>;

  async processEvent(event: StreamEvent): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    for (const pattern of this.patterns) {
      // Check if event matches any step in pattern
      for (let i = 0; i < pattern.sequence.length; i++) {
        const step = pattern.sequence[i];
        
        if (step.condition(event)) {
          // Event matches this step
          const partialMatches = this.partialMatches.get(pattern.name) || [];
          
          if (i === 0) {
            // Start new partial match
            partialMatches.push({
              pattern: pattern.name,
              currentStep: 0,
              events: [event],
              startedAt: event.timestamp
            });
          } else {
            // Extend existing partial matches
            for (const match of partialMatches) {
              if (match.currentStep === i - 1) {
                match.events.push(event);
                match.currentStep = i;

                // Check if pattern complete
                if (match.currentStep === pattern.sequence.length - 1) {
                  if (event.timestamp - match.startedAt <= pattern.within) {
                    matches.push({
                      pattern: pattern.name,
                      events: match.events,
                      completedAt: event.timestamp
                    });
                  }
                  // Remove completed match
                  partialMatches.splice(partialMatches.indexOf(match), 1);
                }
              }
            }
          }

          this.partialMatches.set(pattern.name, partialMatches);
        }
      }

      // Clean up expired partial matches
      this.cleanupExpiredMatches(pattern);
    }

    return matches;
  }

  private cleanupExpiredMatches(pattern: Pattern): void {
    const now = Date.now();
    const matches = this.partialMatches.get(pattern.name) || [];
    
    this.partialMatches.set(
      pattern.name,
      matches.filter(m => now - m.startedAt <= pattern.within)
    );
  }
}

// Example: Fraud detection pattern
const fraudPattern: Pattern = {
  name: 'rapid_transactions',
  sequence: [
    {
      name: 'first_transaction',
      condition: (e) => e.type === 'transaction',
      quantifier: 'one'
    },
    {
      name: 'second_transaction',
      condition: (e) => e.type === 'transaction' && e.amount > 1000,
      quantifier: 'one_or_more'
    },
    {
      name: 'different_location',
      condition: (e) => e.type === 'location_change',
      quantifier: 'one'
    }
  ],
  within: 5 * 60 * 1000 // 5 minutes
};
```

### 7. Backpressure Handling

```typescript
class BackpressureHandler {
  private highWatermark: number;
  private lowWatermark: number;
  private currentBufferUsage: number = 0;
  private backpressureActive: boolean = false;

  async processWithBackpressure(
    event: StreamEvent,
    processor: (e: StreamEvent) => Promise<void>
  ): Promise<void> {
    // Check buffer usage
    if (this.currentBufferUsage >= this.highWatermark) {
      this.backpressureActive = true;
      
      // Apply backpressure strategy
      await this.applyBackpressure(event);
    }

    // Process event
    await processor(event);
    
    // Update buffer usage
    this.currentBufferUsage = this.calculateBufferUsage();

    // Check if we can release backpressure
    if (this.backpressureActive && 
        this.currentBufferUsage <= this.lowWatermark) {
      this.backpressureActive = false;
      this.onBackpressureReleased();
    }
  }

  private async applyBackpressure(event: StreamEvent): Promise<void> {
    // Strategy 1: Buffer (if memory allows)
    if (this.hasBufferCapacity()) {
      await this.buffer(event);
      return;
    }

    // Strategy 2: Sample (drop some events)
    if (this.shouldSample()) {
      await this.sendToSideOutput(event, 'sampled_out');
      return;
    }

    // Strategy 3: Block (wait)
    await this.waitForCapacity();
  }
}
```

---

## Best Practices

### 1. Use Event Time, Not Processing Time
```typescript
// ✅ Good: Event time processing
const result = stream
  .assignTimestampsAndWatermarks(
    WatermarkStrategy.forBoundedOutOfOrderness(Duration.ofSeconds(5))
  )
  .window(TumblingEventTimeWindows.of(Time.minutes(5)))
  .aggregate(new MyAggregateFunction());

// ❌ Bad: Processing time (non-deterministic)
const result = stream
  .window(TumblingProcessingTimeWindows.of(Time.minutes(5)))
  .aggregate(new MyAggregateFunction());
```

### 2. Handle Late Data Explicitly
```typescript
// ✅ Good: Allowed lateness + side output
const result = stream
  .window(TumblingEventTimeWindows.of(Time.minutes(5)))
  .allowedLateness(Time.minutes(1))
  .sideOutputLateData(lateDataTag)
  .aggregate(new MyAggregateFunction());
```

### 3. Enable Exactly-Once Semantics
```typescript
// ✅ Good: Exactly-once configuration
const props = {
  'processing.guarantee': 'exactly_once_v2',
  'transaction.timeout.ms': 60000,
  'enable.idempotence': true
};
```

---

## Anti-Patterns

### ❌ Ignoring Late Data
```typescript
// ❌ Bad: Late data silently dropped
stream.window(...).aggregate(...);

// ✅ Good: Handle late data explicitly
stream
  .allowedLateness(Time.minutes(1))
  .sideOutputLateData(lateTag)
  .aggregate(...);
```

### ❌ State Without Fault Tolerance
```typescript
// ❌ Bad: In-memory state only
let state = new Map();

// ✅ Good: Changelog + checkpoints
const state = stores.keyValueStore('my-store', {
  loggingEnabled: true,
  persistent: true
});
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Processing Latency (p99)** | <1s | Real-time responsiveness |
| **Consumer Lag** | <1000 events | Processing capacity |
| **Throughput** | Track trend | Scaling decisions |
| **Late Data %** | <5% | Watermark tuning |
| **Checkpoint Duration** | <window size | Recovery time |
| **State Store Size** | Monitor | Resource planning |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **Kafka Streams** | Stream processing | JVM, Kafka ecosystem |
| **Apache Flink** | Stream processing | Complex event processing |
| **Spark Streaming** | Micro-batch processing | Existing Spark users |
| **Kinesis** | Stream processing | AWS ecosystem |
| **Dataflow** | Stream processing | GCP ecosystem |

---

## Implementation Checklist

### Design
- [ ] Stream topology designed
- [ ] Windowing strategy selected
- [ ] State requirements defined
- [ ] Late data handling planned

### Implementation
- [ ] Stream processors implemented
- [ ] State stores configured
- [ ] Watermarks configured
- [ ] Exactly-once enabled

### Operations
- [ ] Monitoring configured
- [ ] Alerting for lag
- [ ] Checkpointing enabled
- [ ] Recovery tested

---

## Related Skills

- **Data Pipeline**: `skills/data/data-pipeline/data_pipeline_v1/SKILL.md`
- **Event-Driven Architecture**: `skills/architecture/event-driven/event_driven_v1/SKILL.md`
- **Kafka Messaging**: `skills/devops/kafka/kafka_messaging_skill_v1/SKILL.md`
- **Data Quality**: `skills/data/data-quality/data_quality_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
