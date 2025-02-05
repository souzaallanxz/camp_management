-- Drop existing policies
DROP POLICY IF EXISTS "campers_select_policy" ON campers;
DROP POLICY IF EXISTS "campers_insert_policy" ON campers;
DROP POLICY IF EXISTS "campers_update_policy" ON campers;
DROP POLICY IF EXISTS "campers_delete_policy" ON campers;

DROP POLICY IF EXISTS "snack_bar_transactions_select_policy" ON snack_bar_transactions;
DROP POLICY IF EXISTS "snack_bar_transactions_insert_policy" ON snack_bar_transactions;
DROP POLICY IF EXISTS "snack_bar_transactions_update_policy" ON snack_bar_transactions;
DROP POLICY IF EXISTS "snack_bar_transactions_delete_policy" ON snack_bar_transactions;

-- Create secure functions for campers
CREATE OR REPLACE FUNCTION get_camp_campers(p_camp_id uuid)
RETURNS SETOF campers
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT c.*
    FROM campers c
    JOIN registrations r ON r.id = c.registration_id
    JOIN camps camp ON camp.id = r.camp_id
    WHERE r.camp_id = p_camp_id
    AND camp.team_id = get_auth_user_team_id()
    ORDER BY c.name ASC;
END;
$$;

-- Create secure function for snack bar transactions
CREATE OR REPLACE FUNCTION get_camp_snackbar_transactions(p_camp_id uuid)
RETURNS TABLE (
    id uuid,
    camper_id uuid,
    amount decimal,
    created_at timestamptz,
    camper_name text,
    registration_id uuid
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.camper_id,
        t.amount,
        t.created_at,
        c.name as camper_name,
        c.registration_id
    FROM snack_bar_transactions t
    JOIN campers c ON c.id = t.camper_id
    JOIN registrations r ON r.id = c.registration_id
    JOIN camps camp ON camp.id = r.camp_id
    WHERE r.camp_id = p_camp_id
    AND camp.team_id = get_auth_user_team_id()
    ORDER BY t.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_camp_campers(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_camp_snackbar_transactions(uuid) TO authenticated;

-- Create new policies for campers
CREATE POLICY "campers_select_policy" ON campers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON c.id = r.camp_id
            WHERE campers.registration_id = r.id
            AND c.team_id = get_auth_user_team_id()
        )
    );

CREATE POLICY "campers_insert_policy" ON campers
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON c.id = r.camp_id
            WHERE registration_id = r.id
            AND c.team_id = get_auth_user_team_id()
        )
    );

CREATE POLICY "campers_update_policy" ON campers
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON c.id = r.camp_id
            WHERE campers.registration_id = r.id
            AND c.team_id = get_auth_user_team_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON c.id = r.camp_id
            WHERE registration_id = r.id
            AND c.team_id = get_auth_user_team_id()
        )
    );

CREATE POLICY "campers_delete_policy" ON campers
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM registrations r
            JOIN camps c ON c.id = r.camp_id
            WHERE campers.registration_id = r.id
            AND c.team_id = get_auth_user_team_id()
        )
    );

-- Create new policies for snack bar transactions
CREATE POLICY "snack_bar_transactions_select_policy" ON snack_bar_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM campers c
            JOIN registrations r ON r.id = c.registration_id
            JOIN camps camp ON camp.id = r.camp_id
            WHERE snack_bar_transactions.camper_id = c.id
            AND camp.team_id = get_auth_user_team_id()
        )
    );

CREATE POLICY "snack_bar_transactions_insert_policy" ON snack_bar_transactions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM campers c
            JOIN registrations r ON r.id = c.registration_id
            JOIN camps camp ON camp.id = r.camp_id
            WHERE camper_id = c.id
            AND camp.team_id = get_auth_user_team_id()
        )
    );

CREATE POLICY "snack_bar_transactions_update_policy" ON snack_bar_transactions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM campers c
            JOIN registrations r ON r.id = c.registration_id
            JOIN camps camp ON camp.id = r.camp_id
            WHERE snack_bar_transactions.camper_id = c.id
            AND camp.team_id = get_auth_user_team_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM campers c
            JOIN registrations r ON r.id = c.registration_id
            JOIN camps camp ON camp.id = r.camp_id
            WHERE camper_id = c.id
            AND camp.team_id = get_auth_user_team_id()
        )
    );

CREATE POLICY "snack_bar_transactions_delete_policy" ON snack_bar_transactions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM campers c
            JOIN registrations r ON r.id = c.registration_id
            JOIN camps camp ON camp.id = r.camp_id
            WHERE snack_bar_transactions.camper_id = c.id
            AND camp.team_id = get_auth_user_team_id()
        )
    ); 