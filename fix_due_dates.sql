-- Fix due dates for existing tenants
-- This updates tenancies where the next_due_date is incorrectly set

-- Example: If tenant started Nov 1, 2025 and hasn't paid, next_due_date should be Nov 5, 2025
-- Update this query with the correct tenancy ID and date:

-- First, check current values:
SELECT id, start_date, next_due_date, rent_frequency 
FROM tenancies 
WHERE status = 'active'
ORDER BY start_date;

-- Then update the specific tenancy (replace 'YOUR-TENANCY-ID' and date):
-- UPDATE tenancies 
-- SET next_due_date = '2025-11-05'
-- WHERE id = 'YOUR-TENANCY-ID';

-- Or, automatically fix all tenancies to set next_due_date to the 5th of the start month:
-- UPDATE tenancies
-- SET next_due_date = date_trunc('month', start_date::date) + interval '4 days'
-- WHERE status = 'active' 
-- AND EXTRACT(DAY FROM start_date::date) <= 5;

-- For tenants who started after the 5th, set to 5th of next month:
-- UPDATE tenancies
-- SET next_due_date = date_trunc('month', start_date::date) + interval '1 month' + interval '4 days'
-- WHERE status = 'active' 
-- AND EXTRACT(DAY FROM start_date::date) > 5;
