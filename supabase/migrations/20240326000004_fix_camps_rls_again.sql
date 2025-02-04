-- First, disable RLS to reset everything
ALTER TABLE camps DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (including any that might have different names)
DROP POLICY IF EXISTS "Users can view camps from their team" ON camps;
DROP POLICY IF EXISTS "Users can insert camps for their team" ON camps;
DROP POLICY IF EXISTS "Users can update camps from their team" ON camps;
DROP POLICY IF EXISTS "Users can delete camps from their team" ON camps;
DROP POLICY IF EXISTS "Users can view camps from their team only" ON camps;
DROP POLICY IF EXISTS "Users can insert camps for their team only" ON camps;
DROP POLICY IF EXISTS "Users can update camps from their team only" ON camps;
DROP POLICY IF EXISTS "Users can delete camps from their team only" ON camps;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON camps;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON camps;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON camps;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON camps;

-- Re-enable RLS
ALTER TABLE camps ENABLE ROW LEVEL SECURITY;

-- Create a single policy for SELECT with debugging
CREATE POLICY "camps_select_policy" ON camps
    FOR SELECT
    USING (
        CASE 
            WHEN (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid()) IS NULL THEN false
            ELSE team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        END
    );

-- Create a single policy for INSERT
CREATE POLICY "camps_insert_policy" ON camps
    FOR INSERT
    WITH CHECK (
        CASE 
            WHEN (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid()) IS NULL THEN false
            ELSE team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        END
    );

-- Create a single policy for UPDATE
CREATE POLICY "camps_update_policy" ON camps
    FOR UPDATE
    USING (
        CASE 
            WHEN (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid()) IS NULL THEN false
            ELSE team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        END
    )
    WITH CHECK (
        CASE 
            WHEN (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid()) IS NULL THEN false
            ELSE team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        END
    );

-- Create a single policy for DELETE
CREATE POLICY "camps_delete_policy" ON camps
    FOR DELETE
    USING (
        CASE 
            WHEN (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid()) IS NULL THEN false
            ELSE team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        END
    ); 