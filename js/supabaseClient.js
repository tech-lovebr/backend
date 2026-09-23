// js/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Carrega variáveis de ambiente definidas em .env (VITE_ prefix para Vite)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL ou Anon Key não definidos. Verifique .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
