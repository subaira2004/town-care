-- ============================================
-- TOWN CARE - Add Unattended Token Status
-- Migration 0005
-- Run this in Supabase SQL Editor
-- ============================================

-- Update tokens table to support 'unattended' status
-- This allows marking incomplete tokens at end of day

-- Drop the old check constraint if it exists
ALTER TABLE public.tokens DROP CONSTRAINT IF EXISTS tokens_status_check;

-- Add new check constraint with 'unattended' status
ALTER TABLE public.tokens
ADD CONSTRAINT tokens_status_check
CHECK (status IN ('waiting', 'in_consultation', 'completed', 'skipped', 'cancelled', 'unattended'));

-- Add comment
COMMENT ON COLUMN public.tokens.status IS 'Token status: waiting, in_consultation, completed, skipped, cancelled, or unattended (end of day)';
