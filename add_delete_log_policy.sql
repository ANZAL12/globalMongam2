-- Run this in your Supabase SQL Editor to allow authenticated users (Admins) to delete system logs

-- Policy: Allow only admins to delete logs
DROP POLICY IF EXISTS "Allow authenticated users to delete logs" ON public.system_logs;
DROP POLICY IF EXISTS "Allow admins to delete logs" ON public.system_logs;

CREATE POLICY "Allow admins to delete logs" 
ON public.system_logs 
FOR DELETE 
TO authenticated 
USING (public.is_admin());
