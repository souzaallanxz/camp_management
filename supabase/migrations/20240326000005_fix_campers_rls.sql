-- First, disable RLS to reset everything
ALTER TABLE campers DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view campers from their team's registrations" ON campers;
DROP POLICY IF EXISTS "Users can insert campers for their team's registrations" ON campers;
DROP POLICY IF EXISTS "Users can update campers from their team's registrations" ON campers;
DROP POLICY IF EXISTS "Users can delete campers from their team's registrations" ON campers;
DROP POLICY IF EXISTS "Enable read access for all users" ON campers;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON campers;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON campers;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON campers;

-- Re-enable RLS
ALTER TABLE campers ENABLE ROW LEVEL SECURITY;

-- Create new policies with proper team isolation
CREATE POLICY "campers_select_policy" ON campers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            WHERE campers.registration_id = r.id
            AND c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    );

CREATE POLICY "campers_insert_policy" ON campers
    FOR INSERT
    WITH CHECK (
        registration_id IN (
            SELECT r.id 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            WHERE c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    );

CREATE POLICY "campers_update_policy" ON campers
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            WHERE campers.registration_id = r.id
            AND c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    )
    WITH CHECK (
        registration_id IN (
            SELECT r.id 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            WHERE c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    );

CREATE POLICY "campers_delete_policy" ON campers
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            WHERE campers.registration_id = r.id
            AND c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
        )
    ); 