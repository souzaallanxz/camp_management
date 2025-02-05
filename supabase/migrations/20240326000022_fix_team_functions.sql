-- Drop existing functions
DROP FUNCTION IF EXISTS create_team(name text);
DROP FUNCTION IF EXISTS get_current_user_team();

-- Create function to create a team and associate it with the current user
CREATE OR REPLACE FUNCTION create_team(team_name text)
RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
    new_team_id uuid;
BEGIN
    -- Insert new team
    INSERT INTO teams (name)
    VALUES (team_name)
    RETURNING teams.id INTO new_team_id;

    -- Update the user's team_id in auth.users
    UPDATE auth.users 
    SET team_id = new_team_id
    WHERE id = auth.uid();

    RETURN new_team_id;
END;
$$;

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
BEGIN
    RETURN QUERY
    SELECT t.id, t.name
    FROM teams t
    JOIN auth.users u ON u.team_id = t.id
    WHERE u.id = auth.uid()
    LIMIT 1;
END;
$$;

-- Create function to check if user has a team
CREATE OR REPLACE FUNCTION has_team()
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM auth.users
        WHERE id = auth.uid()
        AND team_id IS NOT NULL
    );
END;
$$; 