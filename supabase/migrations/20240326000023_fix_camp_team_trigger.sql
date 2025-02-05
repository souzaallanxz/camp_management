-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION set_camp_team_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.team_id := (SELECT team_id FROM auth.users WHERE id = auth.uid());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS set_camp_team_id_trigger ON camps;

-- Create the trigger
CREATE TRIGGER set_camp_team_id_trigger
    BEFORE INSERT ON camps
    FOR EACH ROW
    EXECUTE FUNCTION set_camp_team_id(); 