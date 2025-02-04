-- Create teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add team_id to auth.users
ALTER TABLE auth.users ADD COLUMN team_id UUID REFERENCES teams(id);

-- Create RLS policies for teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own team"
  ON teams FOR SELECT
  USING (id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid()));

CREATE POLICY "Users can update their own team"
  ON teams FOR UPDATE
  USING (id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid()));

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column(); 