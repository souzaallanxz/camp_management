-- Drop existing policies
DROP POLICY IF EXISTS "camps_select_policy" ON camps;
DROP POLICY IF EXISTS "camps_insert_policy" ON camps;
DROP POLICY IF EXISTS "camps_update_policy" ON camps;
DROP POLICY IF EXISTS "camps_delete_policy" ON camps;

-- Create a secure function to get current user's team_id
CREATE OR REPLACE FUNCTION get_auth_user_team_id()
RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
    user_team_id uuid;
BEGIN
    SELECT team_id INTO user_team_id
    FROM auth.users
    WHERE id = auth.uid();
    
    RETURN user_team_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_auth_user_team_id() TO authenticated;

-- Create new policies using the secure function
CREATE POLICY "camps_select_policy" ON camps
    FOR SELECT
    USING (
        team_id = get_auth_user_team_id()
    );

CREATE POLICY "camps_insert_policy" ON camps
    FOR INSERT
    WITH CHECK (
        team_id = get_auth_user_team_id()
    );

CREATE POLICY "camps_update_policy" ON camps
    FOR UPDATE
    USING (
        team_id = get_auth_user_team_id()
    )
    WITH CHECK (
        team_id = get_auth_user_team_id()
    );

CREATE POLICY "camps_delete_policy" ON camps
    FOR DELETE
    USING (
        team_id = get_auth_user_team_id()
    );

-- Update the camp service to use the new function
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
    FROM teams t
    WHERE t.id = get_auth_user_team_id();

    IF result IS NULL THEN
        RAISE EXCEPTION 'User has no team assigned';
    END IF;

    RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_current_user_team() TO authenticated; 