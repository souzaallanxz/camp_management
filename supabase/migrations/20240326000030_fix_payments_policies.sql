-- Drop existing policies
DROP POLICY IF EXISTS "payments_select_policy" ON payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
DROP POLICY IF EXISTS "payments_update_policy" ON payments;
DROP POLICY IF EXISTS "payments_delete_policy" ON payments;

-- Create new policies using the secure function
CREATE POLICY "payments_select_policy" ON payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            WHERE payments.registration_id = r.id
            AND c.team_id = get_auth_user_team_id()
        )
    );

CREATE POLICY "payments_insert_policy" ON payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            WHERE registration_id = r.id
            AND c.team_id = get_auth_user_team_id()
        )
    );

CREATE POLICY "payments_update_policy" ON payments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            WHERE payments.registration_id = r.id
            AND c.team_id = get_auth_user_team_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            WHERE registration_id = r.id
            AND c.team_id = get_auth_user_team_id()
        )
    );

CREATE POLICY "payments_delete_policy" ON payments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON r.camp_id = c.id
            WHERE payments.registration_id = r.id
            AND c.team_id = get_auth_user_team_id()
        )
    );

-- Create a secure function to get registration payments
CREATE OR REPLACE FUNCTION get_registration_payments(p_registration_id uuid)
RETURNS SETOF payments
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT p.*
    FROM payments p
    JOIN registrations r ON r.id = p.registration_id
    JOIN camps c ON c.id = r.camp_id
    WHERE p.registration_id = p_registration_id
    AND c.team_id = get_auth_user_team_id()
    ORDER BY p.payment_date DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_registration_payments(uuid) TO authenticated; 