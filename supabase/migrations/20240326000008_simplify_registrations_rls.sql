-- First, disable RLS to reset everything
ALTER TABLE registrations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "registrations_select_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_insert_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_update_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_delete_policy" ON registrations;

-- Re-enable RLS
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Create simpler policies that work with our query structure
CREATE POLICY "registrations_select_policy" ON registrations
    FOR SELECT
    USING (
        camp_id IN (
            SELECT id 
            FROM camps 
            WHERE team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    );

CREATE POLICY "registrations_insert_policy" ON registrations
    FOR INSERT
    WITH CHECK (
        camp_id IN (
            SELECT id 
            FROM camps 
            WHERE team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    );

CREATE POLICY "registrations_update_policy" ON registrations
    FOR UPDATE
    USING (
        camp_id IN (
            SELECT id 
            FROM camps 
            WHERE team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    );

CREATE POLICY "registrations_delete_policy" ON registrations
    FOR DELETE
    USING (
        camp_id IN (
            SELECT id 
            FROM camps 
            WHERE team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    ); 