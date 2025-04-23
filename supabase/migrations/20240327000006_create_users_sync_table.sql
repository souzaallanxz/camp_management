-- Create users_sync table in public schema
CREATE TABLE IF NOT EXISTS public.users_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  raw_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email
CREATE INDEX IF NOT EXISTS users_sync_email_idx ON public.users_sync(email);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_users_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_sync_updated_at
  BEFORE UPDATE ON public.users_sync
  FOR EACH ROW
  EXECUTE FUNCTION update_users_sync_updated_at(); 