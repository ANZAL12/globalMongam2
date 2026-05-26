-- Add nullable approver_notes column to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS approver_notes TEXT DEFAULT NULL;
