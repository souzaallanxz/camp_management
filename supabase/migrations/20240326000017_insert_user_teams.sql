-- Insert user-team relationships for existing users and teams
DO $$
DECLARE
    user_record RECORD;
    team_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM auth.users
    LOOP
        FOR team_record IN SELECT id FROM teams
        LOOP
            INSERT INTO user_teams (user_id, team_id)
            VALUES (user_record.id, team_record.id)
            ON CONFLICT (user_id, team_id) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql; 