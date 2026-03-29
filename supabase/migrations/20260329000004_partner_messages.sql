-- Partner messaging system
CREATE TABLE public.partner_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  attachment_path TEXT,
  attachment_name TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_partner_messages_order ON public.partner_messages(order_id);
CREATE INDEX idx_partner_messages_created ON public.partner_messages(order_id, created_at);

ALTER TABLE public.partner_messages ENABLE ROW LEVEL SECURITY;

-- Partners see messages for their assigned orders
CREATE POLICY "Partners see messages for assigned orders"
  ON public.partner_messages FOR SELECT
  USING (
    has_role(auth.uid(), 'partner') AND
    order_id IN (
      SELECT id FROM public.orders
      WHERE partner_agency_id = get_user_partner_agency_id(auth.uid())
    )
  );

-- Partners can send messages for their assigned orders
CREATE POLICY "Partners send messages for assigned orders"
  ON public.partner_messages FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'partner') AND
    sender_id = auth.uid() AND
    order_id IN (
      SELECT id FROM public.orders
      WHERE partner_agency_id = get_user_partner_agency_id(auth.uid())
    )
  );

-- Ops and management see and send all messages
CREATE POLICY "Ops and management manage messages"
  ON public.partner_messages FOR ALL
  USING (has_role(auth.uid(), 'ops') OR has_role(auth.uid(), 'management'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_messages;
