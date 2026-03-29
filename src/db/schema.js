import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  date,
  time,
  integer,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const appUsers = pgTable("app_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => appUsers.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const platformAdmins = pgTable("platform_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const towns = pgTable("towns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").unique().notNull(),
  state: text("state"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const pharmacies = pgTable("pharmacies", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => appUsers.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  name: text("name").notNull(),
  townId: uuid("town_id").references(() => towns.id),
  townName: text("town_name"),
  phone: text("phone").notNull(),
  language: text("language").default("en").notNull(),
  upiQrUrl: text("upi_qr_url"),
  tokenFee: numeric("token_fee", { precision: 10, scale: 2 }).default("0"),
  paymentRequired: boolean("payment_required").default(false),
  status: text("status").default("pending"),
  showSubscription: boolean("show_subscription").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const doctors = pgTable("doctors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  specialty: text("specialty"),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const doctorEditRequests = pgTable("doctor_edit_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id")
    .references(() => doctors.id, { onDelete: "cascade" })
    .notNull(),
  pharmacyId: uuid("pharmacy_id")
    .references(() => pharmacies.id, { onDelete: "cascade" })
    .notNull(),
  suggestedName: text("suggested_name"),
  suggestedSpecialty: text("suggested_specialty"),
  suggestedPhone: text("suggested_phone"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const pharmacyDoctors = pgTable(
  "pharmacy_doctors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pharmacyId: uuid("pharmacy_id")
      .references(() => pharmacies.id, { onDelete: "cascade" })
      .notNull(),
    doctorId: uuid("doctor_id")
      .references(() => doctors.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      uniquePharmacyDoctor: unique().on(table.pharmacyId, table.doctorId),
    };
  },
);

export const schedules = pgTable("schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id")
    .references(() => pharmacies.id, { onDelete: "cascade" })
    .notNull(),
  doctorId: uuid("doctor_id")
    .references(() => doctors.id, { onDelete: "cascade" })
    .notNull(),
  scheduleDate: date("schedule_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  avgConsultationMinutes: integer("avg_consultation_minutes")
    .default(15)
    .notNull(),
  delayMinutes: integer("delay_minutes").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    relation: text("relation"),
    townId: uuid("town_id").references(() => towns.id),
    townName: text("town_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      phoneIdx: index("idx_patients_phone").on(table.phone),
    };
  },
);

export const patientEditRequests = pgTable("patient_edit_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  pharmacyId: uuid("pharmacy_id")
    .references(() => pharmacies.id, { onDelete: "cascade" })
    .notNull(),
  suggestedName: text("suggested_name"),
  suggestedPhone: text("suggested_phone"),
  suggestedTown: text("suggested_town"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const pharmacyEditRequests = pgTable("pharmacy_edit_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id")
    .references(() => pharmacies.id, { onDelete: "cascade" })
    .notNull(),
  suggestedName: text("suggested_name"),
  suggestedPhone: text("suggested_phone"),
  suggestedTownId: uuid("suggested_town_id").references(() => towns.id),
  suggestedTownName: text("suggested_town_name"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const tokens = pgTable("tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  scheduleId: uuid("schedule_id")
    .references(() => schedules.id, { onDelete: "cascade" })
    .notNull(),
  patientId: uuid("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  tokenNumber: integer("token_number").notNull(),
  bookingType: text("booking_type").default("walk_in").notNull(),
  appointmentTime: time("appointment_time"),
  status: text("status").default("waiting").notNull(),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").default("requested"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================
// SUBSCRIPTION & REPORTING TABLES
// ============================================

export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  priceMonthly: numeric("price_monthly", { precision: 10, scale: 2 }).default(
    "0",
  ),
  priceYearly: numeric("price_yearly", { precision: 10, scale: 2 }).default(
    "0",
  ),
  maxTokensPerMonth: integer("max_tokens_per_month").default(100),
  maxSchedules: integer("max_schedules").default(10),
  maxDoctors: integer("max_doctors").default(5),
  features: jsonb("features").default([]),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const pharmacySubscriptions = pgTable("pharmacy_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id")
    .references(() => pharmacies.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  planId: uuid("plan_id")
    .references(() => subscriptionPlans.id)
    .notNull(),
  status: text("status").default("active"),
  currentPeriodStart: date("current_period_start").defaultNow(),
  currentPeriodEnd: date("current_period_end"),
  tokensUsedThisMonth: integer("tokens_used_this_month").default(0),
  lastPaymentDate: date("last_payment_date"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const usageLogs = pgTable(
  "usage_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pharmacyId: uuid("pharmacy_id")
      .references(() => pharmacies.id, { onDelete: "cascade" })
      .notNull(),
    logDate: date("log_date").notNull(),
    tokensCount: integer("tokens_count").default(0),
    schedulesCount: integer("schedules_count").default(0),
    overageTokens: integer("overage_tokens").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      uniquePharmacyDate: unique().on(table.pharmacyId, table.logDate),
    };
  },
);

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id")
    .references(() => pharmacies.id, { onDelete: "cascade" })
    .notNull(),
  subscriptionId: uuid("subscription_id").references(
    () => pharmacySubscriptions.id,
    { onDelete: "set null" },
  ),
  invoiceNumber: text("invoice_number").unique().notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  status: text("status").default("pending"),
  paymentMethod: text("payment_method"),
  paymentDate: date("payment_date"),
  invoicePdfUrl: text("invoice_pdf_url"),
  notes: text("notes"),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export const subscriptionChangeRequests = pgTable(
  "subscription_change_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pharmacyId: uuid("pharmacy_id")
      .references(() => pharmacies.id, { onDelete: "cascade" })
      .notNull(),
    currentPlanId: uuid("current_plan_id").references(
      () => subscriptionPlans.id,
    ),
    requestedPlanId: uuid("requested_plan_id").references(
      () => subscriptionPlans.id,
    ),
    requestType: text("request_type"),
    status: text("status").default("pending"),
    adminNotes: text("admin_notes"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    processedBy: uuid("processed_by").references(() => appUsers.id),
  },
);

export const savedReports = pgTable("saved_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id").references(() => pharmacies.id, {
    onDelete: "cascade",
  }),
  userId: uuid("user_id")
    .references(() => appUsers.id, { onDelete: "cascade" })
    .notNull(),
  reportName: text("report_name").notNull(),
  reportType: text("report_type").notNull(),
  config: jsonb("config").default({}),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
