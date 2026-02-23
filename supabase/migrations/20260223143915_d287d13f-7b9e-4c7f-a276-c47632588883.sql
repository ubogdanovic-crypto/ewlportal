
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('client', 'ops', 'management');

-- 2. Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Serbia',
  pib TEXT, -- Serbian tax ID
  maticni_broj TEXT, -- Company registration number
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'sr' CHECK (preferred_language IN ('sr', 'en')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 5. Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 7. Security definer function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id
$$;

-- 8. Security definer function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- 9. RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Ops/management can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Ops/management can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  );

CREATE POLICY "System can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 10. RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Ops/management can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  );

CREATE POLICY "Management can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'management'))
  WITH CHECK (public.has_role(auth.uid(), 'management'));

-- 11. RLS Policies for companies
CREATE POLICY "Clients can view own company"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Ops/management can view all companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  );

CREATE POLICY "Ops/management can manage companies"
  ON public.companies FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'ops') OR
    public.has_role(auth.uid(), 'management')
  );

-- 12. Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 13. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
