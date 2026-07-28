const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanMockReferences() {
  console.log('Cleaning mock doctors...');
  const { error: err1 } = await supabase
    .from('medicos')
    .delete()
    .ilike('name', 'Dr. Teste');
  if (err1) console.error(err1);

  console.log('Cleaning mock hospitals...');
  const mockHospitals = ['Hospital A', 'Hospital B', 'Hospital C1', 'Hospital C2', 'Hospital D', 'Hospital E', 'Hospital F', 'Hospital G', 'Hospital C'];
  
  for (const h of mockHospitals) {
    const { error: err2 } = await supabase
      .from('hospitais')
      .delete()
      .ilike('name', h);
    if (err2) console.error(err2);
  }

  console.log('Done cleaning mock references!');
}

cleanMockReferences();
