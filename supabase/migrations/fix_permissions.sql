-- Grant full access to service_role, anon, and authenticated roles
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON TABLE public.documents TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.document_chunks TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Ensure Row Level Security is disabled for open portfolio access
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks DISABLE ROW LEVEL SECURITY;
