-- ============================================
-- TOWN CARE - Custom Authentication Schema
-- Run this in Supabase SQL Editor
-- WARNING: This schema drops Supabase Auth and RLS. 
-- Data security is handled via Next.js Server Actions.
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- 0. CUSTOM APP USERS & SESSIONS
-- ============================================
create table public.app_users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password text not null,
  created_at timestamptz default now()
);

create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.app_users(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- ============================================
-- 1. PHARMACIES
-- ============================================
create table public.pharmacies (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.app_users(id) on delete cascade not null unique,
  name text not null,
  town text not null,
  phone text not null,
  language text not null default 'en' check (language in ('en', 'ta', 'both')),
  upi_qr_url text,
  token_fee numeric(10,2) default 0,
  payment_required boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- 2. DOCTORS (Global Registry)
-- ============================================
create table public.doctors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  specialty text,
  phone text,
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- 3. PHARMACY-DOCTOR LINK
-- ============================================
create table public.pharmacy_doctors (
  id uuid primary key default uuid_generate_v4(),
  pharmacy_id uuid references public.pharmacies(id) on delete cascade not null,
  doctor_id uuid references public.doctors(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(pharmacy_id, doctor_id)
);

-- ============================================
-- 4. SCHEDULES (Doctor Daily Schedule per Pharmacy)
-- ============================================
create table public.schedules (
  id uuid primary key default uuid_generate_v4(),
  pharmacy_id uuid references public.pharmacies(id) on delete cascade not null,
  doctor_id uuid references public.doctors(id) on delete cascade not null,
  schedule_date date not null,
  start_time time not null,
  end_time time not null,
  avg_consultation_minutes integer not null default 15,
  delay_minutes integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- 5. PATIENTS (Phone-based, Global)
-- ============================================
create table public.patients (
  id uuid primary key default uuid_generate_v4(),
  phone text not null,
  name text not null,
  relation text,
  created_at timestamptz default now()
);

-- Index for quick phone lookups
create index if not exists idx_patients_phone on public.patients(phone);

-- ============================================
-- 6. TOKENS (Queue Entries)
-- ============================================
create table public.tokens (
  id uuid primary key default uuid_generate_v4(),
  schedule_id uuid references public.schedules(id) on delete cascade not null,
  patient_id uuid references public.patients(id) on delete cascade not null,
  token_number integer not null,
  booking_type text not null default 'walk_in' check (booking_type in ('walk_in', 'phone')),
  status text not null default 'waiting' check (status in ('waiting', 'in_consultation', 'completed', 'skipped', 'cancelled')),
  payment_method text check (payment_method in ('cash', 'upi', null)),
  payment_status text default 'requested' check (payment_status in ('requested', 'paid', null)),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- NO ROW LEVEL SECURITY 
-- Architecture changed to handle auth locally in Next.js Server Actions
-- ============================================

-- If migrating from old, run these to turn off RLS:
-- alter table public.pharmacies disable row level security;
-- alter table public.doctors disable row level security;
-- alter table public.pharmacy_doctors disable row level security;
-- alter table public.schedules disable row level security;
-- alter table public.patients disable row level security;
-- alter table public.tokens disable row level security;
