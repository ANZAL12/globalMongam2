-- Add sales table to realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'sales'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
    END IF;
END $$;
