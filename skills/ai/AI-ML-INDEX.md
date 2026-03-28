# AI/ML Skills Index

**Version:** 1.0
**Category:** ai

## Overview

AI/ML skills provide comprehensive guidance on building production AI systems, including LLM integration, multi-agent architectures, RAG systems, MLOps, and prompt engineering for modern AI-powered applications.

## Available AI/ML Skills

| Skill | Directory | Focus Area | Status |
|-------|-----------|------------|--------|
| **LLM Integration** | `ai-llm-integration/ai_llm_integration_skill_v1/` | LLM APIs, RAG, embeddings | ✅ Complete |
| **Agent Systems** | `agent-systems/agent_systems_v1/` | Multi-agent architecture, orchestration | ✅ Complete |
| **RAG Systems** | `rag-systems/rag_systems_v1/` | Retrieval-Augmented Generation, vector search | ✅ Complete |
| **MLOps** | `mlops/mlops_v1/` | ML pipelines, deployment, monitoring | ✅ Complete |
| **Prompt Engineering** | `prompt-engineering/prompt_engineering_v1/` | Prompt design, optimization | 📁 Directory Ready |

## AI/ML Skill Categories

### Foundation
- **LLM Integration**: Core patterns for integrating Large Language Models
- **Prompt Engineering**: Systematic prompt design and optimization

### Advanced
- **Agent Systems**: Multi-agent architecture and orchestration
- **RAG Systems**: Retrieval-Augmented Generation for domain knowledge

### Operations
- **MLOps**: Production ML operations, monitoring, and deployment

## Usage

```javascript
const { SkillRegistry } = require('./ez-agents/bin/lib/skill-registry');
const registry = new SkillRegistry();
await registry.load();

// Get all AI/ML skills
const aiSkills = registry.findByCategory('ai');

// Get specific skill
const agentSkill = registry.get('agent_systems_v1');
const ragSkill = registry.get('rag_systems_v1');
```

## Related Categories

- **Stack Skills**: `stack/README.md` (framework-specific AI integration)
- **Data Engineering**: `data/DATA-ENGINEERING-INDEX.md` (data pipelines for ML)
- **DevOps**: `devops/DEVOPS-INDEX.md` (infrastructure for ML)
- **Observability**: `observability/OBSERVABILITY-INDEX.md` (ML monitoring)

---

**Last Updated:** March 29, 2026
**Total Skills:** 4 Complete, 1 Directory Ready
