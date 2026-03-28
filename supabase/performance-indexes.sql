-- ============================================
-- TOWN CARE - Performance Optimization Indexes
-- Run this in Supabase SQL Editor AFTER the main schema
-- ============================================

-- ============================================
-- 1. PHARMACIES INDEXES
-- ============================================
-- Fast lookup by user_id (used in auth checks)
CREATE INDEX IF NOT EXISTS idx_pharmacies_user_id ON public.pharmacies(user_id);
-- Fast lookup by status (for admin approval filtering)
CREATE INDEX IF NOT EXISTS idx_pharmacies_status ON public.pharmacies(status);
-- Fast lookup by town
CREATE INDEX IF NOT EXISTS idx_pharmacies_town_id ON public.pharmacies(town_id);

-- ============================================
-- 2. SESSIONS INDEXES
-- ============================================
-- Fast session lookup (used on every request)
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
-- Clean up old sessions efficiently
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at);

-- ============================================
-- 3. SCHEDULES INDEXES (CRITICAL for performance)
-- ============================================
-- Fast lookup by pharmacy + date (dashboard loads this on every visit)
CREATE INDEX IF NOT EXISTS idx_schedules_pharmacy_date ON public.schedules(pharmacy_id, schedule_date);
-- Fast lookup for queue management
CREATE INDEX IF NOT EXISTS idx_schedules_pharmacy_active ON public.schedules(pharmacy_id, is_active) WHERE is_active = true;
-- Doctor schedule lookup
CREATE INDEX IF NOT EXISTS idx_schedules_doctor_date ON public.schedules(doctor_id, schedule_date);

-- ============================================
-- 4. TOKENS INDEXES (CRITICAL for queue performance)
-- ============================================
-- Fast lookup by schedule (queue page loads all tokens for a schedule)
CREATE INDEX IF NOT EXISTS idx_tokens_schedule_id ON public.tokens(schedule_id);
-- Fast lookup by status (filtering waiting/completed tokens)
CREATE INDEX IF NOT EXISTS idx_tokens_status ON public.tokens(status);
-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_tokens_schedule_status ON public.tokens(schedule_id, status);
-- Fast lookup by patient (patient history)
CREATE INDEX IF NOT EXISTS idx_tokens_patient_id ON public.tokens(patient_id);
-- Optimize ORDER BY token_number queries
CREATE INDEX IF NOT EXISTS idx_tokens_schedule_token ON public.tokens(schedule_id, token_number);
-- Optimize created_at queries (recent tokens)
CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON public.tokens(created_at DESC);

-- ============================================
-- 5. PATIENTS INDEXES
-- ============================================
-- Phone lookup already exists, add composite for town filtering
CREATE INDEX IF NOT EXISTS idx_patients_town_id ON public.patients(town_id);
-- Optimize search queries (name + phone)
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(name);

-- ============================================
-- 6. DOCTORS INDEXES
-- ============================================
-- Fast search by name
CREATE INDEX IF NOT EXISTS idx_doctors_name ON public.doctors(name);
-- Fast lookup by specialty
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON public.doctors(specialty) WHERE specialty IS NOT NULL;

-- ============================================
-- 7. PHARMACY_DOCTORS INDEXES
-- ============================================
-- Fast lookup by pharmacy (linked doctors)
CREATE INDEX IF NOT EXISTS idx_pharmacy_doctors_pharmacy ON public.pharmacy_doctors(pharmacy_id);
-- Fast lookup by doctor (which pharmacies use this doctor)
CREATE INDEX IF NOT EXISTS idx_pharmacy_doctors_doctor ON public.pharmacy_doctors(doctor_id);

-- ============================================
-- 8. EDIT REQUESTS INDEXES
-- ============================================
-- Fast lookup by status (admin pending requests)
CREATE INDEX IF NOT EXISTS idx_pharmacy_edit_requests_status ON public.pharmacy_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_doctor_edit_requests_status ON public.doctor_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_patient_edit_requests_status ON public.patient_edit_requests(status);

-- ============================================
-- 9. COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================
-- Dashboard query: Get today's schedules with token counts
CREATE INDEX IF NOT EXISTS idx_schedules_pharmacy_date_active
  ON public.schedules(pharmacy_id, schedule_date, is_active)
  WHERE is_active = true;

-- Queue query: Get waiting tokens in order
CREATE INDEX IF NOT EXISTS idx_tokens_waiting_order
  ON public.tokens(schedule_id, token_number)
  WHERE status = 'waiting';

-- Token status page: Quick token lookup with patient data
CREATE INDEX IF NOT EXISTS idx_tokens_id_patient ON public.tokens(id, patient_id);

-- ============================================
-- 10. VACUUM AND ANALYZE (Run after creating indexes)
-- ============================================
-- Update statistics for query planner
ANALYZE public.pharmacies;
ANALYZE public.sessions;
ANALYZE public.schedules;
ANALYZE public.tokens;
ANALYZE public.patients;
ANALYZE public.doctors;
ANALYZE public.pharmacy_doctors;

-- ============================================
-- VERIFICATION QUERY
-- Run this to see all indexes
-- ============================================
-- SELECT
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;
