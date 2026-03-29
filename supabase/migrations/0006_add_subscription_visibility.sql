-- ============================================
-- TOWN CARE - Add Subscription Visibility Flag
-- Migration 0006
-- Run this in Supabase SQL Editor
-- ============================================

-- Add column to control subscription visibility for pharmacy
ALTER TABLE public.pharmacies
ADD COLUMN IF NOT EXISTS show_subscription boolean DEFAULT false;

-- Set comment
COMMENT ON COLUMN public.pharmacies.show_subscription IS 'Controls whether pharmacy can see subscription info in settings (controlled by admin)';

-- Default to false for existing pharmacies (hide subscription)
UPDATE public.pharmacies SET show_subscription = false WHERE show_subscription IS NULL;
