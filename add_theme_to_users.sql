-- Add theme column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'theme'
    ) THEN
        ALTER TABLE public.users ADD COLUMN theme VARCHAR(20) DEFAULT 'light';
    END IF;
END $$; 