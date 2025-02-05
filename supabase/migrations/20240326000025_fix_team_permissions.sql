-- Drop existing functions
DROP FUNCTION IF EXISTS get_current_user_team();

-- Create function to get current user's team
CREATE OR REPLACE FUNCTION get_current_user_team()
RETURNS TABLE (
    id uuid,
    name text
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
    current_team_id uuid;
BEGIN
    -- Get the team_id directly from the session info
    current_team_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'team_id')::uuid;
    
    IF current_team_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT t.id, t.name
    FROM teams t
    WHERE t.id = current_team_id
    LIMIT 1;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_current_user_team() TO authenticated;

-- Create a trigger function to sync team_id to JWT claims
CREATE OR REPLACE FUNCTION sync_team_id_to_claims()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.team_id IS DISTINCT FROM NEW.team_id THEN
        PERFORM set_claim(NEW.id::text, 'team_id', NEW.team_id::text);
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS sync_team_id_trigger ON auth.users;
CREATE TRIGGER sync_team_id_trigger
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_team_id_to_claims(); 