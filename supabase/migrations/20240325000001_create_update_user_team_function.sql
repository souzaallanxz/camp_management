-- Create function to update user's team_id
CREATE OR REPLACE FUNCTION update_user_team(team_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE auth.users
  SET team_id = $1
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 