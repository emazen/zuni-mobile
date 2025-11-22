-- Migration: Add customColor field to User table
-- Run this SQL directly in your Supabase SQL editor

ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "customColor" TEXT;

-- Add a comment to document the field
COMMENT ON COLUMN "User"."customColor" IS 'Hex color code for custom gender identity';

