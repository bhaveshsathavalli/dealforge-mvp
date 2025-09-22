-- Check if competitors table exists and drop if needed
-- Run this first if you're getting errors

-- Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'competitors' 
ORDER BY ordinal_position;

-- If the table exists but is missing columns, drop and recreate
DROP TABLE IF EXISTS competitors CASCADE;

