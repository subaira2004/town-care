'use client';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let supabaseClient = null;

export function createClient() {
  if (supabaseClient) return supabaseClient;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy';
  
  supabaseClient = createSupabaseClient(url, key);
  return supabaseClient;
}
