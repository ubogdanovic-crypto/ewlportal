
-- Add notification_preferences JSONB column to profiles
ALTER TABLE public.profiles
ADD COLUMN notification_preferences jsonb NOT NULL DEFAULT '{"order_status": true, "worker_pipeline": true, "document_signing": true, "police_interview": true}'::jsonb;

-- Add UPDATE policy for clients on their own company
CREATE POLICY "Clients can update own company"
ON public.companies
FOR UPDATE
USING (id = get_user_company_id(auth.uid()))
WITH CHECK (id = get_user_company_id(auth.uid()));
