import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSync() {
  const tableName = 'vendedores';
  const toInsert = [{ name: 'VENDEDOR TESTE 1' }];
  console.log(`Inserting into ${tableName}:`, toInsert);
  
  const { data, error } = await supabase.from(tableName).insert(toInsert);
  console.log('Result:', { data, error });
  
  if (error) {
    console.error('Insert error:', error);
  }
}

testSync();
