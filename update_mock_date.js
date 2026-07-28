const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateMockDataDate() {
  console.log('Atualizando a data das cirurgias de teste para 14/07/2026...');
  
  const { data, error } = await supabase
    .from('surgeries')
    .update({ date: '2026-07-14' })
    .eq('sheet_name', 'Mock Data Real');

  if (error) {
    console.error('Erro ao atualizar:', error);
  } else {
    console.log('Data das cirurgias de teste atualizada com sucesso!');
  }
}

updateMockDataDate();
