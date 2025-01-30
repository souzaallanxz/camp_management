-- Add foreign key constraint between campers and registrations
ALTER TABLE campers
  ADD CONSTRAINT campers_registration_id_fkey 
  FOREIGN KEY (registration_id) 
  REFERENCES registrations(id) 
  ON DELETE CASCADE; 