import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey } from '@/config/supabase';

// Singleton Supabase client
let supabaseClient: any = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, publicAnonKey);
  }
  return supabaseClient;
}
