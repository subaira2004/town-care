-- ============================================
-- TOWN CARE - Subscription & Reporting System
-- Migration 0004
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. SUBSCRIPTION PLANS
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  price_monthly numeric(10,2) DEFAULT 0,
  price_yearly numeric(10,2) DEFAULT 0,
  max_tokens_per_month integer DEFAULT 100,
  max_schedules integer DEFAULT 10,
  max_doctors integer DEFAULT 5,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. PHARMACY SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.pharmacy_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES public.pharmacies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_id uuid REFERENCES public.subscription_plans(id) NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial', 'suspended')),
  current_period_start date DEFAULT CURRENT_DATE,
  current_period_end date,
  tokens_used_this_month integer DEFAULT 0,
  last_payment_date date,
  cancelled_at timestamptz,
  cancellation_reason text,
  trial_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for quick subscription lookups
CREATE INDEX IF NOT EXISTS idx_pharmacy_subscriptions_pharmacy_id ON public.pharmacy_subscriptions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_subscriptions_status ON public.pharmacy_subscriptions(status);

-- ============================================
-- 3. USAGE LOGS (Monthly Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES public.pharmacies(id) ON DELETE CASCADE NOT NULL,
  log_date date NOT NULL,
  tokens_count integer DEFAULT 0,
  schedules_count integer DEFAULT 0,
  overage_tokens integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pharmacy_id, log_date)
);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_usage_logs_pharmacy_date ON public.usage_logs(pharmacy_id, log_date);

