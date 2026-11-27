-- Supabase Schema for RAG Knowledge Base
-- Enables pgvector, creates tables, and provides cosine similarity search function.

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Documents table (metadata and processing status)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'ready', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Document chunks table (stores chunk text and 768-dim vector embeddings from Gemini text-embedding-004)
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  page_number INTEGER NOT NULL DEFAULT 1,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(768) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. HNSW Index for ultra-fast cosine similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- Index on document_id for rapid cascade deletes and filtering
CREATE INDEX IF NOT EXISTS document_chunks_doc_id_idx 
ON document_chunks (document_id);

-- 5. Semantic Search Function (RPC)
-- Uses cosine distance operator (<=>).
-- Cosine similarity = 1 - (embedding <=> query_embedding)
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5,
  filter_document_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  document_name TEXT,
  content TEXT,
  page_number INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    d.name AS document_name,
    dc.content,
    dc.page_number,
    (1 - (dc.embedding <=> query_embedding)) AS similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE (1 - (dc.embedding <=> query_embedding)) > match_threshold
    AND (filter_document_id IS NULL OR dc.document_id = filter_document_id)
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;


-- 6. Grant privileges to Supabase API roles
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.documents TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.document_chunks TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Ensure RLS does not block queries without auth
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks DISABLE ROW LEVEL SECURITY;
