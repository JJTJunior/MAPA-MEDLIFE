const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePatients() {
  console.log('Fetching all surgeries...');
  const { data: surgeries, error } = await supabase
    .from('surgeries')
    .select('id, patient');

  if (error) {
    console.error('Error fetching surgeries:', error);
    return;
  }

  console.log(`Found ${surgeries.length} surgeries.`);

  let updatedCount = 0;

  for (const surgery of surgeries) {
    if (surgery.patient && surgery.patient !== surgery.patient.toUpperCase()) {
      const newPatientName = surgery.patient.toUpperCase();
      console.log(`Updating ${surgery.patient} -> ${newPatientName}`);
      
      const { error: updateError } = await supabase
        .from('surgeries')
        .update({ patient: newPatientName })
        .eq('id', surgery.id);
        
      if (updateError) {
        console.error(`Error updating ID ${surgery.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Successfully updated ${updatedCount} records to uppercase.`);
}

updatePatients();
