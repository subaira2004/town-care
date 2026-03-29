# Subscription & Reporting System - Implementation Guide

## Overview

This document describes the newly implemented subscription management and reporting system for Town Care SaaS platform.

---

## 🎯 Features Implemented

### For Platform Owners (Admin)

#### 1. Subscription Plans Management
**Route:** `/admin/subscriptions/plans`

- Create, edit, and delete subscription tiers
- Set pricing (monthly/yearly)
- Configure usage limits (tokens/month, schedules, doctors)
- Define features per plan
- Set default plan for new pharmacies

**Default Plans:**
| Plan | Price/Month | Tokens/Month | Schedules | Doctors |
|------|-------------|--------------|-----------|---------|
| Free | ₹0 | 50 | 5 | 3 |
| Basic | ₹499 | 200 | 15 | 5 |
| Pro | ₹999 | Unlimited | Unlimited | Unlimited |

#### 2. Pharmacy Subscription Assignment
**Route:** `/admin/subscriptions/pharmacies`

- View all pharmacies with subscription status
- Assign/upgrade/downgrade pharmacy plans
- Set subscription duration (1/3/6/12 months)
- Track usage vs. limits (visual progress bar)
- Mark payments as received
- Filter by active/trial/cancelled status

#### 3. Invoice Management
**Route:** `/admin/subscriptions/invoices`

