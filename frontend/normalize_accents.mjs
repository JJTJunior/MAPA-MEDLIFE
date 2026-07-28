import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function removeAccents(str) {
  if (typeof str !== 'string') return str;
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function normalizeTable(tableName, columns) {
  console.log(`Buscando dados de ${tableName}...`);
  const { data, error } = await supabase.from(tableName).select('*');
  
  if (error) {
    console.error(`Erro ao buscar ${tableName}:`, error);
    return;
  }
  
  console.log(`${data.length} registros encontrados em ${tableName}. Analisando...`);
  
  let updatedCount = 0;
  
  for (const row of data) {
    let needsUpdate = false;
    const updates = {};
    
    for (const col of columns) {
      if (row[col]) {
        const cleanVal = removeAccents(row[col]);
        if (cleanVal !== row[col]) {
          updates[col] = cleanVal;
          needsUpdate = true;
        }
      }
    }
    
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', row.id);
        
      if (updateError) {
        console.error(`Erro ao atualizar linha ${row.id} em ${tableName}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }
  
  console.log(`Concluído ${tableName}: ${updatedCount} registros atualizados.`);
}

async function run() {
  await normalizeTable('medicos', ['name']);
  await normalizeTable('hospitais', ['name']);
  await normalizeTable('vendedores', ['name']);
  await normalizeTable('instrumentadores', ['name']);
  await normalizeTable('convenios', ['name']);
  await normalizeTable('procedimentos', ['name']);
  await normalizeTable('status', ['name']);
  await normalizeTable('surgery_types', ['name']);
  
  await normalizeTable('surgeries', [
    'patient',
    'doctor',
    'hospital',
    'insurance',
    'material_procedure',
    'observation',
    'surgery_code',
    'instrumentalist1',
    'instrumentalist2',
    'salesperson',
    'surgery_type',
    'status'
  ]);
  
  console.log('Processo de normalização finalizado!');
  process.exit(0);
}

run();
