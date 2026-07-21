import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Using localStorage fallback.');
}

// We only initialize the real client if the URL is provided, otherwise we export a dummy object
// to prevent the application from crashing on import.
export const supabase = supabaseUrl 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : ({} as any);
