-- Drop all policies that might reference user_teams
DROP POLICY IF EXISTS "user_teams_select_policy" ON user_teams;
DROP POLICY IF EXISTS "user_teams_insert_policy" ON user_teams;
DROP POLICY IF EXISTS "user_teams_update_policy" ON user_teams;
DROP POLICY IF EXISTS "user_teams_delete_policy" ON user_teams;

-- Drop all views that might reference user_teams
DROP VIEW IF EXISTS registration_payments_total CASCADE;

-- Drop all functions that might reference user_teams
DROP FUNCTION IF EXISTS get_current_user_team();
DROP FUNCTION IF EXISTS get_registration_total(uuid);

-- Drop all policies that might reference user_teams on other tables
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END
$$;

-- Drop all triggers on user_teams
DROP TRIGGER IF EXISTS set_updated_at ON user_teams;

-- Create the view using auth.users team_id
CREATE VIEW registration_payments_total AS
SELECT 
    p.registration_id,
    COALESCE(SUM(p.amount), 0) as total_paid
FROM payments p
JOIN registrations r ON r.id = p.registration_id
JOIN camps c ON c.id = r.camp_id
WHERE c.team_id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
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

-- Create a function to get current user's team
CREATE OR REPLACE FUNCTION get_current_user_team()
RETURNS TABLE (
    id uuid,
    name text
)
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name
    FROM teams t
    WHERE t.id = (SELECT team_id FROM auth.users WHERE id = auth.uid())
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Drop the user_teams table
DROP TABLE IF EXISTS user_teams; 