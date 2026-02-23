
-- 1. Pipeline stage enum (14 stages)
CREATE TYPE public.pipeline_stage AS ENUM (
  'sourcing',
  'cv_screening',
  'cv_sent_to_client',
  'client_review',
  'interview_scheduled',
  'interview_completed',
  'approved_by_client',
  'documents_collection',
  'document_generation',
  'documents_signed',
  'visa_application',
  'police_interview',
  'visa_approved',
  'arrived'
);

-- 2. Worker status
CREATE TYPE public.worker_status AS ENUM ('active', 'rejected', 'withdrawn', 'completed');

-- 3. Workers table
CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Personal info
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  date_of_birth DATE,
  nationality TEXT DEFAULT '',
  passport_number TEXT DEFAULT '',
  passport_expiry DATE,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  
  -- Pipeline
  current_stage pipeline_stage NOT NULL DEFAULT 'sourcing',
  status worker_status NOT NULL DEFAULT 'active',
  
  -- Flags
  flag_euprava BOOLEAN DEFAULT false,
  flag_visa_delay BOOLEAN DEFAULT false,
  flag_custom TEXT DEFAULT '',
  visa_delay_estimate TEXT DEFAULT '',
  
  -- Review
  rejection_reason TEXT DEFAULT '',
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Files
  cv_url TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Pipeline stage history (immutable audit trail)
CREATE TABLE public.pipeline_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  from_stage pipeline_stage,
  to_stage pipeline_stage NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stage_history ENABLE ROW LEVEL SECURITY;

-- 6. Workers RLS
-- Clients see workers assigned to their company's orders
CREATE POLICY "Clients can view own company workers"
  ON public.workers FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- Ops/management see all workers
CREATE POLICY "Ops/management can view all workers"
  ON public.workers FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  );

-- Ops/management can manage workers
CREATE POLICY "Ops/management can manage workers"
  ON public.workers FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  );

-- Clients can update workers (for approve/reject)
CREATE POLICY "Clients can update own company workers"
  ON public.workers FOR UPDATE
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- 7. Pipeline history RLS
CREATE POLICY "Clients can view own company worker history"
  ON public.pipeline_stage_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workers w
      WHERE w.id = worker_id
      AND w.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Ops/management can view all history"
  ON public.pipeline_stage_history FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  );

CREATE POLICY "Ops/management can insert history"
  ON public.pipeline_stage_history FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  );

-- Clients can insert history (for approve/reject actions)
CREATE POLICY "Clients can insert history for own workers"
  ON public.pipeline_stage_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workers w
      WHERE w.id = worker_id
      AND w.company_id = public.get_user_company_id(auth.uid())
    )
  );

-- 8. Triggers
CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.workers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_stage_history;
