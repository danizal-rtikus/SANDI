import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fznhvuyplojsvcodxfkk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_8kuEfbZU64XFihkNdDI7gQ_jpRHGc6e';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
