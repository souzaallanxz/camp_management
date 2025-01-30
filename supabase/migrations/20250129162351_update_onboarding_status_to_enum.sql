-- Drop existing column
ALTER TABLE registrations DROP COLUMN IF EXISTS onboarding_status;

-- Create the enum type
DROP TYPE IF EXISTS onboarding_status_type;
CREATE TYPE onboarding_status_type AS ENUM ('Pendente', 'Onboarded');

-- Add the column with the new enum type
ALTER TABLE registrations 
  ADD COLUMN onboarding_status onboarding_status_type NOT NULL DEFAULT 'Pendente';
