const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkMatches() {
  const filePath = 'C:\\Users\\jailt\\Downloads\\dados_validados.xlsx';
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: null });

  console.log('Total Excel rows:', data.length);
  
  // Fetch all patients from DB
  const { data: surgeries, error } = await supabase.from('surgeries').select('id, patient');
  if (error) {
    console.error('Error fetching surgeries:', error);
    return;
  }
  
  console.log('Total DB surgeries:', surgeries.length);

  let matchCount = 0;
  let missingCount = 0;
  const dbPatients = surgeries.map(s => (s.patient || '').trim().toUpperCase());

  for (const row of data) {
    const excelPatient = (row['Paciente'] || '').trim().toUpperCase();
    if (!excelPatient) continue;
    
    if (dbPatients.includes(excelPatient)) {
      matchCount++;
    } else {
      missingCount++;
    }
  }

  console.log(`Matched: ${matchCount}, Missing in DB: ${missingCount}`);
  
  if (data.length > 0) {
    console.log('Sample parsed data (first row):', JSON.stringify(data[0], null, 2));
  }
}

checkMatches();
