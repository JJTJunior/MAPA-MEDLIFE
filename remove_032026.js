const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERRO: SUPABASE_URL e chaves precisam estar configurados no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function run() {
  console.log("Removendo registros importados do Mês 03/2026...");
  
  const { data, error, count } = await supabase
    .from('surgeries')
    .delete({ count: 'exact' })
    .gte('date', '2026-03-01')
    .lte('date', '2026-03-31');

  if (error) {
    console.error("Erro ao remover registros:", error);
    return;
  }
  
  console.log(`Sucesso! ${count || (data ? data.length : 'Vários')} registros referentes a 03/2026 foram removidos.`);
}

run();
