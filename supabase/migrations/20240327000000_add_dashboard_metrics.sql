-- Function to get total payments for the current month for a team
CREATE OR REPLACE FUNCTION get_team_monthly_payments(
  p_year int,
  p_month int
)
RETURNS TABLE (
  total_amount decimal,
  previous_month_total decimal,
  percentage_change decimal
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  current_month_total decimal;
  prev_month_total decimal;
  perc_change decimal;
BEGIN
  -- Get current month total
  SELECT COALESCE(SUM(p.amount), 0)
  INTO current_month_total
  FROM payments p
  JOIN registrations r ON r.id = p.registration_id
  JOIN camps c ON c.id = r.camp_id
  WHERE c.team_id = get_auth_user_team_id()
  AND EXTRACT(YEAR FROM p.payment_date) = p_year
  AND EXTRACT(MONTH FROM p.payment_date) = p_month;

  -- Get previous month total
  SELECT COALESCE(SUM(p.amount), 0)
  INTO prev_month_total
  FROM payments p
  JOIN registrations r ON r.id = p.registration_id
  JOIN camps c ON c.id = r.camp_id
  WHERE c.team_id = get_auth_user_team_id()
  AND (
    (EXTRACT(YEAR FROM p.payment_date) = p_year AND EXTRACT(MONTH FROM p.payment_date) = p_month - 1)
    OR 
    (EXTRACT(YEAR FROM p.payment_date) = p_year - 1 AND p_month = 1 AND EXTRACT(MONTH FROM p.payment_date) = 12)
  );

  -- Calculate percentage change
  IF prev_month_total > 0 THEN
    perc_change := ((current_month_total - prev_month_total) / prev_month_total) * 100;
  ELSE
    perc_change := NULL;
  END IF;

  RETURN QUERY
  SELECT 
    current_month_total,
    prev_month_total,
    ROUND(perc_change, 1);
END;
$$;

-- Function to get total registrations for the current month for a team
CREATE OR REPLACE FUNCTION get_team_monthly_registrations(
  p_year int,
  p_month int
)
RETURNS TABLE (
  total_count bigint,
  previous_month_count bigint,
  percentage_change decimal
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  current_month_count bigint;
  prev_month_count bigint;
  perc_change decimal;
BEGIN
  -- Get current month count
  SELECT COUNT(*)
  INTO current_month_count
  FROM registrations r
  JOIN camps c ON c.id = r.camp_id
  WHERE c.team_id = get_auth_user_team_id()
  AND EXTRACT(YEAR FROM r.created_at) = p_year
  AND EXTRACT(MONTH FROM r.created_at) = p_month;

  -- Get previous month count
  SELECT COUNT(*)
  INTO prev_month_count
  FROM registrations r
  JOIN camps c ON c.id = r.camp_id
  WHERE c.team_id = get_auth_user_team_id()
  AND (
    (EXTRACT(YEAR FROM r.created_at) = p_year AND EXTRACT(MONTH FROM r.created_at) = p_month - 1)
    OR 
    (EXTRACT(YEAR FROM r.created_at) = p_year - 1 AND p_month = 1 AND EXTRACT(MONTH FROM r.created_at) = 12)
  );

  -- Calculate percentage change
  IF prev_month_count > 0 THEN
    perc_change := ((current_month_count - prev_month_count)::decimal / prev_month_count::decimal) * 100;
  ELSE
    perc_change := NULL;
  END IF;

  RETURN QUERY
  SELECT 
    current_month_count,
    prev_month_count,
    ROUND(perc_change, 1);
END;
$$;

-- Function to get total snackbar transactions for the current month for a team
CREATE OR REPLACE FUNCTION get_team_monthly_snackbar_transactions(
  p_year int,
  p_month int
)
RETURNS TABLE (
  total_amount decimal,
  previous_month_total decimal,
  percentage_change decimal
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  current_month_total decimal;
  prev_month_total decimal;
  perc_change decimal;
BEGIN
  -- Get current month total
  SELECT COALESCE(SUM(t.amount), 0)
  INTO current_month_total
  FROM snack_bar_transactions t
  JOIN campers c ON c.id = t.camper_id
  JOIN registrations r ON r.id = c.registration_id
  JOIN camps camp ON camp.id = r.camp_id
  WHERE camp.team_id = get_auth_user_team_id()
  AND EXTRACT(YEAR FROM t.created_at) = p_year
  AND EXTRACT(MONTH FROM t.created_at) = p_month;

  -- Get previous month total
  SELECT COALESCE(SUM(t.amount), 0)
  INTO prev_month_total
  FROM snack_bar_transactions t
  JOIN campers c ON c.id = t.camper_id
  JOIN registrations r ON r.id = c.registration_id
  JOIN camps camp ON camp.id = r.camp_id
  WHERE camp.team_id = get_auth_user_team_id()
  AND (
    (EXTRACT(YEAR FROM t.created_at) = p_year AND EXTRACT(MONTH FROM t.created_at) = p_month - 1)
    OR 
    (EXTRACT(YEAR FROM t.created_at) = p_year - 1 AND p_month = 1 AND EXTRACT(MONTH FROM t.created_at) = 12)
  );

  -- Calculate percentage change
  IF prev_month_total > 0 THEN
    perc_change := ((current_month_total - prev_month_total) / prev_month_total) * 100;
  ELSE
    perc_change := NULL;
  END IF;

  RETURN QUERY
  SELECT 
    current_month_total,
    prev_month_total,
    ROUND(perc_change, 1);
END;
$$;

-- Function to get total campers for the current year for a team
CREATE OR REPLACE FUNCTION get_team_yearly_campers(
  p_year int
)
RETURNS TABLE (
  total_count bigint,
  previous_year_count bigint,
  percentage_change decimal
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  current_year_count bigint;
  prev_year_count bigint;
  perc_change decimal;
BEGIN
  -- Get current year count
  SELECT COUNT(DISTINCT c.id)
  INTO current_year_count
  FROM campers c
  JOIN registrations r ON r.id = c.registration_id
  JOIN camps camp ON camp.id = r.camp_id
  WHERE camp.team_id = get_auth_user_team_id()
  AND EXTRACT(YEAR FROM camp.start_date) = p_year;

  -- Get previous year count
  SELECT COUNT(DISTINCT c.id)
  INTO prev_year_count
  FROM campers c
  JOIN registrations r ON r.id = c.registration_id
  JOIN camps camp ON camp.id = r.camp_id
  WHERE camp.team_id = get_auth_user_team_id()
  AND EXTRACT(YEAR FROM camp.start_date) = p_year - 1;

  -- Calculate percentage change
  IF prev_year_count > 0 THEN
    perc_change := ((current_year_count - prev_year_count)::decimal / prev_year_count::decimal) * 100;
  ELSE
    perc_change := NULL;
  END IF;

  RETURN QUERY
  SELECT 
    current_year_count,
    prev_year_count,
    ROUND(perc_change, 1);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_team_monthly_payments(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_monthly_registrations(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_monthly_snackbar_transactions(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_yearly_campers(int) TO authenticated; 