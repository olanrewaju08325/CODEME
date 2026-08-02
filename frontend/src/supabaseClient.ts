import { createClient } from '@supabase/supabase-js'

declare const process: {
  env: {
    SUPABASE_PROJECT_URL: string;
    SUPABASE_ANON_KEY: string;
  }
}

const supabaseUrl = process.env.SUPABASE_PROJECT_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Ensure your .env configuration is correct.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
