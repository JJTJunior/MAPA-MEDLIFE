require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrateOtherFields() {
  console.log('Fetching existing surgeries to extract distinct names...');
  
  const { data, error } = await supabase
    .from('surgeries')
    .select('hospital, insurance, material_procedure, surgery_code');
    
  if (error) {
    console.error('Error fetching surgeries:', error);
    return;
  }
  
  const hSet = new Set();
  const cSet = new Set();
  const pSet = new Set();
  const cdSet = new Set();
  
  data.forEach(row => {
    if (row.hospital && row.hospital.trim() !== '') hSet.add(row.hospital.trim().toUpperCase());
    if (row.insurance && row.insurance.trim() !== '') cSet.add(row.insurance.trim().toUpperCase());
    if (row.material_procedure && row.material_procedure.trim() !== '') pSet.add(row.material_procedure.trim().toUpperCase());
    if (row.surgery_code && row.surgery_code.trim() !== '') cdSet.add(row.surgery_code.trim().toUpperCase());
  });
  
  const arr = (set) => Array.from(set).map(name => ({ name }));
  const hospitais = arr(hSet);
  const convenios = arr(cSet);
  const procedimentos = arr(pSet);
  const codigos = arr(cdSet);
  
  console.log(`Found ${hospitais.length} hospitais, ${convenios.length} convenios, ${procedimentos.length} procedimentos, ${codigos.length} codigos.`);
  
  const insertData = async (table, items) => {
    if (items.length === 0) return;
    console.log(`Inserting ${items.length} into ${table}...`);
    const { error: err } = await supabase.from(table).upsert(items, { onConflict: 'name', ignoreDuplicates: true });
    if (err) console.error(`Error inserting ${table}:`, err);
    else console.log(`${table} inserted successfully.`);
  };

  await insertData('hospitais', hospitais);
  await insertData('convenios', convenios);
  await insertData('procedimentos', procedimentos);
  await insertData('codigos_cirurgia', codigos);
  
  console.log('Migration complete!');
}

migrateOtherFields();
