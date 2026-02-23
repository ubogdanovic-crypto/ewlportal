
-- Create storage bucket for worker documents
INSERT INTO storage.buckets (id, name, public) VALUES ('worker-documents', 'worker-documents', false);

-- Storage policies: ops/management can manage all files
CREATE POLICY "Ops/management can upload worker documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'worker-documents' AND (has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'management'::app_role)));

CREATE POLICY "Ops/management can view worker documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'worker-documents' AND (has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'management'::app_role)));

CREATE POLICY "Ops/management can delete worker documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'worker-documents' AND (has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'management'::app_role)));

CREATE POLICY "Ops/management can update worker documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'worker-documents' AND (has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'management'::app_role)));

-- Clients can view documents for their own company's workers
CREATE POLICY "Clients can view own company worker documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'worker-documents' AND
  EXISTS (
    SELECT 1 FROM workers w
    WHERE w.id::text = (storage.foldername(name))[1]
    AND w.company_id = get_user_company_id(auth.uid())
  )
);

-- Document checklist table
CREATE TABLE public.worker_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  label TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'verified', 'rejected')),
  file_path TEXT,
  file_name TEXT,
  file_size BIGINT,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  uploaded_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.worker_documents ENABLE ROW LEVEL SECURITY;

-- Ops/management full access
CREATE POLICY "Ops/management can manage worker documents"
ON public.worker_documents FOR ALL
USING (has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'management'::app_role))
WITH CHECK (has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'management'::app_role));

-- Clients can view their company's worker documents
CREATE POLICY "Clients can view own company worker documents"
ON public.worker_documents FOR SELECT
USING (EXISTS (
  SELECT 1 FROM workers w
  WHERE w.id = worker_documents.worker_id
  AND w.company_id = get_user_company_id(auth.uid())
));

-- Timestamp trigger
CREATE TRIGGER update_worker_documents_updated_at
BEFORE UPDATE ON public.worker_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_documents;
