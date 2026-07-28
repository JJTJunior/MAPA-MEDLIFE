const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function run() {
  console.log("Atualizando cirurgias...");

  // Update instrumentalist1
  const { data: d1, error: e1 } = await supabase
    .from('surgeries')
    .update({ instrumentalist1: 'ANGELICA' })
    .eq('instrumentalist1', 'ANGÉLICA')
    .select('id');
    
  if (e1) console.error("Erro instrumentalist1:", e1);
  else console.log(`Atualizados ${d1.length} registros em instrumentalist1`);

  // Update instrumentalist2
  const { data: d2, error: e2 } = await supabase
    .from('surgeries')
    .update({ instrumentalist2: 'ANGELICA' })
    .eq('instrumentalist2', 'ANGÉLICA')
    .select('id');
    
  if (e2) console.error("Erro instrumentalist2:", e2);
  else console.log(`Atualizados ${d2.length} registros em instrumentalist2`);
  
  // Update salesperson just in case
  const { data: d3, error: e3 } = await supabase
    .from('surgeries')
    .update({ salesperson: 'ANGELICA' })
    .eq('salesperson', 'ANGÉLICA')
    .select('id');
    
  if (e3) console.error("Erro salesperson:", e3);
  else console.log(`Atualizados ${d3.length} registros em salesperson`);
  
  // Remove ANGÉLICA from instrumentadores
  const { data: d4, error: e4 } = await supabase
    .from('instrumentadores')
    .delete()
    .eq('name', 'ANGÉLICA');
    
  if (e4) console.error("Erro ao apagar instrumentador:", e4);
  else console.log("Instrumentador ANGÉLICA apagado com sucesso.");
  
  // Remove ANGÉLICA from vendedores
  const { data: d5, error: e5 } = await supabase
    .from('vendedores')
    .delete()
    .eq('name', 'ANGÉLICA');
    
  if (e5) console.error("Erro ao apagar vendedor:", e5);
  else console.log("Vendedor ANGÉLICA apagado com sucesso (se existia).");

  console.log("Correção concluída!");
}

run();
