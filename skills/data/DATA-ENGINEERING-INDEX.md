# Data Engineering Skills Index

**Version:** 1.0
**Category:** data

## Overview

Data Engineering skills provide comprehensive guidance on building data pipelines, stream processing, data modeling, and data quality systems for modern data platforms.

## Available Data Engineering Skills

| Skill | Directory | Focus Area | Status |
|-------|-----------|------------|--------|
| **Data Pipeline** | `data-pipeline/data_pipeline_v1/` | ETL/ELT, orchestration, ingestion | ✅ Complete |
| **Stream Processing** | `stream-processing/stream_processing_v1/` | Real-time processing, event streaming | ✅ Complete |
| **Data Modeling** | `data-modeling/data_modeling_v1/` | Dimensional modeling, schema design | ✅ Complete |
| **Data Quality** | `data-quality/data_quality_v1/` | Validation, profiling, monitoring | ✅ Complete |
| **Data Warehouse** | `data-warehouse/data_warehouse_v1/` | Warehouse architecture, optimization | 📁 Directory Ready |
| **Data Lake** | `data-lake/data_lake_v1/` | Lake architecture, medallion design | 📁 Directory Ready |

## Data Engineering Skill Categories

### Pipeline & Processing
- **Data Pipeline**: Batch and streaming data movement
- **Stream Processing**: Real-time event processing

### Design & Architecture
- **Data Modeling**: Schema design for OLTP and OLAP
- **Data Warehouse**: Analytics-optimized storage
- **Data Lake**: Scalable data storage

### Quality & Governance
- **Data Quality**: Validation, monitoring, anomaly detection

## Data Engineering Workflow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Ingest    │───>│  Transform  │───>│    Load     │───>│   Serve     │
│             │    │             │    │             │    │             │
│ - Batch     │    │ - Clean     │    │ - Warehouse │    │ - BI        │
│ - Stream    │    │ - Enrich    │    │ - Lake      │    │ - ML        │
│ - CDC       │    │ - Aggregate │    │ - Marts     │    │ - API       │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       v                  v                  v                  v
┌─────────────────────────────────────────────────────────────────────────┐
│                         Data Quality                                     │
│  - Completeness  - Accuracy  - Timeliness  - Consistency  - Validity    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Usage

```javascript
const { SkillRegistry } = require('./ez-agents/bin/lib/skill-registry');
const registry = new SkillRegistry();
await registry.load();

// Get all Data Engineering skills
const dataSkills = registry.findByCategory('data');

// Get specific skill
const pipelineSkill = registry.get('data_pipeline_v1');
const streamSkill = registry.get('stream_processing_v1');
const modelingSkill = registry.get('data_modeling_v1');
```

## Tool Ecosystem

| Category | Tools |
|----------|-------|
| **Orchestration** | Airflow, Dagster, Prefect |
| **Batch Processing** | Spark, dbt, SQL |
| **Stream Processing** | Flink, Kafka Streams, Spark Streaming |
| **Storage** | Snowflake, BigQuery, Redshift, Delta Lake |
| **Quality** | Great Expectations, Soda, dbt tests |

## Related Categories

- **AI/ML**: `ai/AI-ML-INDEX.md` (ML data pipelines)
- **DevOps**: `devops/DEVOPS-INDEX.md` (infrastructure)
- **Architecture**: `architecture/ARCHITECTURE-INDEX.md` (data architecture)
- **Observability**: `observability/OBSERVABILITY-INDEX.md` (data monitoring)

---

**Last Updated:** March 29, 2026
**Total Skills:** 4 Complete, 2 Directory Ready
