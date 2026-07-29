const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yslaetfxnsdgntqiqbxa.supabase.co';
const supabaseKey = 'sb_publishable_SbGEToIs2nHojuQG2DGEig_eRNQw5iF';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('surgeries').select('comanda_urls').limit(10);
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  console.log(data);
}

run();
