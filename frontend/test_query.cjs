const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yslaetfxnsdgntqiqbxa.supabase.co';
const supabaseKey = 'sb_publishable_SbGEToIs2nHojuQG2DGEig_eRNQw5iF';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { count, error } = await supabase
    .from('surgeries')
    .select('*', { count: 'exact', head: true })
    .eq('comanda_urls', '{}')
    .not('status', 'ilike', 'SUSPENSA');
  
  if (error) {
    console.error('Error fetching data:', error);
  } else {
    console.log('Count not SUSPENSA:', count);
  }
}

run();
