
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qjltwsmmcrskzpdptvoh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqbHR3c21tY3Jza3pwZHB0dm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MDg3ODIsImV4cCI6MjA2NDE4NDc4Mn0.kS3DvK2gwBglFEwS63yy8J-Fyo-GZguty2BlMDPp0tw';

if (!SUPABASE_URL) {
  console.error('Supabase URL is not set. Please check your environment configuration.');
}
if (!SUPABASE_ANON_KEY) {
  console.error('Supabase Anon Key is not set. Please check your environment configuration.');
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);