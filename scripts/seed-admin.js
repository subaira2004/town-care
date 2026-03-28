import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const ADMIN_EMAIL = process.argv[2] || 'admin@towncare.in';
const ADMIN_PASSWORD = process.argv[3] || 'admin123';
const ADMIN_NAME = process.argv[4] || 'Platform Owner';

async function seed() {
  const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  
  const { data: existing } = await supabase.from('platform_admins').select('id').eq('email', ADMIN_EMAIL).single();
  if (existing) {
    console.log(`Admin "${ADMIN_EMAIL}" already exists. Skipping.`);
    process.exit(0);
  }

  const { data, error } = await supabase.from('platform_admins').insert([{
    email: ADMIN_EMAIL,
    password: hashedPassword,
    name: ADMIN_NAME
  }]).select().single();

  if (error) {
    console.error('Failed to create admin:', error.message);
    process.exit(1);
  }

  console.log(`✅ Platform Admin created!`);
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Login at: http://localhost:3000/admin/login`);
}

seed();
