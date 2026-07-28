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
  console.log("Atualizando cirurgias com 'BUCO MAXIMO' ou 'BUCO MAXILO' na coluna surgery_type...");
  const { data: d1, error: e1 } = await supabase
    .from('surgeries')
    .update({ surgery_type: 'BUCOMAXILO' })
    .in('surgery_type', ['BUCO MAXIMO', 'BUCO MAXILO']);
    
  if (e1) console.error("Erro update surgery_type:", e1);
  else console.log(`Atualização de surgery_type concluída.`);

  console.log("Removendo 'BUCO MAXIMO' ou 'BUCO MAXILO' de surgery_types...");
  const { data: d2, error: e2 } = await supabase
    .from('surgery_types')
    .delete()
    .in('name', ['BUCO MAXIMO', 'BUCO MAXILO']);
    
  if (e2) console.error("Erro deletando surgery_types:", e2);
  else console.log(`Deleção de surgery_types antiga concluída.`);

  console.log("Ajuste finalizado.");
}

run();
