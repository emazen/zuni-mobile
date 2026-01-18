-- Migration: Fix Boğaziçi University type from private to public
-- Run this SQL directly in your Supabase SQL editor or via Prisma

-- Update Boğaziçi University type to 'public' (devlet)
-- This handles various possible name formats
UPDATE "University"
SET type = 'public'
WHERE 
  LOWER(name) LIKE '%boğaziçi%' OR
  LOWER(name) LIKE '%bogazici%' OR
  LOWER(shortName) LIKE '%boğaziçi%' OR
  LOWER(shortName) LIKE '%bogazici%';

