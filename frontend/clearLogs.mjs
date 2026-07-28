import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function clearLogs() {
  console.log('Clearing table: audit_logs');
  const { data, error } = await supabase
    .from('audit_logs')
    .delete()
    .not('id', 'is', null);
    
  if (error) {
    console.error(`Error clearing audit_logs:`, error);
  } else {
    console.log(`Successfully cleared audit_logs`);
  }
}

clearLogs();
