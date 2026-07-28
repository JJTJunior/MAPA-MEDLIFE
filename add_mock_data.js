const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMockData() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const mockSurgeries = [
    {
      patient: "Paciente Teste Eletiva",
      status: "ELETIVA",
      doctor: "Dr. Teste",
      hospital: "Hospital F",
      date: dateStr,
      time: "20:00",
      sheet_name: "Mock Data"
    },
    {
      patient: "Paciente Teste Suspensa",
      status: "SUSPENSA",
      doctor: "Dr. Teste",
      hospital: "Hospital B",
      date: dateStr,
      time: "20:00",
      sheet_name: "Mock Data"
    },
    {
      patient: "Paciente Teste Em Separação",
      status: "EM SEPARAÇÃO",
      doctor: "Dr. Teste",
      hospital: "Hospital C1",
      date: dateStr,
      time: "20:00",
      sheet_name: "Mock Data"
    },
    {
      patient: "Paciente Teste Separado",
      status: "SEPARADO PARA ENTREGAR",
      doctor: "Dr. Teste",
      hospital: "Hospital C2",
      date: dateStr,
      time: "20:00",
      sheet_name: "Mock Data"
    },
    {
      patient: "Paciente Teste Aguardando",
      status: "AGUARDANDO AUTORIZAÇÃO",
      doctor: "Dr. Teste",
      hospital: "Hospital E",
      date: dateStr,
      time: "20:00",
      sheet_name: "Mock Data"
    },
    {
      patient: "Paciente Teste Entregue",
      status: "MATERIAL ENTREGUE",
      doctor: "Dr. Teste",
      hospital: "Hospital A",
      date: dateStr,
      time: "20:00",
      sheet_name: "Mock Data"
    },
    {
      patient: "Paciente Teste Urgência",
      status: "URGÊNCIA",
      doctor: "Dr. Teste",
      hospital: "Hospital D",
      date: dateStr,
      time: "20:00",
      sheet_name: "Mock Data"
    }
  ];

  console.log('Inserting correct mock data...');
  const { data, error } = await supabase
    .from('surgeries')
    .insert(mockSurgeries);

  if (error) {
    console.error('Erro ao inserir:', error);
  } else {
    console.log('Mock data inserido com sucesso!');
  }
}

addMockData();
