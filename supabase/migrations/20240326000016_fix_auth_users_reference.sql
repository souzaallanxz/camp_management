-- Migrate existing users to user_teams
INSERT INTO user_teams (user_id, team_id)
SELECT DISTINCT u.id, t.id
FROM auth.users u
CROSS JOIN teams t
WHERE NOT EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.user_id = u.id AND ut.team_id = t.id
);

-- Drop and recreate the registration_payments_total view with team isolation
DROP VIEW IF EXISTS registration_payments_total CASCADE;
CREATE VIEW registration_payments_total AS
SELECT 
    p.registration_id,
    COALESCE(SUM(p.amount), 0) as total_paid
FROM payments p
JOIN registrations r ON r.id = p.registration_id
JOIN camps c ON c.id = r.camp_id
JOIN user_teams ut ON ut.team_id = c.team_id
WHERE ut.user_id = auth.uid()
GROUP BY p.registration_id;

-- Create a secure wrapper function to access registration_payments_total
CREATE OR REPLACE FUNCTION get_registration_total(registration_id uuid)
RETURNS decimal
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    total decimal;
BEGIN
    SELECT total_paid INTO total
    FROM registration_payments_total pt
    WHERE pt.registration_id = $1;
    
    RETURN COALESCE(total, 0);
END;
$$ LANGUAGE plpgsql;

-- Update registrations policy (preserving existing data)
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registrations_select_policy" ON registrations;
CREATE POLICY "registrations_select_policy" ON registrations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM camps c
            JOIN user_teams ut ON ut.team_id = c.team_id
            WHERE c.id = registrations.camp_id
            AND ut.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "registrations_insert_policy" ON registrations;
CREATE POLICY "registrations_insert_policy" ON registrations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM camps c
            JOIN user_teams ut ON ut.team_id = c.team_id
            WHERE c.id = camp_id
            AND ut.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "registrations_update_policy" ON registrations;
CREATE POLICY "registrations_update_policy" ON registrations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM camps c
            JOIN user_teams ut ON ut.team_id = c.team_id
            WHERE c.id = registrations.camp_id
            AND ut.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM camps c
            JOIN user_teams ut ON ut.team_id = c.team_id
            WHERE c.id = camp_id
            AND ut.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "registrations_delete_policy" ON registrations;
CREATE POLICY "registrations_delete_policy" ON registrations
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM camps c
            JOIN user_teams ut ON ut.team_id = c.team_id
            WHERE c.id = registrations.camp_id
            AND ut.user_id = auth.uid()
        )
    );

-- Update campers policy (preserving existing data)
ALTER TABLE campers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campers_select_policy" ON campers;
CREATE POLICY "campers_select_policy" ON campers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            JOIN user_teams ut ON ut.team_id = c.team_id
            WHERE campers.registration_id = r.id
            AND ut.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "campers_insert_policy" ON campers;
CREATE POLICY "campers_insert_policy" ON campers
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            JOIN user_teams ut ON ut.team_id = c.team_id
            WHERE registration_id = r.id
            AND ut.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "campers_update_policy" ON campers;
CREATE POLICY "campers_update_policy" ON campers
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            JOIN user_teams ut ON ut.team_id = c.team_id
            WHERE campers.registration_id = r.id
            AND ut.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            JOIN user_teams ut ON ut.team_id = c.team_id
            WHERE registration_id = r.id
            AND ut.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "campers_delete_policy" ON campers;
CREATE POLICY "campers_delete_policy" ON campers
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            JOIN user_teams ut ON ut.team_id = c.team_id
            WHERE campers.registration_id = r.id
            AND ut.user_id = auth.uid()
        )
    );

-- Update camps policy (preserving existing data)
ALTER TABLE camps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "camps_select_policy" ON camps;
CREATE POLICY "camps_select_policy" ON camps
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM user_teams ut
            WHERE ut.team_id = camps.team_id
            AND ut.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "camps_insert_policy" ON camps;
CREATE POLICY "camps_insert_policy" ON camps
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM user_teams ut
            WHERE ut.team_id = team_id
            AND ut.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "camps_update_policy" ON camps;
CREATE POLICY "camps_update_policy" ON camps
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM user_teams ut
            WHERE ut.team_id = camps.team_id
            AND ut.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM user_teams ut
            WHERE ut.team_id = team_id
            AND ut.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "camps_delete_policy" ON camps;
CREATE POLICY "camps_delete_policy" ON camps
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM user_teams ut
            WHERE ut.team_id = camps.team_id
            AND ut.user_id = auth.uid()
        )
    );

-- Update payments policy (preserving existing data)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_policy" ON payments;
CREATE POLICY "payments_select_policy" ON payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            JOIN user_teams ut ON ut.team_id = c.team_id
            WHERE payments.registration_id = r.id
            AND ut.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
CREATE POLICY "payments_insert_policy" ON payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            JOIN user_teams ut ON ut.team_id = c.team_id
            WHERE registration_id = r.id
            AND ut.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "payments_update_policy" ON payments;
CREATE POLICY "payments_update_policy" ON payments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            JOIN user_teams ut ON ut.team_id = c.team_id
            WHERE payments.registration_id = r.id
            AND ut.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            JOIN user_teams ut ON ut.team_id = c.team_id
            WHERE registration_id = r.id
            AND ut.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "payments_delete_policy" ON payments;
CREATE POLICY "payments_delete_policy" ON payments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            JOIN user_teams ut ON ut.team_id = c.team_id
            WHERE payments.registration_id = r.id
            AND ut.user_id = auth.uid()
        )
    ); 