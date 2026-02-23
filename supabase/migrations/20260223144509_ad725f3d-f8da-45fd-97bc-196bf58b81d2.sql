
-- 1. Order status enum
CREATE TYPE public.order_status AS ENUM (
  'draft', 'submitted', 'confirmed', 'sourcing', 'in_progress', 'fulfilled', 'cancelled'
);

-- 2. Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  reference_number TEXT NOT NULL UNIQUE,
  status order_status NOT NULL DEFAULT 'draft',

  -- Step 1: Job Details
  position_title TEXT NOT NULL DEFAULT '',
  job_description TEXT DEFAULT '',
  requirements TEXT DEFAULT '',
  source_country TEXT DEFAULT '',
  number_of_workers INT NOT NULL DEFAULT 1,
  
  -- Step 2: Order Specifics
  start_date DATE,
  contract_duration_months INT,
  work_schedule TEXT DEFAULT '',
  serbian_language_required BOOLEAN DEFAULT false,
  experience_years INT DEFAULT 0,
  education_level TEXT DEFAULT '',
  additional_skills TEXT DEFAULT '',

  -- Step 3: Accommodation & Compensation
  monthly_salary_eur NUMERIC(10,2),
  accommodation_provided BOOLEAN DEFAULT false,
  accommodation_type TEXT DEFAULT '',
  accommodation_address TEXT DEFAULT '',
  transportation_provided BOOLEAN DEFAULT false,
  meals_provided BOOLEAN DEFAULT false,
  other_benefits TEXT DEFAULT '',

  -- Metadata
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Clients can view their company's orders
CREATE POLICY "Clients can view own company orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- Clients can insert orders for their company
CREATE POLICY "Clients can create orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid()) AND
    created_by = auth.uid()
  );

-- Clients can update their own draft orders
CREATE POLICY "Clients can update own draft orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid()) AND
    created_by = auth.uid() AND
    status = 'draft'
  );

-- Ops/management can view all orders
CREATE POLICY "Ops/management can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  );

-- Ops/management can manage all orders
CREATE POLICY "Ops/management can manage orders"
  ON public.orders FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  );

-- 5. Reference number generation function
CREATE OR REPLACE FUNCTION public.generate_order_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_part TEXT;
  seq_num INT;
BEGIN
  year_part := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num FROM public.orders
    WHERE reference_number LIKE 'EWL-' || year_part || '-%';
  NEW.reference_number := 'EWL-' || year_part || '-' || lpad(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_order_reference
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.reference_number = '' OR NEW.reference_number IS NULL)
  EXECUTE FUNCTION public.generate_order_reference();

-- 6. Updated_at trigger
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
