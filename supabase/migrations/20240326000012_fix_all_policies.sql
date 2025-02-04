-- Drop and recreate the registration_payments_total view with team isolation
DROP VIEW IF EXISTS registration_payments_total CASCADE;
CREATE VIEW registration_payments_total AS
SELECT 
    p.registration_id,
    COALESCE(SUM(p.amount), 0) as total_paid
FROM payments p
JOIN registrations r ON r.id = p.registration_id
JOIN camps c ON c.id = r.camp_id
WHERE c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
GROUP BY p.registration_id;

-- Create a secure wrapper function to access registration_payments_total
CREATE OR REPLACE FUNCTION get_registration_total(registration_id uuid)
RETURNS decimal
SECURITY DEFINER
SET search_path = public
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

-- Update registrations policy
DROP POLICY IF EXISTS "registrations_select_policy" ON registrations;
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

-- Update campers policy
DROP POLICY IF EXISTS "campers_select_policy" ON campers;
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

-- Update camps policy
DROP POLICY IF EXISTS "camps_select_policy" ON camps;
CREATE POLICY "camps_select_policy" ON camps
    FOR SELECT
    USING (
        team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    ); 