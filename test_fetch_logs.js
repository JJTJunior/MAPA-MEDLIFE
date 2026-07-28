const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './frontend/.env.local' });
require('dotenv').config({ path: './frontend/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testFetch() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      id,
      action,
      target_table,
      record_id,
      old_data,
      new_data,
      created_at,
      auth_users:user_id ( email ),
      user_profiles!audit_logs_user_id_fkey ( name )
    `)
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('Error:', error);
  console.log('Data:', data);
}

testFetch();
