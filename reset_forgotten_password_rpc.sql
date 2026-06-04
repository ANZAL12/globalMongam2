-- Enable pgcrypto if it isn't already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the function to allow users to reset their password if must_change_password is true
CREATE OR REPLACE FUNCTION public.reset_forgotten_password(p_email TEXT, p_new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_must_change BOOLEAN;
BEGIN
  -- Find the user by email (case insensitive)
  SELECT id, must_change_password INTO v_user_id, v_must_change
  FROM public.users
  WHERE lower(email) = lower(p_email);

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found.';
  END IF;

  IF NOT v_must_change THEN
    RAISE EXCEPTION 'Please contact the admin to reset your password.';
  END IF;

  -- Update auth.users encrypted_password using pgcrypto's crypt and gen_salt for Blowfish (bcrypt)
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf'))
  WHERE id = v_user_id;

  -- Reset the must_change_password flag
  UPDATE public.users
  SET must_change_password = false
  WHERE id = v_user_id;
END;
$$;
