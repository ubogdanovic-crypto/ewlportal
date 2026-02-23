
-- 1. Internal notes (ops-only, zero client access)
CREATE TABLE public.internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'worker', 'company')),
  entity_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Protek communication log (ops-only)
CREATE TABLE public.protek_communication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'phone', 'whatsapp', 'meeting', 'other')),
  subject TEXT DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  contact_person TEXT DEFAULT '',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protek_communication_log ENABLE ROW LEVEL SECURITY;

-- 4. RLS - ops/management only (zero client access)
CREATE POLICY "Ops/management can manage internal notes"
  ON public.internal_notes FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  );

CREATE POLICY "Ops/management can manage protek log"
  ON public.protek_communication_log FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  );

-- 5. Triggers
CREATE TRIGGER update_internal_notes_updated_at
  BEFORE UPDATE ON public.internal_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
