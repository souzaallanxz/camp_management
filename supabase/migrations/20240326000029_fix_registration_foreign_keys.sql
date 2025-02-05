-- Drop both foreign key constraints
ALTER TABLE registrations 
DROP CONSTRAINT IF EXISTS fk_camp_id;

ALTER TABLE registrations 
DROP CONSTRAINT IF EXISTS registrations_camp_id_fkey;

-- Recreate the single foreign key constraint
ALTER TABLE registrations 
ADD CONSTRAINT registrations_camp_id_fkey 
FOREIGN KEY (camp_id) 
REFERENCES camps(id)
ON DELETE CASCADE; 