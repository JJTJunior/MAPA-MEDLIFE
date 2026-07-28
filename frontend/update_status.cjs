require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('status')
    .update({ name: '🟣|AGENDADA' }) // or whatever emoji they want
    .eq('name', '⚪|APROVADA');

  console.log('Update result:', data, error);
}
main();
