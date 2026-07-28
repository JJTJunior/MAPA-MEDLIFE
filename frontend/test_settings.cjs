require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('type', 'status');
    
  if (error) {
    console.error(error);
  } else {
    console.log('Statuses in settings:');
    console.log(data);
  }
}
run();
