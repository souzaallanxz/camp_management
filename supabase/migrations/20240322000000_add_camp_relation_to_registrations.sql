-- Add camp_id column to registrations table
ALTER TABLE registrations 
ADD COLUMN camp_id UUID REFERENCES camps(id) NOT NULL;

-- Create or replace the view that calculates total payments
CREATE OR REPLACE VIEW registration_payments_total AS
SELECT 
    registration_id,
    COALESCE(SUM(amount), 0) as total_paid
FROM payments
GROUP BY registration_id;

-- Create function to update registration status
CREATE OR REPLACE FUNCTION update_registration_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE registrations r
    SET status = CASE 
        WHEN p.total_paid >= c.price THEN 'paid'
        ELSE r.status 
    END
    FROM registration_payments_total p
    JOIN camps c ON c.id = r.camp_id
    WHERE r.id = p.registration_id
    AND r.id = NEW.registration_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update status when a payment is added/updated
DROP TRIGGER IF EXISTS update_registration_status_trigger ON payments;
CREATE TRIGGER update_registration_status_trigger
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_registration_status();

-- Add trigger for when a payment is deleted
CREATE OR REPLACE FUNCTION update_registration_status_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE registrations r
    SET status = CASE 
        WHEN p.total_paid >= c.price THEN 'paid'
        ELSE 'pending'
    END
    FROM registration_payments_total p
    JOIN camps c ON c.id = r.camp_id
    WHERE r.id = p.registration_id
    AND r.id = OLD.registration_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_registration_status_delete_trigger ON payments;
CREATE TRIGGER update_registration_status_delete_trigger
AFTER DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_registration_status_on_delete(); 