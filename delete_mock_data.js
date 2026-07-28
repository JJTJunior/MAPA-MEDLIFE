const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteMockData() {
  console.log('Deleting mock data...');
  const { data, error } = await supabase
    .from('surgeries')
    .delete()
    .eq('sheet_name', 'Mock Data');

  if (error) {
    console.error('Erro ao deletar:', error);
  } else {
    console.log('Mock data deletado com sucesso!');
  }
}

deleteMockData();
