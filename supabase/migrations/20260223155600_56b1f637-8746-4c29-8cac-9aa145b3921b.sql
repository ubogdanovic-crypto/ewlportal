
-- Notifications log table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID,
  notification_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Ops/management can see all notifications
CREATE POLICY "Ops/management can manage notifications"
ON public.notifications FOR ALL
USING (has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'management'::app_role))
WITH CHECK (has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'management'::app_role));

-- Users can see their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (recipient_user_id = auth.uid());
