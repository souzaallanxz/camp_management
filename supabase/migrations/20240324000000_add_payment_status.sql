-- Create the payment method enum type
CREATE TYPE payment_method_enum AS ENUM ('MB Way', 'Transferência Bancária', 'Dinheiro');

-- Create the payment status enum type
CREATE TYPE payment_status_enum AS ENUM ('confirmed', 'not confirmed');

-- Add payment_status column and convert payment_method to enum
ALTER TABLE payments
  -- Add payment_status column with default value based on payment_method
  ADD COLUMN payment_status payment_status_enum NOT NULL DEFAULT 'not confirmed',
  -- First convert existing payment_method to the new enum type
  ALTER COLUMN payment_method TYPE payment_method_enum USING payment_method::payment_method_enum;

-- Create a trigger function to set payment_status based on payment_method
CREATE OR REPLACE FUNCTION set_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_method IN ('Transferência Bancária', 'Dinheiro') THEN
    NEW.payment_status = 'confirmed';
  ELSE
    NEW.payment_status = 'not confirmed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER set_payment_status_trigger
  BEFORE INSERT OR UPDATE OF payment_method ON payments
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_status(); 