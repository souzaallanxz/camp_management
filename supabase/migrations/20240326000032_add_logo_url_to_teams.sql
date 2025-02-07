-- Add logo_url column to teams table
ALTER TABLE teams ADD COLUMN logo_url TEXT;

-- Update RLS policies to allow logo_url updates
CREATE POLICY "Users can update their own team logo"
  ON teams FOR UPDATE
  USING (id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())); 