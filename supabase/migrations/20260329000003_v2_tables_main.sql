-- =============================================================================
-- EWL Portal V2 — Step 2: New tables, functions, and RLS policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 2. Partner Agencies
-- ---------------------------------------------------------------------------
CREATE TABLE public.partner_agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partner_agencies ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_partner_agencies_updated_at
  BEFORE UPDATE ON public.partner_agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 3. Add partner_agency_id to orders and profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS partner_agency_id UUID REFERENCES public.partner_agencies(id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS partner_agency_id UUID REFERENCES public.partner_agencies(id),
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_orders_partner ON public.orders(partner_agency_id);

-- ---------------------------------------------------------------------------
-- 4. Partner helper function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_partner_agency_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT partner_agency_id FROM public.profiles WHERE user_id = _user_id;
$$;

-- ---------------------------------------------------------------------------
-- 5. Partner RLS policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Partners see own agency"
  ON public.partner_agencies FOR SELECT
  USING (
    has_role(auth.uid(), 'partner') AND
    id = get_user_partner_agency_id(auth.uid())
  );

CREATE POLICY "Ops and management manage partner agencies"
  ON public.partner_agencies FOR ALL
  USING (has_role(auth.uid(), 'ops') OR has_role(auth.uid(), 'management'));

CREATE POLICY "Partners see assigned orders"
  ON public.orders FOR SELECT
  USING (
    has_role(auth.uid(), 'partner') AND
    partner_agency_id = get_user_partner_agency_id(auth.uid())
  );

CREATE POLICY "Partners see workers for assigned orders"
  ON public.workers FOR SELECT
  USING (
    has_role(auth.uid(), 'partner') AND
    order_id IN (
      SELECT id FROM public.orders
      WHERE partner_agency_id = get_user_partner_agency_id(auth.uid())
    )
  );

CREATE POLICY "Partners can submit candidates"
  ON public.workers FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'partner') AND
    order_id IN (
      SELECT id FROM public.orders
      WHERE partner_agency_id = get_user_partner_agency_id(auth.uid())
    )
  );

CREATE POLICY "Partners upload candidate documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'worker-documents' AND
    has_role(auth.uid(), 'partner')
  );

-- ---------------------------------------------------------------------------
-- 6. Leads (CRM)
-- ---------------------------------------------------------------------------
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  source TEXT NOT NULL DEFAULT 'other'
    CHECK (source IN ('referral', 'cold', 'event', 'website', 'partner', 'other')),
  status TEXT NOT NULL DEFAULT 'cold'
    CHECK (status IN ('cold', 'warm', 'hot', 'negotiating', 'won', 'lost')),
  owner_id UUID REFERENCES auth.users(id),
  estimated_workers INTEGER,
  estimated_revenue_eur NUMERIC(10,2),
  next_action TEXT,
  next_action_date DATE,
  notes TEXT,
  lost_reason TEXT,
  converted_company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_owner ON public.leads(owner_id);
CREATE INDEX idx_leads_next_action_date ON public.leads(next_action_date);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE POLICY "Ops and management manage leads"
  ON public.leads FOR ALL
  USING (has_role(auth.uid(), 'ops') OR has_role(auth.uid(), 'management'));

-- ---------------------------------------------------------------------------
-- 7. Lead Activities
-- ---------------------------------------------------------------------------
CREATE TABLE public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL
    CHECK (activity_type IN ('call', 'meeting', 'email', 'whatsapp', 'note')),
  content TEXT NOT NULL,
  outcome TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lead_activities_lead ON public.lead_activities(lead_id);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops and management manage lead activities"
  ON public.lead_activities FOR ALL
  USING (has_role(auth.uid(), 'ops') OR has_role(auth.uid(), 'management'));

-- ---------------------------------------------------------------------------
-- 8. Tasks
-- ---------------------------------------------------------------------------
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT CHECK (entity_type IN ('lead', 'order', 'worker', 'company', 'general')),
  entity_id UUID,
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to) WHERE status NOT IN ('done', 'cancelled');
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date) WHERE status NOT IN ('done', 'cancelled');
CREATE INDEX idx_tasks_entity ON public.tasks(entity_type, entity_id);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE POLICY "Users see own tasks"
  ON public.tasks FOR SELECT
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Ops and management manage all tasks"
  ON public.tasks FOR ALL
  USING (has_role(auth.uid(), 'ops') OR has_role(auth.uid(), 'management'));

CREATE POLICY "Authenticated users create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update own tasks"
  ON public.tasks FOR UPDATE
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- 9. Automation Rules
-- ---------------------------------------------------------------------------
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL
    CHECK (trigger_type IN ('stage_change', 'document_status', 'signing_status', 'schedule')),
  trigger_condition JSONB NOT NULL,
  action_type TEXT NOT NULL
    CHECK (action_type IN ('change_stage', 'send_notification', 'create_task', 'send_email')),
  action_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE POLICY "Management manages automation rules"
  ON public.automation_rules FOR ALL
  USING (has_role(auth.uid(), 'management'));

CREATE POLICY "All authenticated read active rules"
  ON public.automation_rules FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 10. SLA fields on pipeline_stage_config
-- ---------------------------------------------------------------------------
ALTER TABLE public.pipeline_stage_config
  ADD COLUMN IF NOT EXISTS expected_duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS sla_warning_days INTEGER;

-- ---------------------------------------------------------------------------
-- 11. Enable realtime for new tables
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
