const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('status').select('*').limit(1);
  console.log('status table:', { data, error });
  const { data: d2, error: e2 } = await supabase.from('status_cirurgia').select('*').limit(1);
  console.log('status_cirurgia table:', { data: d2, error: e2 });
}
check();
