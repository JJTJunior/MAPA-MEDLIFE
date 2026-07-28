const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addRealisticMockData() {
  console.log('Buscando um médico e hospital reais...');
  
  // Buscar 1 médico real
  const { data: medicos, error: errMed } = await supabase
    .from('medicos')
    .select('name')
    .limit(1);
    
  if (errMed || !medicos || medicos.length === 0) {
    console.log('Não foi possível encontrar um médico na base.');
    return;
  }
  const realDoctor = medicos[0].name;

  // Buscar 1 hospital real
  const { data: hospitais, error: errHosp } = await supabase
    .from('hospitais')
    .select('name')
    .limit(1);
    
  if (errHosp || !hospitais || hospitais.length === 0) {
    console.log('Não foi possível encontrar um hospital na base.');
    return;
  }
  const realHospital = hospitais[0].name;

  console.log(`Usando Médico: ${realDoctor} | Hospital: ${realHospital}`);

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const mockSurgeries = [
    {
      patient: "Paciente Teste Eletiva",
      status: "ELETIVA",
      doctor: realDoctor,
      hospital: realHospital,
      date: dateStr,
      time: "20:00",
      sheet_name: "Mock Data Real"
    },
    {
      patient: "Paciente Teste Suspensa",
      status: "SUSPENSA",
      doctor: realDoctor,
      hospital: realHospital,
      date: dateStr,
      time: "20:00",
      sheet_name: "Mock Data Real"
    },
    {
      patient: "Paciente Teste Em Separação",
      status: "EM SEPARAÇÃO",
      doctor: realDoctor,
      hospital: realHospital,
      date: dateStr,
      time: "20:00",
      sheet_name: "Mock Data Real"
    },
    {
      patient: "Paciente Teste Separado",
      status: "SEPARADO PARA ENTREGAR",
      doctor: realDoctor,
      hospital: realHospital,
      date: dateStr,
      time: "20:00",
      sheet_name: "Mock Data Real"
    },
    {
      patient: "Paciente Teste Aguardando",
      status: "AGUARDANDO AUTORIZAÇÃO",
      doctor: realDoctor,
      hospital: realHospital,
      date: dateStr,
      time: "20:00",
      sheet_name: "Mock Data Real"
    },
    {
      patient: "Paciente Teste Entregue",
      status: "MATERIAL ENTREGUE",
      doctor: realDoctor,
      hospital: realHospital,
      date: dateStr,
      time: "20:00",
      sheet_name: "Mock Data Real"
    },
    {
      patient: "Paciente Teste Urgência",
      status: "URGÊNCIA",
      doctor: realDoctor,
      hospital: realHospital,
      date: dateStr,
      time: "20:00",
      sheet_name: "Mock Data Real"
    }
  ];

  console.log('Inserindo cirurgias de teste...');
  const { data, error } = await supabase
    .from('surgeries')
    .insert(mockSurgeries);

  if (error) {
    console.error('Erro ao inserir:', error);
  } else {
    console.log('Mock data REAL inserido com sucesso!');
  }
}

addRealisticMockData();
