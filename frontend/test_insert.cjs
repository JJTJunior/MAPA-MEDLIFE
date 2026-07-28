const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testInsert() {
  const { data, error } = await supabase.from('status').insert([{ name: '🟢|Teste Local' }]).select();
  console.log('insert error:', error);
  console.log('insert data:', data);
}
testInsert();
