-- Drop all existing policies for camps
DROP POLICY IF EXISTS "Users can view camps from their team" ON camps;
DROP POLICY IF EXISTS "Users can insert camps for their team" ON camps;
DROP POLICY IF EXISTS "Users can update camps from their team" ON camps;
DROP POLICY IF EXISTS "Users can delete camps from their team" ON camps;

-- Ensure RLS is enabled
ALTER TABLE camps ENABLE ROW LEVEL SECURITY;

-- Create new stricter policies for camps
CREATE POLICY "Users can view camps from their team only"
  ON camps FOR SELECT
  USING (
    team_id = (
      SELECT team_id 
      FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert camps for their team only"
  ON camps FOR INSERT
  WITH CHECK (
    team_id = (
      SELECT team_id 
      FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

CREATE POLICY "Users can update camps from their team only"
  ON camps FOR UPDATE
  USING (
    team_id = (
      SELECT team_id 
      FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  )
  WITH CHECK (
    team_id = (
      SELECT team_id 
      FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete camps from their team only"
  ON camps FOR DELETE
  USING (
    team_id = (
      SELECT team_id 
      FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  ); 