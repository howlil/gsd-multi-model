---
name: rag_systems_v1
description: Retrieval-Augmented Generation patterns, vector search, document chunking, hybrid search, and production RAG architecture
version: 1.0.0
tags: [ai, rag, retrieval-augmented-generation, vector-search, embeddings, semantic-search, llm]
category: ai
triggers:
  keywords: [rag, retrieval-augmented, vector search, semantic search, document search, knowledge retrieval]
  filePatterns: [rag/*.ts, retrieval/*.ts, vector-search/*.ts, knowledge-base/*.ts]
  commands: [rag implementation, vector search, semantic retrieval]
  projectArchetypes: [knowledge-base, qa-system, documentation-search, enterprise-search]
  modes: [greenfield, refactor, performance-optimization]
prerequisites:
  - ai_llm_integration_skill_v1
  - vector_database_skill_v1
  - caching_strategy_v1
recommended_structure:
  directories:
    - src/rag/
    - src/rag/indexing/
    - src/rag/retrieval/
    - src/rag/generation/
    - src/embeddings/
    - src/vector-store/
    - src/chunking/
workflow:
  setup:
    - Design document ingestion pipeline
    - Select embedding model and vector store
    - Define chunking strategy
    - Set up indexing workflow
  generate:
    - Implement document processors
    - Build embedding generation
    - Create retrieval mechanisms
    - Develop response generation
  test:
    - Retrieval accuracy tests
    - End-to-end RAG quality tests
    - Latency and throughput tests
    - Hallucination detection tests
best_practices:
  - Separate ingestion and query paths
  - Use tiered retrieval architecture
  - Implement hybrid search (semantic + keyword)
  - Apply semantic chunking over fixed-size
  - Add query decomposition for complex questions
  - Include reranking for better relevance
  - Cache frequent queries and results
  - Monitor retrieval quality metrics
anti_patterns:
  - Using fixed-size chunks without semantic boundaries
  - Retrieving too few or too many documents
  - No query preprocessing or decomposition
  - Skipping relevance reranking
  - Not handling missing knowledge gracefully
  - Ignoring latency in retrieval chain
  - No caching layer for repeated queries
tools:
  - LangChain / LlamaIndex
  - Pinecone / Weaviate / pgvector
  - OpenAI Embeddings / Cohere / Voyage AI
  - Cross-Encoder rerankers
  - Redis for caching
metrics:
  - Retrieval precision/recall
  - Mean Reciprocal Rank (MRR)
  - End-to-end latency (p50, p95, p99)
  - Token usage per query
  - Hallucination rate
  - Answer relevance score
  - Cache hit rate
---

# RAG Systems Skill

## Overview

This skill provides comprehensive guidance on building Retrieval-Augmented Generation (RAG) systems, including document ingestion, embedding generation, vector search, hybrid retrieval strategies, response generation, and production-scale architecture patterns.

RAG combines the power of large language models with external knowledge retrieval to provide accurate, up-to-date, and domain-specific responses while reducing hallucinations.

## When to Use

- **Domain-specific Q&A** requiring accurate, sourced information
- **Enterprise knowledge bases** with large document collections
- **Documentation search** with natural language queries
- **Customer support** with product/policy knowledge
- **Research assistance** with citation requirements
- **When LLM knowledge is outdated** or insufficient

## When NOT to Use

- **Simple factual queries** (use traditional search)
- **When 100% accuracy required** (RAG can still hallucinate)
- **Real-time requirements <100ms** (RAG adds latency)
- **Small knowledge bases** (<100 documents, use full context)
- **When source documents change constantly** (indexing overhead)

---

## Core Concepts

### 1. RAG Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     RAG SYSTEM ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INGESTION PIPELINE          QUERY PIPELINE                     │
│  ┌─────────────────┐        ┌─────────────────┐                │
│  │  Documents      │        │  User Query     │                │
│  │  (PDF, MD, etc) │        │                 │                │
│  └────────┬────────┘        └────────┬────────┘                │
│           │                          │                          │
│  ┌────────▼────────┐        ┌────────▼────────┐                │
│  │  Document       │        │  Query          │                │
│  │  Parser         │        │  Preprocessing  │                │
│  └────────┬────────┘        └────────┬────────┘                │
│           │                          │                          │
│  ┌────────▼────────┐        ┌────────▼────────┐                │
│  │  Chunking       │        │  Query          │                │
│  │  Strategy       │        │  Decomposition  │                │
│  └────────┬────────┘        └────────┬────────┘                │
│           │                          │                          │
│  ┌────────▼────────┐        ┌────────▼────────┐                │
│  │  Embedding      │        │  Vector         │                │
│  │  Generation     │        │  Search         │◄───────┐       │
│  └────────┬────────┘        └────────┬────────┘        │       │
│           │                          │                 │       │
│  ┌────────▼────────┐        ┌────────▼────────┐   ┌───▼───┐   │
│  │  Vector Store   │────────│  Hybrid         │   │ Cache │   │
│  │  (Index)        │        │  Retrieval      │   │       │   │
│  └─────────────────┘        └────────┬────────┘   └───────┘   │
│                                     │                          │
│                            ┌────────▼────────┐                │
│                            │  Re-ranking     │                │
│                            │  (Cross-Encoder)│                │
│                            └────────┬────────┘                │
│                                     │                          │
│                            ┌────────▼────────┐                │
│                            │  Context        │                │
│                            │  Assembly       │                │
│                            └────────┬────────┘                │
│                                     │                          │
│                            ┌────────▼────────┐                │
│                            │  LLM Generation │                │
│                            │  + Citations    │                │
│                            └────────┬────────┘                │
│                                     │                          │
│                            ┌────────▼────────┐                │
│                            │  Response       │                │
│                            │  (with sources) │                │
│                            └─────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Document Ingestion Pipeline

```typescript
interface Document {
  id: string;
  content: string;
  metadata: {
    source: string;
    type: 'pdf' | 'markdown' | 'html' | 'text';
    createdAt: Date;
    updatedAt: Date;
    tags?: string[];
    author?: string;
  };
}

interface Chunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  metadata: {
    chunkIndex: number;
    totalChunks: number;
    startOffset: number;
    endOffset: number;
    section?: string;
    subsection?: string;
  };
}

class IngestionPipeline {
  private parsers: Map<string, DocumentParser>;
  private chunker: ChunkingStrategy;
  private embedder: EmbeddingModel;
  private vectorStore: VectorStore;

  async ingest(document: Document): Promise<void> {
    // Parse document
    const parsed = await this.parsers
      .get(document.metadata.type)!
      .parse(document);

    // Chunk document
    const chunks = await this.chunker.chunk(parsed);

    // Generate embeddings
    const embeddedChunks = await this.embedder.embedMany(
      chunks.map(c => c.content)
    );

    // Store in vector database
    await this.vectorStore.upsert(
      chunks.map((chunk, i) => ({
        id: chunk.id,
        vector: embeddedChunks[i],
        metadata: {
          ...chunk.metadata,
          documentId: chunk.documentId,
          content: chunk.content
        }
      }))
    );
  }
}
```

### 3. Chunking Strategies

#### Fixed-Size Chunking (Basic)
```typescript
class FixedSizeChunker implements ChunkingStrategy {
  private chunkSize: number;
  private overlap: number;

  async chunk(document: Document): Promise<Chunk[]> {
    const chunks: Chunk[] = [];
    const tokens = tokenize(document.content);
    
    for (let i = 0; i < tokens.length; i += this.chunkSize - this.overlap) {
      const chunkTokens = tokens.slice(i, i + this.chunkSize);
      chunks.push({
        id: crypto.randomUUID(),
        documentId: document.id,
        content: detokenize(chunkTokens),
        metadata: {
          chunkIndex: chunks.length,
          startOffset: i,
          endOffset: i + chunkTokens.length
        }
      });
    }
    
    return chunks;
  }
}

// ⚠️ Problem: Cuts through semantic boundaries
```

#### Semantic Chunking (Recommended)
```typescript
class SemanticChunker implements ChunkingStrategy {
  private embedder: EmbeddingModel;
  private maxChunkSize: number;
  private similarityThreshold: number;

  async chunk(document: Document): Promise<Chunk[]> {
    // Split by natural boundaries (paragraphs, sections)
    const segments = this.splitByStructure(document.content);
    
    const chunks: Chunk[] = [];
    let currentChunk: string[] = [];
    let currentEmbedding: number[] | null = null;

    for (const segment of segments) {
      const segmentEmbedding = await this.embedder.embed(segment);
      
      if (currentChunk.length === 0) {
        currentChunk.push(segment);
        currentEmbedding = segmentEmbedding;
      } else {
        // Check similarity with current chunk
        const similarity = cosineSimilarity(
          segmentEmbedding,
          currentEmbedding!
        );

        if (similarity > this.similarityThreshold &&
            this.estimateTokens(currentChunk) + this.estimateTokens([segment]) <= this.maxChunkSize) {
          // Add to current chunk
          currentChunk.push(segment);
          // Update running embedding
          currentEmbedding = this.averageEmbeddings([currentEmbedding!, segmentEmbedding]);
        } else {
          // Start new chunk
          chunks.push(this.createChunk(document.id, currentChunk));
          currentChunk = [segment];
          currentEmbedding = segmentEmbedding;
        }
      }
    }

    // Don't forget last chunk
    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(document.id, currentChunk));
    }

    return chunks;
  }

  private splitByStructure(content: string): string[] {
    // Split by headers, paragraphs, or other semantic boundaries
    return content.split(/(?=^#{1,6}\s|^\n\n)/m).filter(s => s.trim().length > 0);
  }
}
```

#### Hierarchical Chunking
```typescript
class HierarchicalChunker implements ChunkingStrategy {
  async chunk(document: Document): Promise<Chunk[]> {
    // Create hierarchy: Document -> Sections -> Subsections -> Chunks
    const hierarchy = this.parseHierarchy(document.content);
    
    const chunks: Chunk[] = [];
    
    for (const section of hierarchy.sections) {
      for (const subsection of section.subsections) {
        const subsectionChunks = await this.chunkContent(subsection.content);
        
        for (const chunk of subsectionChunks) {
          chunks.push({
            ...chunk,
            documentId: document.id,
            metadata: {
              ...chunk.metadata,
              section: section.title,
              subsection: subsection.title
            }
          });
        }
      }
    }
    
    return chunks;
  }
}
```

### 4. Embedding Models

| Provider | Model | Dimensions | Use Case |
|----------|-------|------------|----------|
| **OpenAI** | text-embedding-3-large | 3072 | High accuracy |
| **OpenAI** | text-embedding-3-small | 1536 | Cost-effective |
| **Cohere** | embed-v3 | 1024 | Multilingual |
| **Voyage AI** | voyage-2 | 1536 | Long context |
| **HuggingFace** | BGE-large | 1024 | Self-hosted |

```typescript
class EmbeddingService {
  private client: LLMClient | CohereClient | HFClient;
  private cache: Cache;

  async embed(text: string): Promise<number[]> {
    // Check cache first
    const cached = await this.cache.get(`emb:${this.hash(text)}`);
    if (cached) return cached;

    const embedding = await this.client.embed(text);
    
    // Cache for 30 days
    await this.cache.set(`emb:${this.hash(text)}`, embedding, 30 * 24 * 60 * 60);
    
    return embedding;
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    // Batch embeddings for efficiency
    return await this.client.embedMany(texts, { batchSize: 100 });
  }

  private hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}
```

### 5. Retrieval Strategies

#### Basic Vector Search
```typescript
class VectorRetriever {
  private vectorStore: VectorStore;
  private embedder: EmbeddingService;

  async retrieve(query: string, topK: number = 5): Promise<RetrievedChunk[]> {
    const queryEmbedding = await this.embedder.embed(query);
    
    const results = await this.vectorStore.search({
      vector: queryEmbedding,
      topK,
      filter: {}
    });

    return results.map(r => ({
      id: r.id,
      content: r.metadata.content,
      score: r.score,
      metadata: r.metadata
    }));
  }
}
```

#### Hybrid Search (Semantic + Keyword)
```typescript
class HybridRetriever {
  private vectorRetriever: VectorRetriever;
  private keywordRetriever: KeywordRetriever;
  private fusionStrategy: 'rrf' | 'weighted' | 'reciprocal';

  async retrieve(query: string, topK: number = 10): Promise<RetrievedChunk[]> {
    // Run both retrievals in parallel
    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorRetriever.retrieve(query, topK * 2),
      this.keywordRetriever.retrieve(query, topK * 2)
    ]);

    // Fuse results
    return this.fuse(vectorResults, keywordResults, topK);
  }

  private fuse(vector: RetrievedChunk[], keyword: RetrievedChunk[], topK: number): RetrievedChunk[] {
    if (this.fusionStrategy === 'rrf') {
      return this.reciprocalRankFusion(vector, keyword, topK);
    }
    
    // Weighted combination
    const combined = new Map<string, { chunk: RetrievedChunk; score: number }>();
    
    for (const [i, v] of vector.entries()) {
      combined.set(v.id, {
        chunk: v,
        score: v.score * 0.7 // 70% weight to semantic
      });
    }
    
    for (const k of keyword) {
      const existing = combined.get(k.id);
      if (existing) {
        existing.score += k.score * 0.3; // 30% weight to keyword
      } else {
        combined.set(k.id, { chunk: k, score: k.score * 0.3 });
      }
    }
    
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(x => x.chunk);
  }

  private reciprocalRankFusion(vector: RetrievedChunk[], keyword: RetrievedChunk[], topK: number): RetrievedChunk[] {
    const scores = new Map<string, number>();
    const chunks = new Map<string, RetrievedChunk>();

    for (const [i, v] of vector.entries()) {
      scores.set(v.id, (scores.get(v.id) || 0) + 1 / (i + 60));
      chunks.set(v.id, v);
    }

    for (const [i, k] of keyword.entries()) {
      scores.set(k.id, (scores.get(k.id) || 0) + 1 / (i + 60));
      chunks.set(k.id, k);
    }

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([id, score]) => ({ ...chunks.get(id)!, score }));
  }
}
```

#### Tiered Retrieval (Production Pattern)
```typescript
class TieredRetriever {
  private fastRetriever: FastRetriever; // Simple, fast
  private accurateRetriever: AccurateRetriever; // Thorough, slower
  private router: QueryRouter;

  async retrieve(query: string): Promise<RetrievedChunk[]> {
    // Route query based on complexity
    const complexity = await this.router.classify(query);
    
    if (complexity === 'simple') {
      // Use fast retriever only
      return await this.fastRetriever.retrieve(query, 5);
    } else if (complexity === 'moderate') {
      // Use accurate retriever
      return await this.accurateRetriever.retrieve(query, 10);
    } else {
      // Complex: multi-step retrieval
      return await this.complexRetrieval(query);
    }
  }

  private async complexRetrieval(query: string): Promise<RetrievedChunk[]> {
    // Decompose query
    const subQueries = await this.decomposeQuery(query);
    
    // Retrieve for each sub-query in parallel
    const allResults = await Promise.all(
      subQueries.map(q => this.accurateRetriever.retrieve(q, 5))
    );
    
    // Deduplicate and rerank
    const combined = this.deduplicate(allResults.flat());
    return await this.rerank(query, combined);
  }
}
```

### 6. Query Decomposition

```typescript
class QueryDecomposer {
  private llm: LLMClient;

  async decompose(query: string): Promise<string[]> {
    const prompt = `
Decompose this complex question into 2-5 simpler sub-questions.
Each sub-question should be answerable independently.

Original question: ${query}

Sub-questions (one per line):
`;

    const response = await this.llm.generate(prompt);
    return response.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim());
  }
}

// Example:
// Input: "How does the authentication system handle OAuth2 refresh tokens and what are the security implications?"
// Output:
// - "How does the authentication system handle OAuth2 refresh tokens?"
// - "What are the security implications of OAuth2 refresh tokens?"
```

### 7. Re-ranking

```typescript
class Reranker {
  private crossEncoder: CrossEncoderModel;

  async rerank(query: string, chunks: RetrievedChunk[], topK: number = 5): Promise<RetrievedChunk[]> {
    // Score each chunk with cross-encoder
    const scores = await this.crossEncoder.predict(
      chunks.map(c => [query, c.content])
    );

    // Attach scores and sort
    const scored = chunks.map((chunk, i) => ({
      ...chunk,
      score: scores[i]
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

// Cross-encoder models:
// - BGE-reranker-large
// - Cohere rerank
// - Jina-reranker
```

### 8. Response Generation

```typescript
class RAGGenerator {
  private llm: LLMClient;
  private citationFormatter: CitationFormatter;

  async generate(query: string, chunks: RetrievedChunk[]): Promise<RAGResponse> {
    const context = this.assembleContext(chunks);
    
    const prompt = `
You are a helpful assistant answering questions based on the provided context.

CONTEXT:
${context}

INSTRUCTIONS:
- Answer based ONLY on the provided context
- If the answer is not in the context, say "I don't have enough information"
- Include citations [1], [2], etc. for each claim
- Be concise but complete

QUESTION: ${query}

ANSWER:
`;

    const response = await this.llm.generate(prompt, {
      temperature: 0.3, // Lower temperature for factual accuracy
      maxTokens: 1000
    });

    return {
      query,
      answer: response.text,
      sources: chunks.map(c => ({
        id: c.id,
        content: c.content,
        metadata: c.metadata
      })),
      citations: this.extractCitations(response.text, chunks)
    };
  }

  private assembleContext(chunks: RetrievedChunk[]): string {
    return chunks.map((chunk, i) => 
      `[${i + 1}] ${chunk.content}`
    ).join('\n\n---\n\n');
  }
}
```

---

## Best Practices

### 1. Separate Ingestion and Query Paths

```typescript
// ✅ Good: Separate concerns
class RAGSystem {
  private ingestionPipeline: IngestionPipeline;
  private queryPipeline: QueryPipeline;

  // Ingestion: Optimized for throughput
  async indexDocuments(documents: Document[]): Promise<void> {
    await this.ingestionPipeline.processBatch(documents, {
      batchSize: 100,
      parallelism: 10
    });
  }

  // Query: Optimized for latency
  async query(question: string): Promise<RAGResponse> {
    return await this.queryPipeline.execute(question, {
      timeout: 5000,
      cache: true
    });
  }
}
```

### 2. Implement Query Caching

```typescript
class CachedRAG {
  private cache: RedisCache;
  private rag: RAGSystem;

  async query(question: string): Promise<RAGResponse> {
    const cacheKey = `rag:query:${this.hash(question)}`;
    
    // Check cache (TTL: 1 hour)
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.rag.query(question);
    
    // Cache successful results
    await this.cache.set(cacheKey, JSON.stringify(result), 3600);
    
    return result;
  }
}
```

### 3. Monitor Retrieval Quality

```typescript
class RAGMetrics {
  private precision: Metric;
  private recall: Metric;
  private mrr: Metric; // Mean Reciprocal Rank
  private latency: Histogram;

  async evaluateRetrieval(
    query: string,
    retrieved: RetrievedChunk[],
    relevant: string[] // Ground truth
  ): Promise<RetrievalMetrics> {
    const precision = this.calculatePrecision(retrieved, relevant);
    const recall = this.calculateRecall(retrieved, relevant);
    const mrr = this.calculateMRR(retrieved, relevant);

    return { precision, recall, mrr };
  }

  private calculateMRR(retrieved: RetrievedChunk[], relevant: string[]): number {
    for (const [i, chunk] of retrieved.entries()) {
      if (relevant.includes(chunk.id)) {
        return 1 / (i + 1);
      }
    }
    return 0;
  }
}
```

### 4. Handle Missing Knowledge Gracefully

```typescript
class SafeRAGGenerator {
  async generate(query: string, chunks: RetrievedChunk[]): Promise<RAGResponse> {
    // Check if retrieved content is relevant
    const relevanceScore = await this.assessRelevance(query, chunks);
    
    if (relevanceScore < 0.3) {
      return {
        query,
        answer: "I don't have enough information to answer this question accurately.",
        sources: [],
        confidence: 'low'
      };
    }

    // Proceed with generation
    return await this.generateWithConfidence(query, chunks);
  }

  private async assessRelevance(query: string, chunks: RetrievedChunk[]): Promise<number> {
    // Use LLM to assess if retrieved content is relevant
    const prompt = `
Rate the relevance of the retrieved content to the query (0-1):
Query: ${query}
Content: ${chunks.map(c => c.content).join(' ')}
Relevance score:
`;
    const response = await this.llm.generate(prompt, { temperature: 0 });
    return parseFloat(response.text) || 0;
  }
}
```

---

## Anti-Patterns

### ❌ Fixed-Size Chunking Without Semantic Boundaries
```typescript
// ❌ Bad: Cuts through meaning
const chunks = text.match(/.{1,500}/g);

// ✅ Good: Respect semantic boundaries
const chunks = await semanticChunker.chunk(text);
```

### ❌ No Re-ranking
```typescript
// ❌ Bad: Raw vector search results
const results = await vectorStore.search(query, 10);
return generate(query, results);

// ✅ Good: Re-rank for better relevance
const results = await vectorStore.search(query, 20);
const reranked = await reranker.rerank(query, results, 10);
return generate(query, reranked);
```

### ❌ Retrieving Too Few/Many Documents
```typescript
// ❌ Bad: Arbitrary topK
const results = await retrieve(query, 3); // Too few
const results = await retrieve(query, 50); // Too many, noisy

// ✅ Good: Tune based on evaluation
const results = await retrieve(query, 5-10); // Sweet spot for most cases
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Retrieval Precision@K** | >0.7 | Result relevance |
| **Mean Reciprocal Rank** | >0.6 | First relevant result position |
| **End-to-End Latency (p95)** | <3s | User experience |
| **Answer Relevance Score** | >0.8 | Quality of responses |
| **Hallucination Rate** | <5% | Accuracy |
| **Cache Hit Rate** | >30% | Efficiency |
| **Token Usage per Query** | Track trend | Cost control |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **LangChain** | RAG orchestration | Full-featured RAG |
| **LlamaIndex** | Data indexing | Enterprise RAG |
| **Pinecone** | Vector database | Managed vector search |
| **Weaviate** | Vector database | Self-hosted option |
| **pgvector** | Vector database | PostgreSQL integration |
| **Cohere** | Embeddings + Rerank | All-in-one API |
| **Voyage AI** | Embeddings | Long context |
| **Redis** | Caching | Query/result caching |

---

## Implementation Checklist

### Ingestion Pipeline
- [ ] Document parsers implemented
- [ ] Semantic chunking strategy selected
- [ ] Embedding model chosen
- [ ] Vector store configured
- [ ] Indexing workflow automated

### Query Pipeline
- [ ] Query preprocessing implemented
- [ ] Hybrid search configured
- [ ] Re-ranking enabled
- [ ] Context assembly optimized
- [ ] Response generation with citations

### Quality & Performance
- [ ] Retrieval evaluation framework
- [ ] Latency monitoring
- [ ] Cache layer implemented
- [ ] Hallucination detection
- [ ] A/B testing framework

### Production Readiness
- [ ] Monitoring dashboards
- [ ] Alerting configured
- [ ] Cost tracking enabled
- [ ] Documentation complete
- [ ] Runbooks created

---

## Related Skills

- **AI/LLM Integration**: `skills/stack/ai-llm-integration/ai_llm_integration_skill_v1/SKILL.md`
- **Agent Systems**: `skills/ai/agent-systems/agent_systems_v1/SKILL.md`
- **Vector Database**: `skills/stack/vector-database/`
- **Caching Strategy**: `skills/architecture/caching-strategy/caching_strategy_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
