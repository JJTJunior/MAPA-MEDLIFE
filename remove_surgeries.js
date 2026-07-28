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
  console.log("Removendo cirurgias de teste...");
  const { data: d1, error: e1, count: c1 } = await supabase
    .from('surgeries')
    .delete({ count: 'exact' })
    .ilike('patient', '%teste%');
    
  if (e1) console.error("Erro teste:", e1);
  else console.log(`Removidas ${c1 || (d1 ? d1.length : 0)} cirurgias de teste.`);

  console.log("Removendo cirurgias de 07/2026...");
  const { data: d2, error: e2, count: c2 } = await supabase
    .from('surgeries')
    .delete({ count: 'exact' })
    .gte('date', '2026-07-01')
    .lte('date', '2026-07-31');
    
  if (e2) console.error("Erro 07/2026:", e2);
  else console.log(`Removidas ${c2 || (d2 ? d2.length : 0)} cirurgias de 07/2026.`);
}

run();
