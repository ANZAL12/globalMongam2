ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS fcm_web_push_token text;
