const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking connection...');
  const { data, error } = await supabase
    .from('surgeries')
    .select('*')
    .limit(1);

  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
      console.log('Tabela "surgeries" NÃO existe no banco de dados.');
    } else {
      console.error('Erro ao conectar ao Supabase:', error);
    }
  } else {
    console.log('Conexão bem sucedida! Tabela "surgeries" já existe. Registros encontrados:', data.length);
  }
}

check();
