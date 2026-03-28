import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let supabaseServerClient = null;

export async function createClient() {
  if (supabaseServerClient) return supabaseServerClient;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy';

  supabaseServerClient = createSupabaseClient(url, key);
  return supabaseServerClient;
}
