-- Migration: Add audio fields to Post and Comment tables
-- Run this SQL directly in your Supabase SQL editor

-- Add audio column to Post table
ALTER TABLE "Post" 
ADD COLUMN IF NOT EXISTS "audio" TEXT;

-- Add audio column to Comment table
ALTER TABLE "Comment" 
ADD COLUMN IF NOT EXISTS "audio" TEXT;

-- Add comments to document the fields
COMMENT ON COLUMN "Post"."audio" IS 'URL to audio file stored in Supabase Storage';
COMMENT ON COLUMN "Comment"."audio" IS 'URL to audio file stored in Supabase Storage';

