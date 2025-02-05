-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_current_user_team();

-- Create a secure function to get the current user's team
CREATE OR REPLACE FUNCTION get_current_user_team()
RETURNS TABLE (
    id uuid,
    name text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name
    FROM teams t
    JOIN user_teams ut ON ut.team_id = t.id
    WHERE ut.user_id = auth.uid()
    LIMIT 1;
END;
$$; 