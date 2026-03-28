'use server';

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy';
const supabase = createClient(url, key);

// ==========================================
// PHARMACY AUTH
// ==========================================
export async function loginAction(formData) {
  const email = formData.get('email');
  const password = formData.get('password');

  // Find user
  const { data: user } = await supabase.from('app_users').select('*').eq('email', email).single();
  if (!user) return { error: 'Invalid email or password' };

  // Check password
  const isValid = bcrypt.compareSync(password, user.password);
  if (!isValid) return { error: 'Invalid email or password' };

  // Create session
  const { data: session, error } = await supabase.from('sessions').insert([{ user_id: user.id }]).select().single();
  if (error) return { error: 'Session creation failed' };

  const cookieStore = await cookies();
  cookieStore.set('towncare_session', session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return { success: true };
}

export async function getTowns() {
  const { data } = await supabase.from('towns').select('*').eq('is_active', true).order('name');
  return data || [];
}

export async function signupAction(formData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const name = formData.get('name');
  const town_id = formData.get('town_id');
  const town_name = formData.get('town_name');
  const phone = formData.get('phone');

  // Check if email exists
  const { data: existing } = await supabase.from('app_users').select('id').eq('email', email).single();
  if (existing) return { error: 'Email already registered' };

  // Hash password
  const hashedPassword = bcrypt.hashSync(password, 10);

  // Create user
  const { data: newUser, error: userError } = await supabase.from('app_users').insert([{
    email,
    password: hashedPassword
  }]).select().single();

  if (userError) return { error: 'Failed to create user account' };

  // Create pharmacy profile
  const { error: pharmacyError } = await supabase.from('pharmacies').insert([{
    user_id: newUser.id,
    name,
    town_id: town_id || null,
    town_name,
    phone,
    status: 'pending'
  }]);

  if (pharmacyError) return { error: 'Failed to create pharmacy profile. ' + pharmacyError.message };

  // Auto Login
  const { data: session } = await supabase.from('sessions').insert([{ user_id: newUser.id }]).select().single();
  
  const cookieStore = await cookies();
  cookieStore.set('towncare_session', session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return { success: true };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('towncare_session')?.value;
  const adminSessionId = cookieStore.get('towncare_admin_session')?.value;
  
  if (sessionId) {
    await supabase.from('sessions').delete().eq('id', sessionId);
  }
  cookieStore.delete('towncare_session');
  
  if (adminSessionId) {
    cookieStore.delete('towncare_admin_session');
  }
}

export async function getAuthUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('towncare_session')?.value;
  if (!sessionId) return null;

  const { data: session } = await supabase.from('sessions')
    .select('*, app_users(id, email)')
    .eq('id', sessionId)
    .single();

  if (!session) return null;
  return session.app_users;
}

// ==========================================
// PLATFORM ADMIN AUTH (separate table)
// ==========================================
export async function adminLoginAction(formData) {
  const email = formData.get('email');
  const password = formData.get('password');

  const { data: admin } = await supabase.from('platform_admins').select('*').eq('email', email).single();
  if (!admin) return { error: 'Invalid admin credentials' };

  const isValid = bcrypt.compareSync(password, admin.password);
  if (!isValid) return { error: 'Invalid admin credentials' };

  // Store admin ID in a separate cookie
  const cookieStore = await cookies();
  cookieStore.set('towncare_admin_session', admin.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days for admin
    path: '/',
  });

  return { success: true };
}

export async function getAdminUser() {
  const cookieStore = await cookies();
  const adminId = cookieStore.get('towncare_admin_session')?.value;
  if (!adminId) return null;

  const { data: admin } = await supabase.from('platform_admins')
    .select('id, email, name')
    .eq('id', adminId)
    .single();

  return admin || null;
}

export async function adminLogoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('towncare_admin_session');
}
