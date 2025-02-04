-- Associate existing camps with the first team in the database
-- This is a temporary solution - you may want to manually assign camps to specific teams after this
UPDATE camps
SET team_id = (SELECT id FROM teams ORDER BY created_at ASC LIMIT 1)
WHERE team_id IS NULL;

-- Make team_id required for future camps
ALTER TABLE camps ALTER COLUMN team_id SET NOT NULL; 