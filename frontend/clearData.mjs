import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function clearData() {
  const tablesToClear = [
    'surgeries',
    'on_call',
    'medicos',
    'hospitais',
    'convenios',
    'procedimentos',
    'codigos_cirurgia',
    'vendedores',
    'instrumentadores'
  ];

  for (const table of tablesToClear) {
    console.log(`Clearing table: ${table}`);
    const { data, error } = await supabase
      .from(table)
      .delete()
      .not('id', 'is', null);
      
    if (error) {
      console.error(`Error clearing ${table}:`, error);
    } else {
      console.log(`Successfully cleared ${table}`);
    }
  }
}

clearData();
