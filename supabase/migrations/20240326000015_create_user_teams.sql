-- Create set_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create user_teams table
CREATE TABLE IF NOT EXISTS user_teams (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, team_id)
);

-- Enable RLS on user_teams
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;

-- Create policies for user_teams
CREATE POLICY "user_teams_select_policy" ON user_teams
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "user_teams_insert_policy" ON user_teams
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_teams_update_policy" ON user_teams
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_teams_delete_policy" ON user_teams
    FOR DELETE
    USING (user_id = auth.uid());

-- Create trigger to update updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON user_teams
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at(); 