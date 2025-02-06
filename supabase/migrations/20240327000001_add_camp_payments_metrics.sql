-- Function to get total payments and registrations per camp for a team
CREATE OR REPLACE FUNCTION get_team_camp_payments()
RETURNS TABLE (
  camp_id uuid,
  camp_name text,
  total_payments decimal,
  total_registrations bigint
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as camp_id,
    c.name as camp_name,
    COALESCE(SUM(p.amount), 0) as total_payments,
    COUNT(DISTINCT r.id) as total_registrations
  FROM camps c
  LEFT JOIN registrations r ON r.camp_id = c.id
  LEFT JOIN payments p ON p.registration_id = r.id
  WHERE c.team_id = get_auth_user_team_id()
  GROUP BY c.id, c.name
  ORDER BY c.start_date DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_team_camp_payments() TO authenticated; 