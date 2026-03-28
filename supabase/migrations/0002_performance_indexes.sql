-- Performance Optimization Indexes for Town Care
-- Run: npx drizzle-kit push (will be applied automatically)

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at);

-- Pharmacies indexes
CREATE INDEX IF NOT EXISTS idx_pharmacies_user_id ON public.pharmacies(user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_status ON public.pharmacies(status);
CREATE INDEX IF NOT EXISTS idx_pharmacies_town_id ON public.pharmacies(town_id);

-- Schedules indexes (CRITICAL for performance)
CREATE INDEX IF NOT EXISTS idx_schedules_pharmacy_date ON public.schedules(pharmacy_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_pharmacy_active ON public.schedules(pharmacy_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_schedules_doctor_date ON public.schedules(doctor_id, schedule_date);

-- Tokens indexes (CRITICAL for queue performance)
CREATE INDEX IF NOT EXISTS idx_tokens_schedule_id ON public.tokens(schedule_id);
CREATE INDEX IF NOT EXISTS idx_tokens_status ON public.tokens(status);
CREATE INDEX IF NOT EXISTS idx_tokens_schedule_status ON public.tokens(schedule_id, status);
CREATE INDEX IF NOT EXISTS idx_tokens_patient_id ON public.tokens(patient_id);
CREATE INDEX IF NOT EXISTS idx_tokens_schedule_token ON public.tokens(schedule_id, token_number);
CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON public.tokens(created_at DESC);

-- Patients indexes
CREATE INDEX IF NOT EXISTS idx_patients_town_id ON public.patients(town_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(name);

-- Doctors indexes
CREATE INDEX IF NOT EXISTS idx_doctors_name ON public.doctors(name);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON public.doctors(specialty) WHERE specialty IS NOT NULL;

-- Pharmacy-Doctors link indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_doctors_pharmacy ON public.pharmacy_doctors(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_doctors_doctor ON public.pharmacy_doctors(doctor_id);

-- Edit requests indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_edit_requests_status ON public.pharmacy_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_doctor_edit_requests_status ON public.doctor_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_patient_edit_requests_status ON public.patient_edit_requests(status);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_schedules_pharmacy_date_active
  ON public.schedules(pharmacy_id, schedule_date, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tokens_waiting_order
  ON public.tokens(schedule_id, token_number)
  WHERE status = 'waiting';

CREATE INDEX IF NOT EXISTS idx_tokens_id_patient ON public.tokens(id, patient_id);

-- Update statistics for query planner
ANALYZE public.pharmacies;
ANALYZE public.sessions;
ANALYZE public.schedules;
ANALYZE public.tokens;
ANALYZE public.patients;
ANALYZE public.doctors;
ANALYZE public.pharmacy_doctors;
