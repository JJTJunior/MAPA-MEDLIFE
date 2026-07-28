require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('surgeries')
    .select('id, status')
    .ilike('status', '%ELETIVA%');
    
  if (error) {
    console.error(error);
  } else {
    console.log('Found:', data.length);
    if(data.length > 0) {
      console.log('Sample:', data[0]);
      
      const { data: updateData, error: updateError } = await supabase
        .from('surgeries')
        .update({ status: '??|APROVADA' })
        .ilike('status', '%ELETIVA%');
        
      if(updateError) console.error(updateError);
      else console.log('Updated successfully');
    }
  }
}
run();
