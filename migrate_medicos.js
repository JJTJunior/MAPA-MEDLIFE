require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrateMedicos() {
  console.log('Fetching existing surgeries to extract distinct doctors...');
  
  const { data, error } = await supabase
    .from('surgeries')
    .select('doctor');
    
  if (error) {
    console.error('Error fetching surgeries:', error);
    return;
  }
  
  const medicosSet = new Set();
  
  data.forEach(row => {
    if (row.doctor && row.doctor.trim() !== '') {
      medicosSet.add(row.doctor.trim().toUpperCase());
    }
  });
  
  const medicos = Array.from(medicosSet).map(name => ({ name }));
  
  console.log(`Found ${medicos.length} unique doctors.`);
  
  if (medicos.length > 0) {
    console.log('Inserting Medicos...');
    const { error: err1 } = await supabase.from('medicos').upsert(medicos, { onConflict: 'name', ignoreDuplicates: true });
    if (err1) console.error('Error inserting medicos:', err1);
    else console.log('Medicos inserted successfully.');
  }
  
  console.log('Migration complete!');
}

migrateMedicos();
