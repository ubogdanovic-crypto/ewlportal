
-- B1: Pipeline Stage Configuration table
CREATE TABLE public.pipeline_stage_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_key text NOT NULL UNIQUE,
  label_sr text NOT NULL DEFAULT '',
  label_en text NOT NULL DEFAULT '',
  client_visible boolean NOT NULL DEFAULT true,
  color text DEFAULT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_stage_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops/management can manage pipeline config"
ON public.pipeline_stage_config FOR ALL
USING (has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'management'::app_role))
WITH CHECK (has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'management'::app_role));

CREATE POLICY "All authenticated can view pipeline config"
ON public.pipeline_stage_config FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Seed default pipeline stages
INSERT INTO public.pipeline_stage_config (stage_key, label_sr, label_en, client_visible, sort_order) VALUES
  ('sourcing', 'Pretraga', 'Sourcing', false, 1),
  ('cv_screening', 'Pregled CV-a', 'CV Screening', false, 2),
  ('cv_sent_to_client', 'CV poslat klijentu', 'CV Sent to Client', true, 3),
  ('client_review', 'Pregled klijenta', 'Client Review', true, 4),
  ('interview_scheduled', 'Intervju zakazan', 'Interview Scheduled', true, 5),
  ('interview_completed', 'Intervju završen', 'Interview Completed', true, 6),
  ('approved_by_client', 'Odobren od klijenta', 'Approved by Client', true, 7),
  ('documents_collection', 'Prikupljanje dokumenata', 'Documents Collection', true, 8),
  ('document_generation', 'Generisanje dokumenata', 'Document Generation', false, 9),
  ('documents_signed', 'Dokumenti potpisani', 'Documents Signed', true, 10),
  ('visa_application', 'Apliciranje za vizu', 'Visa Application', true, 11),
  ('police_interview', 'Policijski intervju', 'Police Interview', true, 12),
  ('visa_approved', 'Viza odobrena', 'Visa Approved', true, 13),
  ('arrived', 'Stigao u Srbiju', 'Arrived in Serbia', true, 14);

-- Trigger for updated_at
CREATE TRIGGER update_pipeline_stage_config_updated_at
BEFORE UPDATE ON public.pipeline_stage_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- B2: Email Templates table
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_event text NOT NULL,
  lang text NOT NULL CHECK (lang IN ('sr', 'en')),
  subject text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trigger_event, lang)
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops/management can manage email templates"
ON public.email_templates FOR ALL
USING (has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'management'::app_role))
WITH CHECK (has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'management'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default email template trigger events
INSERT INTO public.email_templates (trigger_event, lang, subject, body_html) VALUES
  ('new_order_received', 'sr', 'Nova narudžbina primljena', '<p>Poštovani, nova narudžbina {{order_ref}} je primljena od {{company_name}}.</p>'),
  ('new_order_received', 'en', 'New Order Received', '<p>A new order {{order_ref}} has been received from {{company_name}}.</p>'),
  ('order_status_changed', 'sr', 'Promena statusa narudžbine', '<p>Status narudžbine {{order_ref}} je promenjen na {{status}}.</p>'),
  ('order_status_changed', 'en', 'Order Status Changed', '<p>Order {{order_ref}} status has been changed to {{status}}.</p>'),
  ('worker_stage_changed', 'sr', 'Promena faze radnika', '<p>Radnik {{worker_name}} je prešao u fazu {{stage_name}}.</p>'),
  ('worker_stage_changed', 'en', 'Worker Stage Changed', '<p>Worker {{worker_name}} has moved to stage {{stage_name}}.</p>'),
  ('documents_ready', 'sr', 'Dokumenti spremni za potpisivanje', '<p>Dokumenti za radnika {{worker_name}} su spremni za potpisivanje.</p>'),
  ('documents_ready', 'en', 'Documents Ready for Signing', '<p>Documents for worker {{worker_name}} are ready for signing.</p>'),
  ('police_interview_scheduled', 'sr', 'Policijski intervju zakazan', '<p>Policijski intervju za radnika {{worker_name}} je zakazan.</p>'),
  ('police_interview_scheduled', 'en', 'Police Interview Scheduled', '<p>Police interview for worker {{worker_name}} has been scheduled.</p>'),
  ('visa_approved', 'sr', 'Viza odobrena', '<p>Viza za radnika {{worker_name}} je odobrena.</p>'),
  ('visa_approved', 'en', 'Visa Approved', '<p>Visa for worker {{worker_name}} has been approved.</p>'),
  ('worker_arrived', 'sr', 'Radnik stigao u Srbiju', '<p>Radnik {{worker_name}} je stigao u Srbiju.</p>'),
  ('worker_arrived', 'en', 'Worker Arrived in Serbia', '<p>Worker {{worker_name}} has arrived in Serbia.</p>');

-- B3: Document Templates storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('document-templates', 'document-templates', false);

CREATE POLICY "Ops/management can manage document templates"
ON storage.objects FOR ALL
USING (bucket_id = 'document-templates' AND (has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'management'::app_role)))
WITH CHECK (bucket_id = 'document-templates' AND (has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'management'::app_role)));

CREATE POLICY "Ops/management can read document templates"
ON storage.objects FOR SELECT
USING (bucket_id = 'document-templates' AND (has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'management'::app_role)));
