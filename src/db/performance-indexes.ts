import { PgTable, pgTable, uuid, text, integer, date, time, boolean, timestamp, index } from 'drizzle-orm/pg-core';

// ============================================
// PERFORMANCE OPTIMIZATION INDEXES
// Run: npx drizzle-kit push
// ============================================

// These are "virtual" tables just for creating indexes
// They reference existing tables from schema.js

// Sessions indexes
export const sessionsUserIdIdx = index('idx_sessions_user_id').on(
  pgTable('sessions', { userId: uuid('user_id') }).userId
);

export const sessionsCreatedAtIdx = index('idx_sessions_created_at').on(
  pgTable('sessions', { createdAt: timestamp('created_at') }).createdAt
);

// Pharmacies indexes
export const pharmaciesUserIdIdx = index('idx_pharmacies_user_id').on(
  pgTable('pharmacies', { userId: uuid('user_id') }).userId
);

export const pharmaciesStatusIdx = index('idx_pharmacies_status').on(
  pgTable('pharmacies', { status: text('status') }).status
);

export const pharmaciesTownIdIdx = index('idx_pharmacies_town_id').on(
  pgTable('pharmacies', { townId: uuid('town_id') }).townId
);

// Schedules indexes (CRITICAL for performance)
export const schedulesPharmacyDateIdx = index('idx_schedules_pharmacy_date').on(
  pgTable('schedules', {
    pharmacyId: uuid('pharmacy_id'),
    scheduleDate: date('schedule_date')
  }).pharmacyId,
  pgTable('schedules', {
    pharmacyId: uuid('pharmacy_id'),
    scheduleDate: date('schedule_date')
  }).scheduleDate
);

export const schedulesPharmacyActiveIdx = index('idx_schedules_pharmacy_active')
  .on(
    pgTable('schedules', {
      pharmacyId: uuid('pharmacy_id'),
      isActive: boolean('is_active')
    }).pharmacyId,
    pgTable('schedules', {
      pharmacyId: uuid('pharmacy_id'),
      isActive: boolean('is_active')
    }).isActive
  )
  .where(sql`${pgTable('schedules', { isActive: boolean('is_active') }).isActive} = true`);

export const schedulesDoctorDateIdx = index('idx_schedules_doctor_date').on(
  pgTable('schedules', {
    doctorId: uuid('doctor_id'),
    scheduleDate: date('schedule_date')
  }).doctorId,
  pgTable('schedules', {
    doctorId: uuid('doctor_id'),
    scheduleDate: date('schedule_date')
  }).scheduleDate
);

// Tokens indexes (CRITICAL for queue performance)
export const tokensScheduleIdIdx = index('idx_tokens_schedule_id').on(
  pgTable('tokens', { scheduleId: uuid('schedule_id') }).scheduleId
);

export const tokensStatusIdx = index('idx_tokens_status').on(
  pgTable('tokens', { status: text('status') }).status
);

export const tokensScheduleStatusIdx = index('idx_tokens_schedule_status').on(
  pgTable('tokens', {
    scheduleId: uuid('schedule_id'),
    status: text('status')
  }).scheduleId,
  pgTable('tokens', {
    scheduleId: uuid('schedule_id'),
    status: text('status')
  }).status
);

export const tokensPatientIdIdx = index('idx_tokens_patient_id').on(
  pgTable('tokens', { patientId: uuid('patient_id') }).patientId
);

export const tokensScheduleTokenIdx = index('idx_tokens_schedule_token').on(
  pgTable('tokens', {
    scheduleId: uuid('schedule_id'),
    tokenNumber: integer('token_number')
  }).scheduleId,
  pgTable('tokens', {
    scheduleId: uuid('schedule_id'),
    tokenNumber: integer('token_number')
  }).tokenNumber
);

export const tokensCreatedAtIdx = index('idx_tokens_created_at').on(
  pgTable('tokens', { createdAt: timestamp('created_at') }).createdAt
);

// Patients indexes
export const patientsTownIdIdx = index('idx_patients_town_id').on(
  pgTable('patients', { townId: uuid('town_id') }).townId
);

export const patientsNameIdx = index('idx_patients_name').on(
  pgTable('patients', { name: text('name') }).name
);

// Doctors indexes
export const doctorsNameIdx = index('idx_doctors_name').on(
  pgTable('doctors', { name: text('name') }).name
);

export const doctorsSpecialtyIdx = index('idx_doctors_specialty').on(
  pgTable('doctors', { specialty: text('specialty') }).specialty
);

// Pharmacy-Doctors link indexes
export const pharmacyDoctorsPharmacyIdx = index('idx_pharmacy_doctors_pharmacy').on(
  pgTable('pharmacy_doctors', { pharmacyId: uuid('pharmacy_id') }).pharmacyId
);

export const pharmacyDoctorsDoctorIdx = index('idx_pharmacy_doctors_doctor').on(
  pgTable('pharmacy_doctors', { doctorId: uuid('doctor_id') }).doctorId
);

// Edit requests indexes
export const pharmacyEditRequestsStatusIdx = index('idx_pharmacy_edit_requests_status').on(
  pgTable('pharmacy_edit_requests', { status: text('status') }).status
);

export const doctorEditRequestsStatusIdx = index('idx_doctor_edit_requests_status').on(
  pgTable('doctor_edit_requests', { status: text('status') }).status
);

export const patientEditRequestsStatusIdx = index('idx_patient_edit_requests_status').on(
  pgTable('patient_edit_requests', { status: text('status') }).status
);

// Composite indexes for common queries
export const schedulesPharmacyDateActiveIdx = index('idx_schedules_pharmacy_date_active')
  .on(
    pgTable('schedules', {
      pharmacyId: uuid('pharmacy_id'),
      scheduleDate: date('schedule_date'),
      isActive: boolean('is_active')
    }).pharmacyId,
    pgTable('schedules', {
      pharmacyId: uuid('pharmacy_id'),
      scheduleDate: date('schedule_date'),
      isActive: boolean('is_active')
    }).scheduleDate,
    pgTable('schedules', {
      pharmacyId: uuid('pharmacy_id'),
      scheduleDate: date('schedule_date'),
      isActive: boolean('is_active')
    }).isActive
  )
  .where(sql`${pgTable('schedules', { isActive: boolean('is_active') }).isActive} = true`);

export const tokensWaitingOrderIdx = index('idx_tokens_waiting_order')
  .on(
    pgTable('tokens', {
      scheduleId: uuid('schedule_id'),
      tokenNumber: integer('token_number')
    }).scheduleId,
    pgTable('tokens', {
      scheduleId: uuid('schedule_id'),
      tokenNumber: integer('token_number')
    }).tokenNumber
  )
  .where(sql`${pgTable('tokens', { status: text('status') }).status} = 'waiting'`);

export const tokensIdPatientIdx = index('idx_tokens_id_patient').on(
  pgTable('tokens', {
    id: uuid('id'),
    patientId: uuid('patient_id')
  }).id,
  pgTable('tokens', {
    id: uuid('id'),
    patientId: uuid('patient_id')
  }).patientId
);
