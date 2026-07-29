require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function renameStatus() {
  console.log('Renaming status in status table...');
  const { data: statusData, error: statusError } = await supabase
    .from('status')
    .select('*')
    .ilike('name', '%AGUARDANDO AUTORIZA%');
    
  if (statusError) {
    console.error('Error fetching status:', statusError);
  } else {
    for (const st of statusData) {
      let newName = st.name.replace(/AGUARDANDO AUTORIZAC[A-Z]*O/i, 'AUTORIZADAS');
      newName = newName.replace(/AGUARDANDO AUTORIZAÇÃO/i, 'AUTORIZADAS');
      const { error: updateError } = await supabase
        .from('status')
        .update({ name: newName })
        .eq('id', st.id);
      if (updateError) {
        console.error('Error updating status:', updateError);
      } else {
        console.log(`Updated status ${st.id} to ${newName}`);
      }
    }
  }

  console.log('Renaming status in surgeries table...');
  const { data: surgeriesData, error: surgeriesError } = await supabase
    .from('surgeries')
    .select('id, status')
    .ilike('status', '%AGUARDANDO AUTORIZA%');

  if (surgeriesError) {
    console.error('Error fetching surgeries:', surgeriesError);
  } else {
    console.log(`Found ${surgeriesData.length} surgeries to update.`);
    for (const surgery of surgeriesData) {
      const { error: updateError } = await supabase
        .from('surgeries')
        .update({ status: 'AUTORIZADAS' })
        .eq('id', surgery.id);
      if (updateError) {
        console.error(`Error updating surgery ${surgery.id}:`, updateError);
      } else {
        console.log(`Updated surgery ${surgery.id}`);
      }
    }
  }
  
  console.log('Done!');
}

renameStatus();
