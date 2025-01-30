-- Add snack_bar_balance column to campers table
ALTER TABLE campers
ADD COLUMN snack_bar_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Add check constraint to ensure balance is not negative
ALTER TABLE campers
ADD CONSTRAINT check_snack_bar_balance_not_negative 
CHECK (snack_bar_balance >= 0); 