-- Enable RLS on all tables
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campers ENABLE ROW LEVEL SECURITY;
ALTER TABLE snack_bar_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON campers;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON campers;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON campers;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON campers;

-- Create RLS policies for registrations
CREATE POLICY "Users can view registrations from their team's camps"
  ON registrations FOR SELECT
  USING (
    camp_id IN (
      SELECT id FROM camps 
      WHERE team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    )
  );

CREATE POLICY "Users can insert registrations for their team's camps"
  ON registrations FOR INSERT
  WITH CHECK (
    camp_id IN (
      SELECT id FROM camps 
      WHERE team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    )
  );

CREATE POLICY "Users can update registrations from their team's camps"
  ON registrations FOR UPDATE
  USING (
    camp_id IN (
      SELECT id FROM camps 
      WHERE team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    )
  )
  WITH CHECK (
    camp_id IN (
      SELECT id FROM camps 
      WHERE team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    )
  );

CREATE POLICY "Users can delete registrations from their team's camps"
  ON registrations FOR DELETE
  USING (
    camp_id IN (
      SELECT id FROM camps 
      WHERE team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    )
  );

-- Create RLS policies for campers
CREATE POLICY "Users can view campers from their team's registrations"
  ON campers FOR SELECT
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    )
  );

CREATE POLICY "Users can insert campers for their team's registrations"
  ON campers FOR INSERT
  WITH CHECK (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    )
  );

CREATE POLICY "Users can update campers from their team's registrations"
  ON campers FOR UPDATE
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    )
  )
  WITH CHECK (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    )
  );

CREATE POLICY "Users can delete campers from their team's registrations"
  ON campers FOR DELETE
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    )
  );

-- Create RLS policies for snack bar transactions
CREATE POLICY "Users can view snack bar transactions from their team's campers"
  ON snack_bar_transactions FOR SELECT
  USING (
    camper_id IN (
      SELECT cm.id FROM campers cm
      JOIN registrations r ON cm.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    )
  );

CREATE POLICY "Users can insert snack bar transactions for their team's campers"
  ON snack_bar_transactions FOR INSERT
  WITH CHECK (
    camper_id IN (
      SELECT cm.id FROM campers cm
      JOIN registrations r ON cm.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    )
  );

CREATE POLICY "Users can update snack bar transactions from their team's campers"
  ON snack_bar_transactions FOR UPDATE
  USING (
    camper_id IN (
      SELECT cm.id FROM campers cm
      JOIN registrations r ON cm.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    )
  )
  WITH CHECK (
    camper_id IN (
      SELECT cm.id FROM campers cm
      JOIN registrations r ON cm.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    )
  );

CREATE POLICY "Users can delete snack bar transactions from their team's campers"
  ON snack_bar_transactions FOR DELETE
  USING (
    camper_id IN (
      SELECT cm.id FROM campers cm
      JOIN registrations r ON cm.registration_id = r.id
      JOIN camps c ON r.camp_id = c.id
      WHERE c.team_id = (SELECT team_id FROM auth.users WHERE auth.users.id = auth.uid())
    )
  ); 