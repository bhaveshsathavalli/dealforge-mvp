-- Add missing columns to support Clerk integration
-- Run this in Supabase SQL Editor

-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing columns to orgs table  
ALTER TABLE orgs 
ADD COLUMN IF NOT EXISTS clerk_org_id TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add missing columns to org_memberships table
ALTER TABLE org_memberships 
ADD COLUMN IF NOT EXISTS clerk_org_id TEXT,
ADD COLUMN IF NOT EXISTS clerk_user_id TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_orgs_clerk_org_id ON orgs(clerk_org_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_clerk_org_id ON org_memberships(clerk_org_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_clerk_user_id ON org_memberships(clerk_user_id);

-- Update competitors table to use clerk_org_id instead of org_id
ALTER TABLE competitors 
ADD COLUMN IF NOT EXISTS clerk_org_id TEXT;

-- Copy existing org_id values to clerk_org_id (if any exist)
UPDATE competitors 
SET clerk_org_id = org_id::text 
WHERE clerk_org_id IS NULL AND org_id IS NOT NULL;
