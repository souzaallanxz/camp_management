-- Drop trigger first
DROP TRIGGER IF EXISTS sync_team_id_trigger ON auth.users;

-- Then drop functions
DROP FUNCTION IF EXISTS sync_team_id_to_claims();
DROP FUNCTION IF EXISTS get_current_user_team();

-- Create function to get current user's team
CREATE OR REPLACE FUNCTION get_current_user_team()
RETURNS json
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'id', t.id,
        'name', t.name
    ) INTO result
    FROM auth.users u
    JOIN teams t ON t.id = u.team_id
    WHERE u.id = auth.uid();

    IF result IS NULL THEN
        RAISE EXCEPTION 'User has no team assigned';
    END IF;

    RETURN result;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_current_user_team() TO authenticated; 