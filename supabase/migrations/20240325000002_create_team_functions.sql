-- Function to get current user's team
CREATE OR REPLACE FUNCTION get_current_user_team()
RETURNS TABLE (
  id uuid,
  name text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.created_at, t.updated_at
  FROM teams t
  INNER JOIN auth.users u ON u.team_id = t.id
  WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create team and associate with current user
CREATE OR REPLACE FUNCTION create_team_for_current_user(team_name text)
RETURNS TABLE (
  id uuid,
  name text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
DECLARE
  new_team_id uuid;
BEGIN
  -- Create new team
  INSERT INTO teams (name)
  VALUES (team_name)
  RETURNING teams.id INTO new_team_id;

  -- Update user's team_id
  UPDATE auth.users u
  SET team_id = new_team_id
  WHERE u.id = auth.uid();

  -- Return the created team
  RETURN QUERY
  SELECT t.id, t.name, t.created_at, t.updated_at
  FROM teams t
  WHERE t.id = new_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 