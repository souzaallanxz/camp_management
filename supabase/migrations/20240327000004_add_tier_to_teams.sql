-- Add tier column to teams table with default value 'free'
ALTER TABLE teams ADD COLUMN tier text NOT NULL DEFAULT 'free'
  CHECK (tier IN ('free', 'premium'));

-- Update team functions to include tier
DROP FUNCTION IF EXISTS get_current_user_team();
DROP FUNCTION IF EXISTS create_team_for_current_user(text);

-- Function to get current user's team
CREATE OR REPLACE FUNCTION get_current_user_team()
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  tier text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.logo_url, t.tier, t.created_at, t.updated_at
  FROM teams t
  WHERE t.id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create team and associate with current user
CREATE OR REPLACE FUNCTION create_team_for_current_user(
  team_name text,
  team_tier text DEFAULT 'free'
)
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  tier text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
DECLARE
  new_team_id uuid;
BEGIN
  -- Create new team
  INSERT INTO teams (name, tier)
  VALUES (team_name, team_tier)
  RETURNING teams.id INTO new_team_id;

  -- Update user's team_id
  UPDATE auth.users u
  SET team_id = new_team_id
  WHERE u.id = auth.uid();

  -- Return the created team
  RETURN QUERY
  SELECT t.id, t.name, t.logo_url, t.tier, t.created_at, t.updated_at
  FROM teams t
  WHERE t.id = new_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update current user's team
CREATE OR REPLACE FUNCTION update_current_user_team(
  p_team_id uuid,
  team_name text DEFAULT NULL,
  team_logo_url text DEFAULT NULL,
  team_tier text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  tier text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  -- Update team
  UPDATE teams
  SET
    name = COALESCE(team_name, name),
    logo_url = COALESCE(team_logo_url, logo_url),
    tier = COALESCE(team_tier, tier)
  WHERE id = p_team_id
  AND id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid());

  -- Return the updated team
  RETURN QUERY
  SELECT t.id, t.name, t.logo_url, t.tier, t.created_at, t.updated_at
  FROM teams t
  WHERE t.id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 