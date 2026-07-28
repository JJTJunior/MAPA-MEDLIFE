const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function seed() {
  const defaults = [
    { name: '🟢|Material entregue' },
    { name: '🟡|Em separação' },
    { name: '🟠|Separado para entrega' },
    { name: '🟣|Aguardando autorização' },
    { name: '🔵|Urgência' },
    { name: '🔴|Suspensa' }
  ];

  for (const item of defaults) {
    const { error } = await supabase.from('status').insert([item]);
    if (error) {
      console.log('Error inserting', item.name, error);
    } else {
      console.log('Inserted', item.name);
    }
  }
}
seed();
