-- Add team_id to camps table
ALTER TABLE camps ADD COLUMN team_id UUID REFERENCES teams(id);

-- Update RLS policies for camps
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON camps;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON camps;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON camps;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON camps;

-- Create new RLS policies that check team_id
CREATE POLICY "Users can view camps from their team"
  ON camps FOR SELECT
  USING (team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid()));

CREATE POLICY "Users can insert camps for their team"
  ON camps FOR INSERT
  WITH CHECK (team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid()));

CREATE POLICY "Users can update camps from their team"
  ON camps FOR UPDATE
  USING (team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid()));

CREATE POLICY "Users can delete camps from their team"
  ON camps FOR DELETE
  USING (team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid()));

-- Create function to set team_id on camp creation
CREATE OR REPLACE FUNCTION set_camp_team_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.team_id := (SELECT team_id FROM auth.users WHERE id = auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set team_id
CREATE TRIGGER set_camp_team_id_trigger
  BEFORE INSERT ON camps
  FOR EACH ROW
  EXECUTE FUNCTION set_camp_team_id(); 