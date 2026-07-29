const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addCrmColumn() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: 'ALTER TABLE medicos ADD COLUMN IF NOT EXISTS crm TEXT;'
  });
  console.log('RPC response:', data, error);
  
  const { data: d, error: e } = await supabase.from('medicos').select('*').limit(1);
  console.log('Medicos schema test:', d, e);
}

addCrmColumn();
