const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function run() {
  console.log("Limpando cadastros órfãos (que não possuem mais cirurgias)...");

  // 1. Pegar todos os valores em uso atualmente nas cirurgias
  const { data: surgeries, error } = await supabase
    .from('surgeries')
    .select('doctor, hospital, insurance, material_procedure, surgery_code, salesperson, instrumentalist1, instrumentalist2');

  if (error) {
    console.error("Erro ao buscar cirurgias:", error);
    return;
  }

  const used = {
    medicos: new Set(),
    hospitais: new Set(),
    convenios: new Set(),
    procedimentos: new Set(),
    codigos_cirurgia: new Set(),
    vendedores: new Set(),
    instrumentadores: new Set(),
  };

  surgeries.forEach(s => {
    if (s.doctor) used.medicos.add(s.doctor.trim().toUpperCase());
    if (s.hospital) used.hospitais.add(s.hospital.trim().toUpperCase());
    if (s.insurance) used.convenios.add(s.insurance.trim().toUpperCase());
    if (s.material_procedure) used.procedimentos.add(s.material_procedure.trim().toUpperCase());
    if (s.surgery_code) used.codigos_cirurgia.add(s.surgery_code.trim().toUpperCase());
    if (s.salesperson) used.vendedores.add(s.salesperson.trim().toUpperCase());
    
    // Na tabela de surgeries o campo antigo era instrumentalist (eu vi na migração q eles usam instrumentalist1/2 tbm, vou checar ambos)
    if (s.instrumentalist1) used.instrumentadores.add(s.instrumentalist1.trim().toUpperCase());
    if (s.instrumentalist2) used.instrumentadores.add(s.instrumentalist2.trim().toUpperCase());
    if (s.instrumentalist) used.instrumentadores.add(s.instrumentalist.trim().toUpperCase()); // caso haja
  });

  async function cleanupTable(tableName, usedSet) {
    const { data: allItems } = await supabase.from(tableName).select('id, name');
    if (!allItems) return;

    const toDelete = allItems.filter(item => {
      // Se o nome não está no Set de usados, ele é órfão
      return item.name && !usedSet.has(item.name.trim().toUpperCase());
    });

    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map(i => i.id);
      
      // Apaga em lotes (embora IN geralmente aceite centenas)
      const { error: delError } = await supabase
        .from(tableName)
        .delete()
        .in('id', idsToDelete);
        
      if (delError) {
        console.error(`Erro ao apagar de ${tableName}:`, delError);
      } else {
        console.log(`Removidos ${toDelete.length} itens órfãos de '${tableName}'.`);
      }
    } else {
      console.log(`Nenhum item órfão em '${tableName}'.`);
    }
  }

  await cleanupTable('medicos', used.medicos);
  await cleanupTable('hospitais', used.hospitais);
  await cleanupTable('convenios', used.convenios);
  await cleanupTable('procedimentos', used.procedimentos);
  await cleanupTable('codigos_cirurgia', used.codigos_cirurgia);
  await cleanupTable('vendedores', used.vendedores);
  await cleanupTable('instrumentadores', used.instrumentadores);

  console.log("Limpeza concluída!");
}

run();
