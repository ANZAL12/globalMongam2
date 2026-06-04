-- Run this in your Supabase SQL Editor to allow checking if a user requires a password reset

CREATE OR REPLACE FUNCTION public.check_must_change_password(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_must_change BOOLEAN;
BEGIN
  SELECT must_change_password INTO v_must_change
  FROM public.users
  WHERE lower(email) = lower(p_email);
  
  IF v_must_change IS NULL THEN
    RETURN FALSE; -- Return false for non-existent users to avoid enumerating emails
  END IF;
  
  RETURN v_must_change;
END;
$$;
