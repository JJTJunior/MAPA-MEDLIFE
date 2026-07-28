const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function replaceField(field) {
  const oldVal1 = 'SEM INFORMAÇÃO';
  const oldVal2 = 'SEM INFORMACAO';
  const newVal = 'NAO INFORMADO';
  
  // Update with accent
  let { data: d1, error: e1 } = await supabase
    .from('surgeries')
    .update({ [field]: newVal })
    .eq(field, oldVal1)
    .select('id');
    
  if (e1) console.error(`Erro em ${field} (${oldVal1}):`, e1);
  else if (d1 && d1.length > 0) console.log(`Atualizados ${d1.length} registros em ${field} de ${oldVal1} para ${newVal}`);
  
  // Update without accent
  let { data: d2, error: e2 } = await supabase
    .from('surgeries')
    .update({ [field]: newVal })
    .eq(field, oldVal2)
    .select('id');
    
  if (e2) console.error(`Erro em ${field} (${oldVal2}):`, e2);
  else if (d2 && d2.length > 0) console.log(`Atualizados ${d2.length} registros em ${field} de ${oldVal2} para ${newVal}`);
}

async function renameConfig(table) {
  const oldVal1 = 'SEM INFORMAÇÃO';
  const oldVal2 = 'SEM INFORMACAO';
  const newVal = 'NAO INFORMADO';

  // Primeiro garante que NAO INFORMADO existe
  const { data: existing, error: eFind } = await supabase
    .from(table)
    .select('id')
    .eq('name', newVal);

  if (eFind) {
      console.error("Erro ao buscar", table, eFind);
      return;
  }

  if (!existing || existing.length === 0) {
      // Cria NAO INFORMADO se n existir e tiver um antigo
      const { data: old, error: eOld } = await supabase
          .from(table)
          .select('id')
          .in('name', [oldVal1, oldVal2]);
          
      if (old && old.length > 0) {
          await supabase.from(table).insert({ name: newVal });
          console.log(`Criado ${newVal} em ${table}`);
      }
  }

  // Apaga os velhos
  const { data: delData, error: eDel } = await supabase
    .from(table)
    .delete()
    .in('name', [oldVal1, oldVal2])
    .select('id');
    
  if (eDel) console.error(`Erro ao apagar ${oldVal1}/${oldVal2} em ${table}:`, eDel);
  else if (delData && delData.length > 0) console.log(`Apagado(s) ${delData.length} registro(s) de ${oldVal1}/${oldVal2} em ${table}`);
}

async function run() {
  console.log("Iniciando substituição de SEM INFORMAÇÃO por NAO INFORMADO...");

  // Update surgeries
  await replaceField('instrumentalist1');
  await replaceField('instrumentalist2');
  await replaceField('salesperson');
  await replaceField('doctor');
  await replaceField('hospital');
  await replaceField('insurance');
  await replaceField('material_procedure');
  await replaceField('surgery_code');

  // Update config tables
  const tables = ['instrumentadores', 'vendedores', 'medicos', 'hospitais', 'convenios', 'procedimentos', 'codigos_cirurgia'];
  for (const t of tables) {
      await renameConfig(t);
  }

  console.log("Substituição concluída!");
}

run();
