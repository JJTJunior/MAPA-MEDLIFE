require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrateTeams() {
  console.log('Fetching existing surgeries to extract distinct names...');
  
  const { data, error } = await supabase
    .from('surgeries')
    .select('salesperson, instrumentalist1, instrumentalist2');
    
  if (error) {
    console.error('Error fetching surgeries:', error);
    return;
  }
  
  const vendedoresSet = new Set();
  const instrumentadoresSet = new Set();
  
  data.forEach(row => {
    if (row.salesperson && row.salesperson.trim() !== '') {
      vendedoresSet.add(row.salesperson.trim().toUpperCase());
    }
    if (row.instrumentalist1 && row.instrumentalist1.trim() !== '') {
      instrumentadoresSet.add(row.instrumentalist1.trim().toUpperCase());
    }
    if (row.instrumentalist2 && row.instrumentalist2.trim() !== '') {
      instrumentadoresSet.add(row.instrumentalist2.trim().toUpperCase());
    }
  });
  
  const vendedores = Array.from(vendedoresSet).map(name => ({ name }));
  const instrumentadores = Array.from(instrumentadoresSet).map(name => ({ name }));
  
  console.log(`Found ${vendedores.length} unique vendedores and ${instrumentadores.length} unique instrumentadores.`);
  
  if (vendedores.length > 0) {
    console.log('Inserting Vendedores...');
    const { error: err1 } = await supabase.from('vendedores').upsert(vendedores, { onConflict: 'name', ignoreDuplicates: true });
    if (err1) console.error('Error inserting vendedores:', err1);
    else console.log('Vendedores inserted successfully.');
  }

  if (instrumentadores.length > 0) {
    console.log('Inserting Instrumentadores...');
    const { error: err2 } = await supabase.from('instrumentadores').upsert(instrumentadores, { onConflict: 'name', ignoreDuplicates: true });
    if (err2) console.error('Error inserting instrumentadores:', err2);
    else console.log('Instrumentadores inserted successfully.');
  }
  
  console.log('Migration complete!');
}

migrateTeams();
