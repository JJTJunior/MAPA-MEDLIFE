const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fetchAllSurgeries() {
  let allSurgeries = [];
  let from = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('surgeries')
      .select('id, patient')
      .range(from, from + limit - 1);

    if (error) {
      throw error;
    }

    if (data.length > 0) {
      allSurgeries = allSurgeries.concat(data);
      from += limit;
    } else {
      hasMore = false;
    }
  }

  return allSurgeries;
}

function parseExcelDate(serial) {
  if (typeof serial !== 'number') return null;
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d.toISOString().split('T')[0];
}

function parseExcelTime(serial) {
  if (typeof serial !== 'number') {
    // try to match HH:MM
    if (typeof serial === 'string' && /^\d{2}:\d{2}$/.test(serial)) return serial;
    if (typeof serial === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(serial)) return serial.substring(0, 5);
    return null;
  }
  const totalSeconds = Math.round(serial * 86400);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function runUpdate() {
  console.log('Fetching all surgeries from DB...');
  const surgeries = await fetchAllSurgeries();
  console.log(`Found ${surgeries.length} surgeries in DB.`);

  // Create a map for fast lookup. Since patients might have duplicate names, 
  // if there are duplicates, we will update all of them for now, or just the first one?
  // Let's map patient name to array of IDs
  const patientMap = {};
  for (const s of surgeries) {
    if (!s.patient) continue;
    const name = s.patient.trim().toUpperCase();
    if (!patientMap[name]) patientMap[name] = [];
    patientMap[name].push(s.id);
  }

  console.log('Reading Excel file...');
  const filePath = 'C:\\Users\\jailt\\Downloads\\dados_validados.xlsx';
  const workbook = xlsx.readFile(filePath, { raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: true });

  console.log(`Found ${data.length} rows in Excel.`);

  let matchedCount = 0;
  let updatedCount = 0;
  let missingCount = 0;

  console.log('Starting updates...');
  
  // To avoid hitting API limits, we'll do updates sequentially or in small batches
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const excelPatient = (row['Paciente'] || '').trim().toUpperCase();
    if (!excelPatient) continue;

    const ids = patientMap[excelPatient];
    
    if (ids && ids.length > 0) {
      matchedCount++;
      
      const dateStr = parseExcelDate(row['Data']);
      const timeStr = parseExcelTime(row['Hora']);
      const doctor = row['Médico / Buco'];
      const hospital = row['Hospital'];
      const insurance = row['Convenio'];
      const procedure = row['Material Autorizado / Procedimento'];

      const updatePayload = {};
      if (dateStr) updatePayload.date = dateStr;
      if (timeStr) updatePayload.time = timeStr;
      if (doctor) updatePayload.doctor = String(doctor).trim();
      if (hospital) updatePayload.hospital = String(hospital).trim();
      if (insurance) updatePayload.insurance = String(insurance).trim();
      if (procedure) updatePayload.material_procedure = String(procedure).trim();

      if (Object.keys(updatePayload).length > 0) {
        // Update all surgeries with this exact patient name
        for (const id of ids) {
          const { error } = await supabase
            .from('surgeries')
            .update(updatePayload)
            .eq('id', id);
          
          if (error) {
            console.error(`Error updating ID ${id} for patient ${excelPatient}:`, error);
          } else {
            updatedCount++;
          }
        }
      }
    } else {
      missingCount++;
    }
    
    if ((i + 1) % 100 === 0) {
      console.log(`Processed ${i + 1}/${data.length} rows...`);
    }
  }

  console.log('--- Update Summary ---');
  console.log(`Matched excel rows: ${matchedCount}`);
  console.log(`Successfully updated DB records: ${updatedCount}`);
  console.log(`Missing in DB: ${missingCount}`);
  console.log('Finished.');
}

runUpdate();
