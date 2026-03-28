-- ============================================
-- TOWN CARE - Analytics Schema (MVP)
-- Run: node scripts/run-migration.js analytics
-- ============================================

-- ============================================
-- 1. MATERIALIZED VIEW: Daily Token Stats
-- ============================================
CREATE OR REPLACE MATERIALIZED VIEW mv_daily_token_stats AS
SELECT
  DATE(t.created_at) as stat_date,
  s.pharmacy_id,
  s.doctor_id,
  d.name as doctor_name,
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE t.status = 'completed') as completed_tokens,
  COUNT(*) FILTER (WHERE t.status = 'waiting') as waiting_tokens,
  COUNT(*) FILTER (WHERE t.status = 'in_consultation') as in_consultation_tokens,
  COUNT(*) FILTER (WHERE t.status = 'skipped' OR t.status = 'cancelled') as cancelled_tokens,
  COUNT(*) FILTER (WHERE t.booking_type = 'walk_in') as walkin_tokens,
  COUNT(*) FILTER (WHERE t.booking_type = 'phone') as phone_tokens
FROM tokens t
JOIN schedules s ON t.schedule_id = s.id
LEFT JOIN doctors d ON s.doctor_id = d.id
GROUP BY DATE(t.created_at), s.pharmacy_id, s.doctor_id, d.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_token_stats
  ON mv_daily_token_stats(stat_date, pharmacy_id, doctor_id);

-- ============================================
-- 2. MATERIALIZED VIEW: Patient Retention
-- ============================================
CREATE OR REPLACE MATERIALIZED VIEW mv_patient_retention AS
SELECT
  p.id as patient_id,
  p.phone,
  p.name,
  p.town_name,
  COUNT(t.id) as total_visits,
  MIN(DATE(t.created_at)) as first_visit,
  MAX(DATE(t.created_at)) as last_visit,
  COUNT(DISTINCT s.pharmacy_id) as pharmacies_visited,
  COUNT(DISTINCT s.doctor_id) as doctors_visited
FROM patients p
JOIN tokens t ON p.id = t.patient_id
JOIN schedules s ON t.schedule_id = s.id
GROUP BY p.id, p.phone, p.name, p.town_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_patient_retention
  ON mv_patient_retention(patient_id);

CREATE INDEX IF NOT EXISTS idx_mv_patient_retention_visits
  ON mv_patient_retention(total_visits DESC);

-- ============================================
-- 3. MATERIALIZED VIEW: Doctor Performance
-- ============================================
CREATE OR REPLACE MATERIALIZED VIEW mv_doctor_performance AS
SELECT
  d.id as doctor_id,
  d.name as doctor_name,
  d.specialty,
  s.pharmacy_id,
  ph.name as pharmacy_name,
  DATE(s.schedule_date) as schedule_date,
  COUNT(t.id) as total_tokens,
  COUNT(*) FILTER (WHERE t.status = 'completed') as completed_tokens,
  COUNT(*) FILTER (WHERE t.status = 'waiting') as waiting_tokens,
  MAX(s.delay_minutes) as max_delay_minutes,
  s.start_time,
  s.end_time
FROM doctors d
JOIN schedules s ON d.id = s.doctor_id
JOIN pharmacies ph ON s.pharmacy_id = ph.id
LEFT JOIN tokens t ON s.id = t.schedule_id
GROUP BY d.id, d.name, d.specialty, s.pharmacy_id, ph.name, s.schedule_date, s.start_time, s.end_time, s.delay_minutes;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_doctor_performance
  ON mv_doctor_performance(doctor_id, pharmacy_id, schedule_date);

-- ============================================
-- 4. HELPER FUNCTION: Refresh Analytics Views
-- ============================================
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_daily_token_stats;
  REFRESH MATERIALIZED VIEW mv_patient_retention;
  REFRESH MATERIALIZED VIEW mv_doctor_performance;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. SEED INITIAL DATA
-- ============================================
DO $$
BEGIN
  -- Refresh materialized views
  REFRESH MATERIALIZED VIEW mv_daily_token_stats;
  REFRESH MATERIALIZED VIEW mv_patient_retention;
  REFRESH MATERIALIZED VIEW mv_doctor_performance;
END $$;
