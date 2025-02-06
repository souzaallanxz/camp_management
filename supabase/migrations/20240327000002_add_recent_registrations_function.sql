-- Function to get recent registrations for a team
CREATE OR REPLACE FUNCTION get_team_recent_registrations(p_limit int DEFAULT 5)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  total_paid decimal,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.email,
    COALESCE(SUM(p.amount), 0) as total_paid,
    r.created_at
  FROM registrations r
  JOIN camps c ON c.id = r.camp_id
  LEFT JOIN payments p ON p.registration_id = r.id
  WHERE c.team_id = get_auth_user_team_id()
  GROUP BY r.id, r.name, r.email, r.created_at
  ORDER BY r.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_team_recent_registrations(int) TO authenticated; 