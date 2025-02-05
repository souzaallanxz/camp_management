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
BEGIN
    RETURN QUERY
    SELECT t.id, t.name
    FROM teams t
    WHERE t.id = (
        SELECT team_id 
        FROM auth.users 
        WHERE auth.users.id = auth.uid()
    )
    LIMIT 1;
END;
$$; 