-- Add promoter_requests table to realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'promoter_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.promoter_requests;
    END IF;
END $$;
