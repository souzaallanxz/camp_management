-- Update all existing registration statuses
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
)
UPDATE registrations r
SET status = ps.new_status
FROM payment_status ps
WHERE r.id = ps.id; 