-- ============================================
-- TOWN CARE - Subscription & Reporting System
-- Migration 0004
-- ============================================

-- ============================================
-- 1. SUBSCRIPTION PLANS
-- ============================================
create table public.subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  price_monthly numeric(10,2) default 0,
  price_yearly numeric(10,2) default 0,
  max_tokens_per_month integer default 100,
  max_schedules integer default 10,
  max_doctors integer default 5,
  features jsonb default '[]'::jsonb,
  is_active boolean default true,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- 2. PHARMACY SUBSCRIPTIONS
-- ============================================
create table public.pharmacy_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  pharmacy_id uuid references public.pharmacies(id) on delete cascade not null unique,
  plan_id uuid references public.subscription_plans(id) not null,
  status text default 'active' check (status in ('active', 'cancelled', 'expired', 'trial', 'suspended')),
  current_period_start date default current_date,
  current_period_end date,
  tokens_used_this_month integer default 0,
  last_payment_date date,
  cancelled_at timestamptz,
  cancellation_reason text,
  trial_ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for quick subscription lookups
create index if not exists idx_pharmacy_subscriptions_pharmacy_id on public.pharmacy_subscriptions(pharmacy_id);
create index if not exists idx_pharmacy_subscriptions_status on public.pharmacy_subscriptions(status);

-- ============================================
-- 3. USAGE LOGS (Monthly Tracking)
-- ============================================
create table public.usage_logs (
  id uuid primary key default uuid_generate_v4(),
  pharmacy_id uuid references public.pharmacies(id) on delete cascade not null,
  log_date date not null,
  tokens_count integer default 0,
  schedules_count integer default 0,
  overage_tokens integer default 0,
  created_at timestamptz default now(),
  unique(pharmacy_id, log_date)
);

-- Index for date-based queries
create index if not exists idx_usage_logs_pharmacy_date on public.usage_logs(pharmacy_id, log_date);

-- ============================================
-- 4. INVOICES
-- ============================================
create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  pharmacy_id uuid references public.pharmacies(id) on delete cascade not null,
  subscription_id uuid references public.pharmacy_subscriptions(id) on delete set null,
  invoice_number text unique not null,
  amount numeric(10,2) not null,
  period_start date not null,
  period_end date not null,
  status text default 'pending' check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  payment_method text check (payment_method in ('cash', 'upi', 'bank_transfer', null)),
  payment_date date,
  invoice_pdf_url text,
  notes text,
  due_date date,
  created_at timestamptz default now(),
  paid_at timestamptz
);

