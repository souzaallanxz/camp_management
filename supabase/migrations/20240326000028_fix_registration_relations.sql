-- Drop the duplicate foreign key if it exists
ALTER TABLE registrations 
DROP CONSTRAINT IF EXISTS fk_camp_id;

-- Drop and recreate the policies for registrations
DROP POLICY IF EXISTS "registrations_select_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_insert_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_update_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_delete_policy" ON registrations;

-- Create new policies using the secure function
CREATE POLICY "registrations_select_policy" ON registrations
    FOR SELECT
    USING (
        camp_id IN (
            SELECT id FROM camps 
            WHERE team_id = get_auth_user_team_id()
        )
    );

CREATE POLICY "registrations_insert_policy" ON registrations
    FOR INSERT
    WITH CHECK (
        camp_id IN (
            SELECT id FROM camps 
            WHERE team_id = get_auth_user_team_id()
        )
    );

CREATE POLICY "registrations_update_policy" ON registrations
    FOR UPDATE
    USING (
        camp_id IN (
            SELECT id FROM camps 
            WHERE team_id = get_auth_user_team_id()
        )
    )
    WITH CHECK (
        camp_id IN (
            SELECT id FROM camps 
            WHERE team_id = get_auth_user_team_id()
        )
    );

CREATE POLICY "registrations_delete_policy" ON registrations
    FOR DELETE
    USING (
        camp_id IN (
            SELECT id FROM camps 
            WHERE team_id = get_auth_user_team_id()
        )
    ); 