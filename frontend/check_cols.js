import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yslaetfxnsdgntqiqbxa.supabase.co';
const supabaseAnonKey = 'sb_publishable_SbGEToIs2nHojuQG2DGEig_eRNQw5iF';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addEquipmentColumn() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: 'ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS equipment_urls text[] DEFAULT \'{}\';'
  });
  console.log('RPC execute_sql response:', data, error);
  
  const { data: surgeries, error: sErr } = await supabase.from('surgeries').select('*').limit(1);
  if (surgeries && surgeries.length > 0) {
    console.log('Columns in surgeries now:', Object.keys(surgeries[0]));
  } else {
    console.error('sErr:', sErr);
  }
}

addEquipmentColumn();
