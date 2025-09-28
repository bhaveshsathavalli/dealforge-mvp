-- Add columns to support pending invitations
-- This migration adds email and status columns to org_memberships

-- Add email column for pending invitations
ALTER TABLE org_memberships 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add status column for invitation tracking
ALTER TABLE org_memberships 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_org_memberships_email ON org_memberships(email);

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_org_memberships_status ON org_memberships(status);


