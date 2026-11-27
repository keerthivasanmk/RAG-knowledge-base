-- Conversations & Messages Schema for Persistent Chat History

-- 1. Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Messages table with citations stored as JSONB
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS messages_conv_id_idx ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS conversations_updated_idx ON conversations (updated_at DESC);

-- Permissions
GRANT ALL ON TABLE public.conversations TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.messages TO postgres, anon, authenticated, service_role;

-- Disable RLS for simple open portfolio access
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
