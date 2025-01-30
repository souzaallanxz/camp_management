-- Create snack bar transactions table
CREATE TABLE snack_bar_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camper_id UUID NOT NULL REFERENCES campers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_camper
    FOREIGN KEY (camper_id)
    REFERENCES campers(id)
    ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX idx_snack_bar_transactions_camper_id ON snack_bar_transactions(camper_id);
CREATE INDEX idx_snack_bar_transactions_created_at ON snack_bar_transactions(created_at);

-- Create function to deduct balance
CREATE OR REPLACE FUNCTION deduct_snack_bar_balance(p_camper_id UUID, p_amount DECIMAL)
RETURNS void AS $$
DECLARE
  v_registration_id UUID;
  v_current_balance DECIMAL;
BEGIN
  -- Get registration_id for the camper
  SELECT registration_id INTO v_registration_id
  FROM campers
  WHERE id = p_camper_id;

  IF v_registration_id IS NULL THEN
    RAISE EXCEPTION 'Camper not found or not associated with a registration';
  END IF;

  -- Get current balance
  SELECT amount INTO v_current_balance
  FROM snackbar_balance
  WHERE registration_id = v_registration_id;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'No balance found for this registration';
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current balance: %', v_current_balance;
  END IF;

  -- Deduct balance and create transaction in a single transaction
  BEGIN
    -- Update balance
    UPDATE snackbar_balance 
    SET amount = amount - p_amount
    WHERE registration_id = v_registration_id;

    -- Create transaction record
    INSERT INTO snack_bar_transactions (camper_id, amount)
    VALUES (p_camper_id, p_amount);
  END;
END;
$$ LANGUAGE plpgsql; 