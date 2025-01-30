-- Make sure campers table has the correct relationship with registrations
ALTER TABLE campers 
  DROP CONSTRAINT IF EXISTS campers_registration_id_fkey,
  ADD COLUMN IF NOT EXISTS registration_id uuid REFERENCES registrations(id) ON DELETE CASCADE;

-- Remove camper_id from registrations if it exists
ALTER TABLE registrations 
  DROP COLUMN IF EXISTS camper_id; 