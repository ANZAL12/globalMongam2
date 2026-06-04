-- Enable pgcrypto if it isn't already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the function to securely delete a user from public.users and auth.users
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Unassign any promoters if the user being deleted is an approver
  UPDATE public.users
  SET approver_id = null
  WHERE approver_id = p_user_id;

  -- Delete from public.users
  DELETE FROM public.users
  WHERE id = p_user_id;

  -- Delete from auth.identities to ensure clean removal
  DELETE FROM auth.identities
  WHERE user_id = p_user_id;

  -- Delete from auth.users
  DELETE FROM auth.users
  WHERE id = p_user_id;
END;
$$;
