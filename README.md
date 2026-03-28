# Town Care - Pharmacy Appointment SaaS

A simple, fast, and user-friendly web application for small-town pharmacies to manage their visiting doctors and token-based patient queues. 
Goodbye to notebooks and messy phone calls.

## Features

- **Auth**: Pharmacy staff login/signup via Supabase Auth
- **Doctors Registry**: A global registry of doctors. Pharmacies can search and link doctors to their clinic.
- **Schedules**: Manage daily upcoming schedules for doctors.
- **Queue Management**:
  - Live token creation (walk-ins / phone bookings).
  - Search repeat patients by phone number.
  - Automatically calculates estimated wait times and highlights delays.
- **Status Sharing**: Share private patient status links via SMS / WhatsApp.
- **Patient Public View**: A beautiful, realtime public page pointing patients to their current queue position. (No app install, no login needed!)
- **Payments**: Optional feature for pharmacies to collect token fees locally through UPI QR Code scanning.
- **Bilingual**: Seamless toggle between English and Tamil interfaces for local customers and staff.

## Technology Stack

- Next.js 14 App Router (React)
- Supabase (Postgres, Auth, Storage, Realtime)
- CSS (Custom styled aesthetic UI)
- Lucide-React (Icons)

## Setup Instructions

1. **Supabase Project Creation**: Create a new project on [Supabase](https://supabase.com).
2. **Database Setup**: Execute the query provided in `supabase/schema.sql` into the Supabase SQL Editor. This will create all necessary tables, Row Level Security (RLS) policies, and indexes.
3. **Storage Bucket**: Ensure you have created a PUBLIC storage bucket in Supabase called `upi-qr` so pharmacies can upload their UPI QRs.
4. **Environment Setup**: Copy `.env.local.example` to `.env.local` and add your Supabase URL / Anon Key.
```bash
cp .env.local.example .env.local
```
5. **Run Locally**:
```bash
npm install
npm run dev
```

6. **Deployment**: Deploy easily on Vercel by passing the two `NEXT_PUBLIC_` env variables.

Enjoy building state-of-the-art simple solutions for real world problems!