-- Index for invoice lookups
create index if not exists idx_invoices_pharmacy_id on public.invoices(pharmacy_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoices_number on public.invoices(invoice_number);

-- ============================================
-- 5. SUBSCRIPTION CHANGE REQUESTS
-- ============================================
create table public.subscription_change_requests (
  id uuid primary key default uuid_generate_v4(),
  pharmacy_id uuid references public.pharmacies(id) on delete cascade not null,
  current_plan_id uuid references public.subscription_plans(id),
  requested_plan_id uuid references public.subscription_plans(id),
  request_type text check (request_type in ('upgrade', 'downgrade', 'cancel', 'reactivate')),
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  requested_at timestamptz default now(),
  processed_at timestamptz,
  processed_by uuid references public.app_users(id)
);

-- ============================================
-- 6. REPORT SAVED CONFIGURATIONS (Optional - for saved report filters)
-- ============================================
create table public.saved_reports (
  id uuid primary key default uuid_generate_v4(),
  pharmacy_id uuid references public.pharmacies(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete cascade,
  report_name text not null,
  report_type text not null,
  config jsonb default '{}'::jsonb,
  is_public boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to reset monthly usage (call on 1st of each month)
create or replace function public.reset_monthly_usage()
returns void as $$
begin
  -- Reset tokens_used_this_month for all active subscriptions
  update public.pharmacy_subscriptions
  set
    tokens_used_this_month = 0,
    current_period_start = current_date,
    updated_at = now()
  where status = 'active';
end;
$$ language plpgsql;

-- Function to check if pharmacy can create token (usage limit check)
create or replace function public.can_create_token(p_pharmacy_id uuid)
returns boolean as $$
declare
  sub record;
  plan record;
  current_usage integer;
begin
  -- Get subscription and plan
  select ps.*, sp.max_tokens_per_month into sub, plan
  from public.pharmacy_subscriptions ps
  join public.subscription_plans sp on ps.plan_id = sp.id
  where ps.pharmacy_id = p_pharmacy_id
  and ps.status = 'active';

  -- No subscription found
  if sub is null then
    return false;
  end if;

  -- Unlimited tokens (max_tokens_per_month = 0 or null means unlimited)
  if plan.max_tokens_per_month is null or plan.max_tokens_per_month = 0 then
    return true;
  end if;

  -- Check current usage
  select tokens_used_this_month into current_usage
  from public.pharmacy_subscriptions
  where pharmacy_id = p_pharmacy_id;

  return current_usage < plan.max_tokens_per_month;
end;
$$ language plpgsql;

-- Function to increment token usage
create or replace function public.increment_token_usage(p_pharmacy_id uuid)
returns void as $$
begin
  update public.pharmacy_subscriptions
  set
    tokens_used_this_month = tokens_used_this_month + 1,
    updated_at = now()
  where pharmacy_id = p_pharmacy_id;

  -- Also log daily usage
  insert into public.usage_logs (pharmacy_id, log_date, tokens_count)
  values (p_pharmacy_id, current_date, 1)
  on conflict (pharmacy_id, log_date)
  do update set tokens_count = public.usage_logs.tokens_count + 1;
end;
$$ language plpgsql;

-- Function to generate invoice number
create or replace function public.generate_invoice_number()
returns text as $$
declare
  new_number text;
  seq integer;
begin
  -- Get next sequence number for this month
  select coalesce(
    (select max(
      cast(split_part(invoice_number, '-', 3) as integer)
    ) from public.invoices
    where invoice_number like 'INV-' || to_char(current_date, 'YYYYMM') || '%'),
    0
  ) + 1 into seq;

  new_number := 'INV-' || to_char(current_date, 'YYYYMM') || '-' || lpad(seq::text, 4, '0');
  return new_number;
end;
$$ language plpgsql;

-- Function to create invoice for subscription period
create or replace function public.create_subscription_invoice(
  p_pharmacy_id uuid,
  p_subscription_id uuid,
  p_amount numeric,
  p_period_start date,
  p_period_end date,
  p_due_date date default null,
  p_notes text default null
)
returns uuid as $$
declare
  v_invoice_id uuid;
  v_invoice_number text;
begin
  v_invoice_number := public.generate_invoice_number();

  insert into public.invoices (
    pharmacy_id,
    subscription_id,
    invoice_number,
    amount,
    period_start,
    period_end,
    status,
    due_date,
    notes
  ) values (
    p_pharmacy_id,
    p_subscription_id,
    v_invoice_number,
    p_amount,
    p_period_start,
    p_period_end,
    'pending',
    coalesce(p_due_date, p_period_end),
    p_notes
  ) returning id into v_invoice_id;

  return v_invoice_id;
end;
$$ language plpgsql;

-- Trigger to auto-update subscription updated_at
create or replace function public.update_subscription_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_update_subscription_timestamp
  before update on public.pharmacy_subscriptions
  for each row
  execute function public.update_subscription_timestamp();

-- ============================================
-- SEED DATA: Default Subscription Plans
-- ============================================

-- Free Plan
insert into public.subscription_plans (name, description, price_monthly, price_yearly, max_tokens_per_month, max_schedules, max_doctors, features, is_default)
values (
  'Free',
  'Basic plan for small pharmacies',
  0,
  0,
  50,
  5,
  3,
  '["basic_queue", "patient_registry", "whatsapp_sharing"]'::jsonb,
  true
);

-- Basic Plan (₹499/month)
insert into public.subscription_plans (name, description, price_monthly, price_yearly, max_tokens_per_month, max_schedules, max_doctors, features)
values (
  'Basic',
  'For growing pharmacies with regular doctor visits',
  499,
  4990,
  200,
  15,
  5,
  '["basic_queue", "patient_registry", "whatsapp_sharing", "analytics_basic", "payment_tracking", "tamil_language"]'::jsonb
);

-- Pro Plan (₹999/month)
insert into public.subscription_plans (name, description, price_monthly, price_yearly, max_tokens_per_month, max_schedules, max_doctors, features)
values (
  'Pro',
  'For busy pharmacies with multiple doctors',
  999,
  9990,
  0,
  0,
  0,
  '["basic_queue", "patient_registry", "whatsapp_sharing", "analytics_advanced", "payment_tracking", "tamil_language", "priority_support", "custom_reports", "export_data"]'::jsonb
);

-- ============================================
-- COMMENTS
-- ============================================

comment on table public.subscription_plans is 'Subscription plan tiers for pharmacies';
comment on table public.pharmacy_subscriptions is 'Active subscription for each pharmacy';
comment on table public.usage_logs is 'Daily usage tracking for billing and analytics';
comment on table public.invoices is 'Manual invoice tracking (no payment gateway)';
comment on table public.subscription_change_requests is 'Pharmacy requests to change subscription plans';
comment on function public.reset_monthly_usage is 'Reset monthly token counters - call on 1st of month';
comment on function public.can_create_token is 'Check if pharmacy has remaining token quota';
comment on function public.increment_token_usage is 'Increment token usage counter after creating token';
