-- Fix: Add missing aliases field to competitors table
-- Run this to fix the schema mismatch

ALTER TABLE competitors 
ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}';

