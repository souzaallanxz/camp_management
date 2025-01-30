-- Update the view to only consider confirmed payments
CREATE OR REPLACE VIEW registration_payments_total AS
SELECT 
    registration_id,
    COALESCE(SUM(amount), 0) as total_paid
FROM payments
WHERE payment_status = 'confirmed'
GROUP BY registration_id;

-- Update the registration status function
CREATE OR REPLACE FUNCTION update_registration_status()
RETURNS TRIGGER AS $$
BEGIN
    WITH payment_status AS (
        SELECT 
            r.id,
            CASE 
                WHEN COALESCE(p.total_paid, 0) >= c.price THEN 'paid'::registration_status
                WHEN COALESCE(p.total_paid, 0) > 0 THEN 'partial'::registration_status
                ELSE 'unpaid'::registration_status
            END as new_status
        FROM registrations r
        LEFT JOIN registration_payments_total p ON p.registration_id = r.id
        JOIN camps c ON c.id = r.camp_id
        WHERE r.id = NEW.registration_id
    )
    UPDATE registrations r
    SET status = ps.new_status
    FROM payment_status ps
    WHERE r.id = ps.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the registration status on delete function
CREATE OR REPLACE FUNCTION update_registration_status_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    WITH payment_status AS (
        SELECT 
            r.id,
            CASE 
                WHEN COALESCE(p.total_paid, 0) >= c.price THEN 'paid'::registration_status
                WHEN COALESCE(p.total_paid, 0) > 0 THEN 'partial'::registration_status
                ELSE 'unpaid'::registration_status
            END as new_status
        FROM registrations r
        LEFT JOIN registration_payments_total p ON p.registration_id = r.id
        JOIN camps c ON c.id = r.camp_id
        WHERE r.id = OLD.registration_id
    )
    UPDATE registrations r
    SET status = ps.new_status
    FROM payment_status ps
    WHERE r.id = ps.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql; 