-- First, disable RLS to reset everything
ALTER TABLE registrations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view registrations from their team's camps" ON registrations;
DROP POLICY IF EXISTS "Users can insert registrations for their team's camps" ON registrations;
DROP POLICY IF EXISTS "Users can update registrations from their team's camps" ON registrations;
DROP POLICY IF EXISTS "Users can delete registrations from their team's camps" ON registrations;

-- Re-enable RLS
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Create new policies with proper team isolation
CREATE POLICY "registrations_select_policy" ON registrations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM camps c
            WHERE c.id = registrations.camp_id
            AND c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    );

CREATE POLICY "registrations_insert_policy" ON registrations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM camps c
            WHERE c.id = camp_id
            AND c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    );

CREATE POLICY "registrations_update_policy" ON registrations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM camps c
            WHERE c.id = registrations.camp_id
            AND c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM camps c
            WHERE c.id = camp_id
            AND c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    );

CREATE POLICY "registrations_delete_policy" ON registrations
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM camps c
            WHERE c.id = registrations.camp_id
            AND c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    ); 