- View all invoices with status filtering
- Revenue summary (Total/Pending/Overdue)
- Mark invoices as paid/overdue
- Auto-generated invoice numbers (INV-YYYYMM-####)
- View invoice details modal
- Track payment methods (cash/UPI/bank transfer)

#### 4. Revenue Dashboard
**Route:** `/admin/subscriptions/revenue`

- **Key Metrics:**
  - Total Revenue (with growth %)
  - MRR (Monthly Recurring Revenue)
  - Pending invoices amount
  - Paid invoice count
- **Plan Distribution:** Visual breakdown of pharmacies per plan
- **Top Paying Pharmacies:** Revenue ranking
- **Recent Activity:** Latest invoices
- Period filter: Week/Month/Year/All-time

---

### For Pharmacy Owners

#### 1. Subscription Status Page
**Route:** `/dashboard/subscription`

- View current plan and pricing
- **Usage Tracking:**
  - Tokens used this month vs. limit
  - Visual progress bar (color-coded: green/yellow/red)
  - Unlimited badge for Pro plans
- Plan features overview
- Upgrade plan request (requires admin approval)
- Request cancellation
- Recent invoices preview

#### 2. Invoice History
**Route:** `/dashboard/invoices`

- View all subscription invoices
- Summary cards (Total Paid/Pending/Count)
- Filter by status (all/paid/pending/overdue)
- Detailed invoice view modal
- Download PDF (placeholder for future implementation)
- Payment status badges with icons

#### 3. Reports & Analytics
**Route:** `/dashboard/reports`

Five comprehensive report types:

##### a) Daily Token Report
- Date selector for historical data
- **Summary Cards:**
  - Total tokens
  - Completed tokens
  - Waiting tokens
  - Skipped/Cancelled
  - Revenue collected
- Detailed token list with patient info
- Export to CSV

##### b) Doctor Performance Report
- Doctor-wise aggregation
- **Metrics:**
  - Total schedules
  - Total tokens handled
  - Completed tokens
  - Completion percentage
  - Total delay minutes
- Color-coded completion % (green ≥80%, yellow <80%)
- Export to CSV

##### c) Monthly Business Summary
- Month-over-month token trends
- Revenue per month
- Completed vs. total tokens
- Export to CSV

##### d) Patient Retention Report
- **Summary Metrics:**
  - Total patients
  - New patients (1 visit)
  - Repeat patients (2+ visits)
  - Retention rate %
- **Top 10 Loyal Patients:**
  - Ranked by visit count
  - Gold/Silver/Bronze medals for top 3
  - Patient name, phone, visit count
- Export to CSV

##### e) Payment Collection Report
- **Summary Cards:**
  - Total revenue
  - Cash payments count
  - UPI payments count
  - Pending payments
- Payment method breakdown visualization
- Export to CSV

---

## 🗄️ Database Schema

### New Tables

```sql
subscription_plans
- id, name, description
- price_monthly, price_yearly
- max_tokens_per_month, max_schedules, max_doctors
- features (JSONB)
- is_active, is_default

pharmacy_subscriptions
- id, pharmacy_id, plan_id
- status (active/cancelled/expired/trial/suspended)
- current_period_start, current_period_end
- tokens_used_this_month
- last_payment_date, cancelled_at

usage_logs
- id, pharmacy_id, log_date
- tokens_count, schedules_count
- overage_tokens

invoices
- id, pharmacy_id, subscription_id
- invoice_number (unique)
- amount, period_start, period_end
- status (pending/paid/overdue/cancelled)
- payment_method, payment_date, paid_at
- invoice_pdf_url, notes, due_date

subscription_change_requests
- id, pharmacy_id, current_plan_id, requested_plan_id
- request_type (upgrade/downgrade/cancel/reactivate)
- status, admin_notes
- requested_at, processed_at, processed_by

saved_reports
- id, pharmacy_id, user_id
- report_name, report_type
- config (JSONB), is_public
```

### Database Functions

```sql
reset_monthly_usage()
- Call on 1st of each month
- Resets tokens_used_this_month for all active subscriptions

can_create_token(pharmacy_id)
- Returns boolean
- Checks if pharmacy has remaining token quota
- Returns false if limit exceeded

increment_token_usage(pharmacy_id)
- Increments tokens_used_this_month
- Logs daily usage in usage_logs

generate_invoice_number()
- Auto-generates unique invoice numbers
- Format: INV-YYYYMM-####

create_subscription_invoice(...)
- Helper function to create new invoices
```

---

## 🔧 Technical Implementation

### File Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── layout.js (updated with submenu)
│   │   └── subscriptions/
│   │       ├── plans/page.js
│   │       ├── pharmacies/page.js
│   │       ├── invoices/page.js
│   │       └── revenue/page.js
│   └── dashboard/
│       ├── layout.js (updated menu)
│       ├── subscription/page.js
│       ├── invoices/page.js
│       └── reports/page.js
└── db/
    └── schema.js (updated with new models)

supabase/
└── migrations/
    └── 0004_subscription_and_reports.sql
```

### Key Components

**Admin Layout:**
- Added collapsible submenu for Subscriptions
- State management for expanded menu items
- Mobile-responsive sidebar

**Dashboard Layout:**
- Added Subscription, Invoices, and Reports menu items
- Consistent navigation across pharmacy pages

**Reports Page:**
- Tab-based interface for 5 report types
- Reusable SummaryCard component
- CSV export functionality for all reports
- Date picker for daily report

---

## 📋 Next Steps (Recommended)

### Phase 5 - Enhanced Platform Reports
- [ ] Activity Heatmap Report (pharmacy activity by town)
- [ ] Growth Trends Report (new pharmacies/month, token volume trends)
- [ ] Doctor Network Report (most linked doctors, specialty distribution)
- [ ] At-Risk Pharmacies enhancement (predictive churn analysis)

### Phase 6 - Polish & Features
- [ ] PDF generation for invoices (use library like `react-pdf`)
- [ ] Email invoice delivery (via Supabase Edge Functions)
- [ ] Automated monthly usage reset (cron job)
- [ ] Usage limit enforcement (block token creation when exceeded)
- [ ] WhatsApp invoice sharing (manual copy-paste template)
- [ ] Saved report configurations (favorite filters)
- [ ] Date range pickers for all reports (currently only daily has it)

### Future Enhancements
- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] Automated billing cycles
- [ ] Dunning management (overdue reminders)
- [ ] Multi-language reports (Tamil)
- [ ] Advanced analytics charts (use Recharts/Chart.js)
- [ ] API webhooks for subscription events

---

## 🚀 Deployment Instructions

### 1. Run Database Migration

Execute the SQL migration in Supabase SQL Editor:

**Steps:**
1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Open **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `supabase/migrations/0004_subscription_and_reports.sql`
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

**Alternative via Drizzle Kit (if configured):**
```bash
npm run db:push
```

### 2. Verify Default Plans

Check that default plans were seeded:

```sql
SELECT name, price_monthly, max_tokens_per_month 
FROM subscription_plans 
WHERE is_active = true;
```

Expected output:
- Free (₹0, 50 tokens)
- Basic (₹499, 200 tokens)
- Pro (₹999, unlimited)

### 3. Test Admin Routes

Navigate to:
- `/admin/subscriptions/plans` - View/edit plans
- `/admin/subscriptions/pharmacies` - Assign subscriptions
- `/admin/subscriptions/invoices` - Manage invoices
- `/admin/subscriptions/revenue` - Revenue dashboard

### 4. Test Pharmacy Routes

Navigate to:
- `/dashboard/subscription` - View subscription status
- `/dashboard/invoices` - View invoice history
- `/dashboard/reports` - Generate reports

### 5. Environment Variables

No new environment variables required. Existing Supabase configuration handles all new features.

---

## 📊 Usage Tracking Flow

1. **Token Creation:**
   ```
   Create Token → can_create_token() check → 
   Create token record → increment_token_usage()
   ```

2. **Monthly Reset:**
   ```
   Cron job (1st of month) → reset_monthly_usage() → 
   tokens_used_this_month = 0
   ```

3. **Invoice Generation:**
   ```
   Admin assigns subscription → create_subscription_invoice() → 
   Auto invoice number → Insert into invoices table
   ```

---

## 🔐 Security Notes

- All pharmacy data isolated by pharmacy_id
- Admin-only routes protected by admin authentication
- Pharmacy routes protected by pharmacy user authentication
- No patient-sensitive data in reports (only name, phone for identification)
- Invoice PDFs stored in Supabase Storage (future implementation)

---

## 📞 Support

For questions or issues:
1. Check Supabase logs for database errors
2. Review browser console for frontend errors
3. Verify RLS policies if data access issues occur
4. Test with sample pharmacies before production rollout

---

**Version:** 1.0.0  
**Last Updated:** March 29, 2026  
**Branch:** subs-and-reports
