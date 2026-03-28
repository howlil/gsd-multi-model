---
name: mlops_v1
description: ML operations, ML pipeline automation, model deployment, monitoring, drift detection, and production ML system design
version: 1.0.0
tags: [mlops, ml-ops, machine-learning, ml-pipeline, model-deployment, ml-monitoring, ci-cd-ml]
category: ai
triggers:
  keywords: [mlops, ml pipeline, model deployment, ml monitoring, model retraining, ml operations]
  filePatterns: [ml-pipeline/*.ts, model-serving/*.ts, ml-ops/*.ts, model-registry/*.ts]
  commands: [ml deployment, model pipeline, mlops setup]
  projectArchetypes: [ml-platform, ai-service, prediction-service, recommendation-system]
  modes: [greenfield, production-readiness, scaling]
prerequisites:
  - ai_llm_integration_skill_v1
  - cicd_pipeline_skill_v1
  - kubernetes_skill_v1
  - monitoring_skill_v1
recommended_structure:
  directories:
    - src/ml/
    - src/ml/pipelines/
    - src/ml/models/
    - src/ml/serving/
    - src/ml/monitoring/
    - src/ml/registry/
    - src/ml/feature-store/
workflow:
  setup:
    - Define ML workflow requirements
    - Select ML platform and tools
    - Design model registry schema
    - Set up experiment tracking
  generate:
    - Build training pipelines
    - Implement model serving
    - Create monitoring dashboards
    - Set up automated retraining
  test:
    - Model validation tests
    - A/B testing framework
    - Performance benchmarking
    - Drift detection validation
best_practices:
  - Version control for models and data
  - Automated testing for ML pipelines
  - Continuous monitoring for drift
  - Staged model rollouts
  - Reproducible experiments
  - Feature store for consistency
  - Model governance and approval workflows
anti_patterns:
  - Manual model deployment
  - No model versioning
  - Missing production monitoring
  - Training-serving skew
  - No rollback capability
  - Ignoring data drift
  - No model documentation
tools:
  - MLflow / Weights & Biases
  - Kubeflow / TFX
  - Seldon Core / BentoML
  - Evidently AI / WhyLabs
  - Feast (Feature Store)
metrics:
  - Model accuracy/precision/recall
  - Prediction latency (p50, p95, p99)
  - Data drift score
  - Model age
  - Training frequency
  - Inference throughput
  - GPU/CPU utilization
---

# MLOps Skill

## Overview

This skill provides comprehensive guidance on building and operating Machine Learning Operations (MLOps) systems, including ML pipeline automation, model deployment strategies, production monitoring, drift detection, automated retraining, and governance for production ML systems.

MLOps applies DevOps principles to machine learning, enabling reliable, scalable, and maintainable ML systems in production.

## When to Use

- **Production ML models** requiring reliable deployment
- **Multiple models** needing coordinated management
- **Frequent model updates** requiring automation
- **Compliance requirements** demanding model governance
- **Team collaboration** on ML projects
- **Monitoring needs** for model performance and drift

## When NOT to Use

- **Experimental/notebook-only** ML work
- **Single model, infrequent updates** (manual may suffice)
- **Early-stage prototypes** (add MLOps when going to production)
- **Resource-constrained projects** (MLOps adds overhead)

---

## Core Concepts

### 1. MLOps Maturity Levels

```
Level 0: Manual ML
┌──────────────────────────────────────┐
│  Notebook → Manual Export → Deploy   │
│  No automation, no monitoring        │
└──────────────────────────────────────┘

Level 1: ML Pipeline Automation
┌──────────────────────────────────────┐
│  Automated Training → Manual Deploy  │
│  CI/CD for code, manual for models   │
└──────────────────────────────────────┘

Level 2: CI/CD for ML
┌──────────────────────────────────────┐
│  CI/CD Pipeline → Auto Deploy        │
│  Automated testing and deployment    │
└──────────────────────────────────────┘

Level 3: Full MLOps (Target)
┌──────────────────────────────────────┐
│  CI/CD/CT → Monitoring → Retraining  │
│  Continuous Everything               │
└──────────────────────────────────────┘
```

### 2. MLOps Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MLOPS PIPELINE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DATA LAYER                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Data       │  │  Feature    │  │  Data       │             │
│  │  Sources    │──│  Store      │──│  Validation │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  TRAINING LAYER                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Experiment │  │  Model      │  │  Model      │             │
│  │  Tracking   │──│  Training   │──│  Validation │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  DEPLOYMENT LAYER                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Model      │  │  Model      │  │  Serving    │             │
│  │  Registry   │──│  Packaging  │──│  Infrastructure│          │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  MONITORING LAYER                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Performance│  │  Data       │  │  Alerting   │             │
│  │  Monitoring │──│  Drift      │──│  & Actions  │             │
│  │             │  │  Detection  │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  GOVERNANCE LAYER                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Model      │  │  Approval   │  │  Audit      │             │
│  │  Catalog    │──│  Workflows  │──│  Trail      │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Model Registry

```typescript
interface ModelVersion {
  name: string;
  version: string;
  stage: 'development' | 'staging' | 'production' | 'archived';
  metrics: Record<string, number>;
  parameters: Record<string, any>;
  artifacts: {
    modelPath: string;
    configPath: string;
    signaturePath: string;
  };
  metadata: {
    createdAt: Date;
    createdBy: string;
    trainingRunId: string;
    dataset: DatasetReference;
    codeVersion: string;
  };
}

class ModelRegistry {
  private storage: ModelStorage;
  private metadataStore: MetadataStore;

  async register(model: ModelVersion): Promise<void> {
    // Validate model
    await this.validate(model);
    
    // Store artifacts
    await this.storage.save(model);
    
    // Register metadata
    await this.metadataStore.upsert(model);
    
    // Tag in git
    await this.tagCodeVersion(model);
  }

  async promote(modelName: string, version: string, toStage: string): Promise<void> {
    const model = await this.get(modelName, version);
    
    // Run promotion checks
    await this.runPromotionChecks(model, toStage);
    
    // Update stage
    model.stage = toStage as ModelStage;
    await this.metadataStore.update(model);
    
    // Deploy if promoting to production
    if (toStage === 'production') {
      await this.deployToProduction(model);
    }
  }

  private async runPromotionChecks(model: ModelVersion, stage: string): Promise<void> {
    // Check minimum metrics thresholds
    const thresholds = this.getThresholds(stage);
    for (const [metric, threshold] of Object.entries(thresholds)) {
      if (model.metrics[metric] < threshold) {
        throw new Error(`Model ${metric} (${model.metrics[metric]}) below threshold (${threshold})`);
      }
    }
    
    // Run validation tests
    await this.runValidationTests(model);
  }
}
```

### 4. Training Pipeline

```typescript
interface TrainingPipeline {
  name: string;
  steps: PipelineStep[];
  triggers: Trigger[];
}

interface PipelineStep {
  name: string;
  type: 'data-prep' | 'training' | 'evaluation' | 'validation';
  config: Record<string, any>;
  dependencies?: string[];
}

class TrainingOrchestrator {
  private steps: Map<string, PipelineStep>;
  private executor: StepExecutor;
  private tracker: ExperimentTracker;

  async run(pipeline: TrainingPipeline, params: TrainingParams): Promise<TrainingResult> {
    const runId = this.generateRunId();
    const context: PipelineContext = { runId, params, artifacts: {} };

    try {
      // Execute steps in order
      for (const step of pipeline.steps) {
        context = await this.executeStep(step, context);
        await this.tracker.logStep(runId, step.name, 'completed');
      }

      // Register final model
      const model = await this.registerModel(context);
      
      return {
        runId,
        status: 'success',
        model,
        metrics: context.metrics
      };
    } catch (error) {
      await this.tracker.logStep(runId, 'pipeline', 'failed', error);
      throw error;
    }
  }

  private async executeStep(step: PipelineStep, context: PipelineContext): Promise<PipelineContext> {
    await this.tracker.logStep(context.runId, step.name, 'started');
    
    const startTime = Date.now();
    const result = await this.executor.execute(step, context);
    const duration = Date.now() - startTime;
    
    await this.tracker.logMetrics(context.runId, step.name, {
      duration,
      ...result.metrics
    });

    return { ...context, ...result };
  }
}
```

### 5. Model Serving Patterns

#### Real-time Serving
```typescript
class ModelServingService {
  private model: LoadedModel;
  private cache: PredictionCache;
  private metrics: ServingMetrics;

  async predict(request: PredictionRequest): Promise<PredictionResponse> {
    const startTime = Date.now();

    try {
      // Check cache
      const cachedResult = await this.cache.get(request.features);
      if (cachedResult) {
        return cachedResult;
      }

      // Validate input
      await this.validateInput(request.features);

      // Run prediction
      const prediction = await this.model.predict(request.features);

      // Validate output
      await this.validateOutput(prediction);

      // Cache result
      await this.cache.set(request.features, prediction, 300); // 5 min TTL

      // Log metrics
      this.metrics.recordLatency(Date.now() - startTime);
      this.metrics.recordPrediction(prediction);

      return {
        prediction,
        modelVersion: this.model.version,
        latency: Date.now() - startTime
      };
    } catch (error) {
      this.metrics.recordError(error);
      throw error;
    }
  }
}
```

#### Batch Serving
```typescript
class BatchPredictionService {
  private model: LoadedModel;
  private storage: DataStorage;

  async runBatchPrediction(job: BatchJob): Promise<BatchResult> {
    const inputDataReader = await this.storage.getReader(job.inputPath);
    const outputDataWriter = await this.storage.getWriter(job.outputPath);

    let processed = 0;
    let errors = 0;

    for await (const batch of inputDataReader.readBatches(job.batchSize)) {
      try {
        const predictions = await this.model.predictBatch(batch);
        await outputDataWriter.write(predictions);
        processed += batch.length;
      } catch (error) {
        errors += batch.length;
        console.error('Batch prediction error:', error);
      }
    }

    return {
      jobId: job.id,
      status: 'completed',
      processed,
      errors,
      outputPath: job.outputPath
    };
  }
}
```

#### Shadow Mode (Pre-production Testing)
```typescript
class ShadowModelService {
  private primaryModel: ModelService;
  private shadowModel: ModelService;
  private comparator: ModelComparator;

  async predict(request: PredictionRequest): Promise<PredictionResponse> {
    // Get prediction from primary model
    const primaryResult = await this.primaryModel.predict(request);

    // Get prediction from shadow model (new model being tested)
    const shadowPromise = this.shadowModel.predict(request);
    
    // Don't wait for shadow, log asynchronously
    shadowPromise.then(shadowResult => {
      this.comparator.compareAndLog({
        requestId: request.id,
        primary: primaryResult,
        shadow: shadowResult,
        features: request.features
      });
    }).catch(err => {
      console.error('Shadow prediction error:', err);
    });

    // Return primary result immediately
    return primaryResult;
  }
}
```

### 6. Monitoring & Drift Detection

```typescript
interface DriftMetrics {
  featureDrift: Record<string, number>; // PSI per feature
  predictionDrift: number;
  dataQuality: Record<string, number>;
  timestamp: Date;
}

class DriftDetector {
  private referenceDistribution: FeatureDistribution;
  private windowSize: number;
  private threshold: number;

  async detectDrift(currentData: DataFrame): Promise<DriftMetrics> {
    const featureDrift: Record<string, number> = {};

    for (const feature of this.referenceDistribution.features) {
      const currentDistribution = this.computeDistribution(currentData[feature]);
      
      // Calculate Population Stability Index (PSI)
      const psi = this.calculatePSI(
        this.referenceDistribution[feature],
        currentDistribution
      );

      featureDrift[feature] = psi;
    }

    const overallDrift = this.aggregateDrift(featureDrift);
    const hasDrift = overallDrift > this.threshold;

    return {
      featureDrift,
      predictionDrift: this.calculatePredictionDrift(currentData),
      dataQuality: this.assessDataQuality(currentData),
      timestamp: new Date()
    };
  }

  private calculatePSI(expected: number[], actual: number[]): number {
    // PSI = Σ((actual% - expected%) * ln(actual% / expected%))
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
}

class ModelPerformanceMonitor {
  private metricsCollector: MetricsCollector;
  private alertingService: AlertingService;

  async monitor(): Promise<void> {
    const metrics = await this.metricsCollector.collect();

    // Check for performance degradation
    if (metrics.accuracy < this.thresholds.accuracy) {
      await this.alertingService.alert({
        type: 'performance_degradation',
        severity: 'high',
        message: `Model accuracy ${metrics.accuracy} below threshold ${this.thresholds.accuracy}`,
        metrics
      });
    }

    // Check for latency issues
    if (metrics.p99Latency > this.thresholds.latency) {
      await this.alertingService.alert({
        type: 'latency_issue',
        severity: 'medium',
        message: `P99 latency ${metrics.p99Latency}ms exceeds threshold ${this.thresholds.latency}ms`,
        metrics
      });
    }
  }
}
```

### 7. Automated Retraining

```typescript
interface RetrainingTrigger {
  type: 'schedule' | 'drift' | 'performance' | 'manual';
  condition: RetrainingCondition;
}

interface RetrainingCondition {
  schedule?: string; // Cron expression
  driftThreshold?: number;
  performanceThreshold?: number;
}

class RetrainingOrchestrator {
  private triggers: RetrainingTrigger[];
  private trainingPipeline: TrainingPipeline;
  private modelRegistry: ModelRegistry;
  private driftDetector: DriftDetector;

  async checkAndRetrain(): Promise<void> {
    for (const trigger of this.triggers) {
      const shouldRetrain = await this.evaluateTrigger(trigger);
      
      if (shouldRetrain) {
        await this.initiateRetraining(trigger.type);
        break; // Only one retraining at a time
      }
    }
  }

  private async evaluateTrigger(trigger: RetrainingTrigger): Promise<boolean> {
    switch (trigger.type) {
      case 'schedule':
        return this.isScheduleTime(trigger.condition.schedule!);
      
      case 'drift':
        const drift = await this.driftDetector.detectDrift();
        return drift.overallDrift > trigger.condition.driftThreshold!;
      
      case 'performance':
        const metrics = await this.getCurrentMetrics();
        return metrics.accuracy < trigger.condition.performanceThreshold!;
      
      default:
        return false;
    }
  }

  private async initiateRetraining(reason: string): Promise<void> {
    console.log(`Initiating retraining due to: ${reason}`);
    
    // Get latest data
    const trainingData = await this.fetchTrainingData();
    
    // Run training pipeline
    const result = await this.trainingPipeline.run({
      data: trainingData,
      metadata: { retrainingReason: reason }
    });
    
    // Evaluate and potentially promote
    if (result.metrics.accuracy > this.promotionThreshold) {
      await this.modelRegistry.promote(
        result.model.name,
        result.model.version,
        'production'
      );
    }
  }
}
```

### 8. Feature Store

```typescript
interface Feature {
  name: string;
  dtype: 'numeric' | 'categorical' | 'embedding';
  transformation?: string;
  source: string;
}

interface FeatureView {
  name: string;
  features: Feature[];
  entityColumns: string[];
}

class FeatureStore {
  private onlineStore: OnlineFeatureStore; // Redis, DynamoDB
  private offlineStore: OfflineFeatureStore; // Snowflake, BigQuery
  private registry: FeatureRegistry;

  async getFeatures(viewName: string, entityIds: string[]): Promise<FeatureVector[]> {
    // Get features from online store (low latency)
    return await this.onlineStore.get(viewName, entityIds);
  }

  async getHistoricalFeatures(
    viewName: string,
    entityIds: string[],
    timestamps: Date[]
  ): Promise<FeatureVector[]> {
    // Get historical features from offline store
    return await this.offlineStore.get(viewName, entityIds, timestamps);
  }

  async materialize(viewName: string, startTime: Date, endTime: Date): Promise<void> {
    // Compute features from raw data
    const features = await this.computeFeatures(viewName, startTime, endTime);
    
    // Write to online store
    await this.onlineStore.write(viewName, features);
  }
}
```

---

## Best Practices

### 1. Version Everything

```typescript
// ✅ Good: Version control for all artifacts
interface VersionedArtifact {
  artifact: Model | Data | Code;
  version: string;
  gitSha: string;
  createdAt: Date;
  checksum: string;
}

class VersionedModelRegistry {
  async register(model: Model, metadata: ModelMetadata): Promise<string> {
    const version = this.generateVersion(metadata);
    const gitSha = await this.getCurrentGitSha();
    const checksum = await this.computeChecksum(model);

    await this.storage.save({
      model,
      metadata: {
        ...metadata,
        version,
        gitSha,
        checksum,
        createdAt: new Date()
      }
    });

    return version;
  }
}
```

### 2. Implement CI/CD/CT

```typescript
// Continuous Training Pipeline
const trainingPipeline = {
  stages: [
    {
      name: 'data-validation',
      checks: ['schema', 'statistics', 'anomalies']
    },
    {
      name: 'model-training',
      frameworks: ['pytorch', 'tensorflow', 'sklearn']
    },
    {
      name: 'model-evaluation',
      metrics: ['accuracy', 'precision', 'recall', 'f1']
    },
    {
      name: 'model-validation',
      checks: ['performance-threshold', 'fairness', 'explainability']
    },
    {
      name: 'model-packaging',
      formats: ['onnx', 'torchscript', 'savedmodel']
    },
    {
      name: 'deployment',
      strategies: ['canary', 'blue-green', 'shadow']
    }
  ]
};
```

### 3. Monitor Continuously

```typescript
class ComprehensiveMonitoring {
  async collectMetrics(): Promise<MLMetrics> {
    return {
      // Model performance
      accuracy: await this.computeAccuracy(),
      latency: await this.computeLatencyPercentiles(),
      
      // Data quality
      drift: await this.detectDrift(),
      missingValues: await this.computeMissingRates(),
      
      // System health
      gpuUtilization: await this.getGPUStats(),
      memoryUsage: await this.getMemoryStats(),
      
      // Business metrics
      predictionVolume: await this.getVolumeStats(),
      errorRate: await this.getErrorRate()
    };
  }
}
```

---

## Anti-Patterns

### ❌ Manual Model Deployment
```typescript
// ❌ Bad: Manual process
// 1. Export model locally
// 2. SCP to server
// 3. Restart service manually

// ✅ Good: Automated pipeline
await deploymentPipeline.deploy({
  model: trainedModel,
  environment: 'production',
  strategy: 'canary',
  rollbackOn: { errorRate: 0.05 }
});
```

### ❌ No Model Versioning
```typescript
// ❌ Bad: Overwriting models
fs.writeFileSync('model.pkl', model);

// ✅ Good: Versioned storage
await modelRegistry.register({
  model,
  version: '1.2.3',
  stage: 'production'
});
```

### ❌ Training-Serving Skew
```typescript
// ❌ Bad: Different preprocessing
// Training: scaler.fit_transform(X)
// Serving: X // No scaling!

// ✅ Good: Shared preprocessing
const preprocessing = await preprocessingRegistry.get(modelVersion);
const features = preprocessing.transform(rawFeatures);
const prediction = await model.predict(features);
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Model Accuracy** | >threshold | Core performance |
| **Prediction Latency (p99)** | <100ms | User experience |
| **Data Drift Score (PSI)** | <0.1 | Data stability |
| **Model Age** | <30 days | Freshness |
| **Training Frequency** | As needed | Responsiveness |
| **Inference Throughput** | Track trend | Scalability |
| **GPU/CPU Utilization** | 60-80% | Resource efficiency |
| **Error Rate** | <1% | Reliability |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **MLflow** | Experiment tracking, registry | Full MLOps platform |
| **Weights & Biases** | Experiment tracking | Research & collaboration |
| **Kubeflow** | ML on Kubernetes | K8s-native ML |
| **Seldon Core** | Model serving | K8s model deployment |
| **BentoML** | Model serving | Production serving |
| **Evidently AI** | Drift detection | Open-source monitoring |
| **WhyLabs** | ML monitoring | Managed monitoring |
| **Feast** | Feature store | Open-source feature store |
| **Tecton** | Feature store | Enterprise feature store |

---

## Implementation Checklist

### Infrastructure
- [ ] Model registry configured
- [ ] Training pipeline automated
- [ ] Serving infrastructure ready
- [ ] Monitoring stack deployed
- [ ] Feature store implemented

### CI/CD/CT
- [ ] Automated testing for ML code
- [ ] Model validation gates
- [ ] Automated deployment
- [ ] Rollback capability
- [ ] Continuous training triggers

### Monitoring
- [ ] Performance metrics collected
- [ ] Drift detection enabled
- [ ] Alerting configured
- [ ] Dashboards created
- [ ] Logging implemented

### Governance
- [ ] Model documentation required
- [ ] Approval workflows defined
- [ ] Audit trail enabled
- [ ] Access controls configured
- [ ] Compliance checks automated

---

## Related Skills

- **AI/LLM Integration**: `skills/stack/ai-llm-integration/ai_llm_integration_skill_v1/SKILL.md`
- **Agent Systems**: `skills/ai/agent-systems/agent_systems_v1/SKILL.md`
- **CI/CD Pipeline**: `skills/devops/cicd/cicd_pipeline_skill_v1/SKILL.md`
- **Kubernetes**: `skills/devops/kubernetes/kubernetes_skill_v1/SKILL.md`
- **Monitoring**: `skills/observability/metrics/metrics_skill_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
