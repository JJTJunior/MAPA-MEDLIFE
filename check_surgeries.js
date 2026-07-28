const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function run() {
  const { data, error } = await supabase
    .from('surgeries')
    .select('id, date, created_at')
    .gte('date', '2026-03-01')
    .lte('date', '2026-03-31');

  if (error) {
    console.error("Erro:", error);
    return;
  }
  
  if (data && data.length > 0) {
      console.log("Exemplo de created_at para Março:", data[0].created_at);
      
      const countsByCreatedAt = {};
      data.forEach(r => {
          const ca = r.created_at ? r.created_at.substring(0, 16) : 'null';
          countsByCreatedAt[ca] = (countsByCreatedAt[ca] || 0) + 1;
      });
      console.log("Contagem por data de criação (minuto):", countsByCreatedAt);
  } else {
      console.log("Nenhum registro encontrado em Março");
  }
}

run();
