-- Additional Security Recommendations for Clerk + Supabase Setup

-- 1. Add application-level constraints (optional but recommended)
-- These help catch bugs in your application code

-- Ensure user_id is never null in critical tables
ALTER TABLE org_members ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE query_runs ALTER COLUMN user_id SET NOT NULL;

-- 2. Add check constraints for data validation
-- Ensure user_id follows Clerk's format (starts with 'user_')
ALTER TABLE org_members ADD CONSTRAINT check_user_id_format 
  CHECK (user_id ~ '^user_[a-zA-Z0-9]+$');

ALTER TABLE query_runs ADD CONSTRAINT check_user_id_format 
  CHECK (user_id ~ '^user_[a-zA-Z0-9]+$');

ALTER TABLE feedback ADD CONSTRAINT check_user_id_format 
  CHECK (user_id ~ '^user_[a-zA-Z0-9]+$');

-- 3. Create a view for safer data access (optional)
-- This view automatically filters by the current user (if you want extra safety)
CREATE OR REPLACE VIEW user_query_runs AS
SELECT * FROM query_runs 
WHERE user_id = current_setting('app.current_user_id', true);

-- 4. Add audit logging (recommended for production)
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for performance and security queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
