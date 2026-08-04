const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestSurgery() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const mockSurgery = {
    patient: "Paciente de Teste do Sistema",
    status: "ELETIVA",
    doctor: "Dr. Exemplo",
    hospital: "Hospital Central",
    date: dateStr,
    time: "14:30",
    sheet_name: "Teste"
  };

  console.log('Conectando ao banco de dados...');
  const { data, error } = await supabase
    .from('surgeries')
    .insert([mockSurgery]);

  if (error) {
    console.error('Erro ao inserir a cirurgia:', error);
  } else {
    console.log('\n=============================================');
    console.log('SUCESSO: Cirurgia de teste inserida para HOJE!');
    console.log(`Paciente: ${mockSurgery.patient}`);
    console.log(`Data: ${dateStr} as ${mockSurgery.time}`);
    console.log('=============================================\n');
  }
}

addTestSurgery();