-- ============================================
-- 4. INVOICES
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES public.pharmacies(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES public.pharmacy_subscriptions(id) ON DELETE SET NULL,
  invoice_number text UNIQUE NOT NULL,
  amount numeric(10,2) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_method text CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', NULL)),
  payment_date date,
  invoice_pdf_url text,
  notes text,
  due_date date,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

-- Index for invoice lookups
CREATE INDEX IF NOT EXISTS idx_invoices_pharmacy_id ON public.invoices(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);

-- ============================================
-- 5. SUBSCRIPTION CHANGE REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES public.pharmacies(id) ON DELETE CASCADE NOT NULL,
  current_plan_id uuid REFERENCES public.subscription_plans(id),
  requested_plan_id uuid REFERENCES public.subscription_plans(id),
  request_type text CHECK (request_type IN ('upgrade', 'downgrade', 'cancel', 'reactivate')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES public.app_users(id)
);

-- ============================================
-- 6. REPORT SAVED CONFIGURATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE,
  report_name text NOT NULL,
  report_type text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to reset monthly usage (call on 1st of each month)
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void AS $$
BEGIN
  -- Reset tokens_used_this_month for all active subscriptions
  UPDATE public.pharmacy_subscriptions
  SET
    tokens_used_this_month = 0,
    current_period_start = CURRENT_DATE,
    updated_at = now()
  WHERE status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to check if pharmacy can create token (usage limit check)
CREATE OR REPLACE FUNCTION public.can_create_token(p_pharmacy_id uuid)
RETURNS boolean AS $$
DECLARE
  sub record;
  plan record;
  current_usage integer;
BEGIN
  -- Get subscription and plan
  SELECT ps.*, sp.max_tokens_per_month INTO sub, plan
  FROM public.pharmacy_subscriptions ps
  JOIN public.subscription_plans sp ON ps.plan_id = sp.id
  WHERE ps.pharmacy_id = p_pharmacy_id
  AND ps.status = 'active';

  -- No subscription found
  IF sub IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Unlimited tokens (max_tokens_per_month = 0 or null means unlimited)
  IF plan.max_tokens_per_month IS NULL OR plan.max_tokens_per_month = 0 THEN
    RETURN TRUE;
  END IF;

  -- Check current usage
  SELECT tokens_used_this_month INTO current_usage
  FROM public.pharmacy_subscriptions
  WHERE pharmacy_id = p_pharmacy_id;

  RETURN current_usage < plan.max_tokens_per_month;
END;
$$ LANGUAGE plpgsql;

-- Function to increment token usage
CREATE OR REPLACE FUNCTION public.increment_token_usage(p_pharmacy_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.pharmacy_subscriptions
  SET
    tokens_used_this_month = tokens_used_this_month + 1,
    updated_at = now()
  WHERE pharmacy_id = p_pharmacy_id;

  -- Also log daily usage
  INSERT INTO public.usage_logs (pharmacy_id, log_date, tokens_count)
  VALUES (p_pharmacy_id, CURRENT_DATE, 1)
  ON CONFLICT (pharmacy_id, log_date)
  DO UPDATE SET tokens_count = public.usage_logs.tokens_count + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text AS $$
DECLARE
  new_number text;
  seq integer;
BEGIN
  -- Get next sequence number for this month
  SELECT COALESCE(
    (SELECT MAX(
      CAST(SPLIT_PART(invoice_number, '-', 3) AS integer)
    ) FROM public.invoices
    WHERE invoice_number LIKE 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '%'),
    0
  ) + 1 INTO seq;

  new_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(seq::text, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to create invoice for subscription period
CREATE OR REPLACE FUNCTION public.create_subscription_invoice(
  p_pharmacy_id uuid,
  p_subscription_id uuid,
  p_amount numeric,
  p_period_start date,
  p_period_end date,
  p_due_date date DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_invoice_id uuid;
  v_invoice_number text;
BEGIN
  v_invoice_number := public.generate_invoice_number();

  INSERT INTO public.invoices (
    pharmacy_id,
    subscription_id,
    invoice_number,
    amount,
    period_start,
    period_end,
    status,
    due_date,
    notes
  ) VALUES (
    p_pharmacy_id,
    p_subscription_id,
    v_invoice_number,
    p_amount,
    p_period_start,
    p_period_end,
    'pending',
    COALESCE(p_due_date, p_period_end),
    p_notes
  ) RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update subscription updated_at
CREATE OR REPLACE FUNCTION public.update_subscription_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_subscription_timestamp ON public.pharmacy_subscriptions;

CREATE TRIGGER trg_update_subscription_timestamp
  BEFORE UPDATE ON public.pharmacy_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_timestamp();

-- ============================================
-- SEED DATA: Default Subscription Plans
-- ============================================

-- Only insert if plans don't exist already
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, max_tokens_per_month, max_schedules, max_doctors, features, is_default)
SELECT 'Free', 'Basic plan for small pharmacies', 0, 0, 50, 5, 3, '["basic_queue", "patient_registry", "whatsapp_sharing"]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'Free');

INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, max_tokens_per_month, max_schedules, max_doctors, features)
SELECT 'Basic', 'For growing pharmacies with regular doctor visits', 499, 4990, 200, 15, 5, '["basic_queue", "patient_registry", "whatsapp_sharing", "analytics_basic", "payment_tracking", "tamil_language"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'Basic');

INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, max_tokens_per_month, max_schedules, max_doctors, features)
SELECT 'Pro', 'For busy pharmacies with multiple doctors', 999, 9990, 0, 0, 0, '["basic_queue", "patient_registry", "whatsapp_sharing", "analytics_advanced", "payment_tracking", "tamil_language", "priority_support", "custom_reports", "export_data"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'Pro');

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.subscription_plans IS 'Subscription plan tiers for pharmacies';
COMMENT ON TABLE public.pharmacy_subscriptions IS 'Active subscription for each pharmacy';
COMMENT ON TABLE public.usage_logs IS 'Daily usage tracking for billing and analytics';
COMMENT ON TABLE public.invoices IS 'Manual invoice tracking (no payment gateway)';
COMMENT ON TABLE public.subscription_change_requests IS 'Pharmacy requests to change subscription plans';
COMMENT ON FUNCTION public.reset_monthly_usage IS 'Reset monthly token counters - call on 1st of month';
COMMENT ON FUNCTION public.can_create_token IS 'Check if pharmacy has remaining token quota';
COMMENT ON FUNCTION public.increment_token_usage IS 'Increment token usage counter after creating token';
