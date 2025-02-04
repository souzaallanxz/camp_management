-- First, let's ensure the user has the correct team_id
CREATE OR REPLACE FUNCTION debug_user_team() 
RETURNS TABLE (
    user_id uuid,
    user_team_id uuid,
    has_team boolean,
    team_exists boolean
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        auth.uid() as user_id,
        u.team_id as user_team_id,
        (u.team_id IS NOT NULL) as has_team,
        EXISTS (SELECT 1 FROM teams t WHERE t.id = u.team_id) as team_exists
    FROM auth.users u
    WHERE u.id = auth.uid();
END;
$$;

-- Function to list all camps with their team info for debugging
CREATE OR REPLACE FUNCTION debug_camps_access() 
RETURNS TABLE (
    camp_id uuid,
    camp_name text,
    camp_team_id uuid,
    user_team_id uuid,
    is_accessible boolean
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as camp_id,
        c.name as camp_name,
        c.team_id as camp_team_id,
        (SELECT team_id FROM auth.users WHERE id = auth.uid()) as user_team_id,
        (c.team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())) as is_accessible
    FROM camps c;
END;
$$;

-- Drop and recreate camps policies with additional checks
DROP POLICY IF EXISTS "camps_select_policy" ON camps;
DROP POLICY IF EXISTS "camps_insert_policy" ON camps;
DROP POLICY IF EXISTS "camps_update_policy" ON camps;
DROP POLICY IF EXISTS "camps_delete_policy" ON camps;

-- Create stricter policies for camps
CREATE POLICY "camps_select_policy" ON camps
    FOR SELECT
    USING (
        team_id IS NOT NULL 
        AND (SELECT team_id FROM auth.users WHERE id = auth.uid()) IS NOT NULL
        AND team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "camps_insert_policy" ON camps
    FOR INSERT
    WITH CHECK (
        team_id IS NOT NULL 
        AND (SELECT team_id FROM auth.users WHERE id = auth.uid()) IS NOT NULL
        AND team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "camps_update_policy" ON camps
    FOR UPDATE
    USING (
        team_id IS NOT NULL 
        AND (SELECT team_id FROM auth.users WHERE id = auth.uid()) IS NOT NULL
        AND team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
    )
    WITH CHECK (
        team_id IS NOT NULL 
        AND (SELECT team_id FROM auth.users WHERE id = auth.uid()) IS NOT NULL
        AND team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "camps_delete_policy" ON camps
    FOR DELETE
    USING (
        team_id IS NOT NULL 
        AND (SELECT team_id FROM auth.users WHERE id = auth.uid()) IS NOT NULL
        AND team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
    ); 