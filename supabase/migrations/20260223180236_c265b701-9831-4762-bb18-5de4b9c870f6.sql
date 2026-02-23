
-- Add SignWell tracking columns to worker_documents
ALTER TABLE public.worker_documents
  ADD COLUMN IF NOT EXISTS signwell_document_id text,
  ADD COLUMN IF NOT EXISTS signing_status text DEFAULT 'none';

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_worker_documents_signwell_id
  ON public.worker_documents (signwell_document_id)
  WHERE signwell_document_id IS NOT NULL;
