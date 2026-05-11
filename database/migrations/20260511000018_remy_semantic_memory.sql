-- Enable pgvector extension for semantic similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to remy_memories for semantic retrieval
ALTER TABLE remy_memories ADD COLUMN embedding vector(768);

-- HNSW index for fast cosine similarity search (only active memories)
CREATE INDEX idx_remy_memories_embedding
  ON remy_memories USING hnsw (embedding vector_cosine_ops)
  WHERE is_active = true;

-- RAG chunks table for broader semantic search across entity types
CREATE TABLE rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT,
  chunk_text TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rag_chunks_embedding ON rag_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_rag_chunks_tenant ON rag_chunks (tenant_id, source_type);
