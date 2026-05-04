-- 1. Update roles constraint in users table
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'approver'::text, 'promoter'::text]));

-- 2. Add approver_id to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. Update status constraint in sales table
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'approver_approved'::text, 'approved'::text, 'rejected'::text, 'paid'::text]));

-- 4. Update RLS Policies for sales table

-- Admins can do everything
DROP POLICY IF EXISTS "Admins can view all sales" ON public.sales;
CREATE POLICY "Admins can view all sales" 
ON public.sales FOR SELECT TO authenticated 
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all sales" ON public.sales;
CREATE POLICY "Admins can update all sales" 
ON public.sales FOR UPDATE TO authenticated 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Promoters can view own data
DROP POLICY IF EXISTS "Users can view own sales" ON public.sales;
CREATE POLICY "Users can view own sales" 
ON public.sales FOR SELECT TO authenticated 
USING (promoter_id = auth.uid());

-- NEW: Approvers can view sales of promoters assigned to them
DROP POLICY IF EXISTS "Approvers can view assigned sales" ON public.sales;
CREATE POLICY "Approvers can view assigned sales" 
ON public.sales FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = sales.promoter_id 
    AND users.approver_id = auth.uid()
  )
);

-- NEW: Approvers can update status of assigned sales
DROP POLICY IF EXISTS "Approvers can update assigned sales" ON public.sales;
CREATE POLICY "Approvers can update assigned sales" 
ON public.sales FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = sales.promoter_id 
    AND users.approver_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = sales.promoter_id 
    AND users.approver_id = auth.uid()
  )
  AND (status = ANY (ARRAY['approver_approved'::text, 'rejected'::text]))
);

-- 5. Update RLS Policies for users table

-- Approvers can view promoters assigned to them
DROP POLICY IF EXISTS "Approvers can view assigned promoters" ON public.users;
CREATE POLICY "Approvers can view assigned promoters" 
ON public.users FOR SELECT TO authenticated 
USING (
  approver_id = auth.uid() OR id = auth.uid() OR public.is_admin()
);

-- 6. RPC Functions

-- Generic function to create any user (for Admin use)
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_role TEXT,
  p_full_name TEXT,
  p_shop_name TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_gpay_number TEXT DEFAULT NULL,
  p_upi_id TEXT DEFAULT '',
  p_approver_id UUID DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  PERFORM set_config('app.is_rpc', 'true', true);
  new_user_id := gen_random_uuid();
  
  -- Insert into auth.users
  INSERT INTO auth.users (
    id, email, encrypted_password, 
    aud, role, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  VALUES (
    new_user_id, 
    p_email, 
    crypt(p_password, gen_salt('bf')),
    'authenticated', 'authenticated', now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    now(), now()
  );

  -- Insert into auth.identities
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, 
    provider, created_at, updated_at, last_sign_in_at
  )
  VALUES (
    new_user_id, new_user_id, new_user_id::text,
    format('{"sub":"%s","email":"%s"}', new_user_id::text, p_email)::jsonb,
    'email', now(), now(), now()
  );

  -- Insert into public.users
  INSERT INTO public.users (
    id, email, role, full_name, shop_name, 
    phone_number, gpay_number, upi_id, is_active, approver_id
  )
  VALUES (
    new_user_id, p_email, p_role, p_full_name, 
    p_shop_name, p_phone_number, p_gpay_number, p_upi_id, true, p_approver_id
  );

  RETURN jsonb_build_object('success', true, 'user_id', new_user_id);
END;
$$;

-- Update admin_create_promoter for backward compatibility and to support approver_id
CREATE OR REPLACE FUNCTION public.admin_create_promoter(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_shop_name TEXT,
  p_phone_number TEXT,
  p_gpay_number TEXT,
  p_upi_id TEXT DEFAULT ''::text,
  p_approver_id UUID DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  RETURN public.admin_create_user(
    p_email, p_password, 'promoter', p_full_name, 
    p_shop_name, p_phone_number, p_gpay_number, p_upi_id, p_approver_id
  );
END;
$$;
