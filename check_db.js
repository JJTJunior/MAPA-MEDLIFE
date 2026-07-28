const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const s = fs.readFileSync('c:/MAPA MEDLIFE/frontend/.env', 'utf8');
const urlMatch = s.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = s.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (urlMatch && keyMatch) {
  const url = urlMatch[1].trim();
  const key = keyMatch[1].trim();
  const supabase = createClient(url, key);

  async function check() {
    const { count: c1 } = await supabase.from('surgeries').select('*', { count: 'exact', head: true }).gte('date', '2026-07-01').lte('date', '2026-07-31');
    const { count: c2 } = await supabase.from('surgeries').select('*', { count: 'exact', head: true }).gte('date', '2026-07-01').lte('date', '2026-08-01');
    
    console.log('Count (01/07 to 31/07):', c1);
    console.log('Count (01/07 to 01/08):', c2);

    // Let's also check if there are surgeries with date = null
    const { count: c3 } = await supabase.from('surgeries').select('*', { count: 'exact', head: true }).is('date', null);
    console.log('Count (null dates):', c3);
    
    // Let's also check exactly on 01/08/2026
    const { count: c4 } = await supabase.from('surgeries').select('*', { count: 'exact', head: true }).eq('date', '2026-08-01');
    console.log('Count (exactly 01/08/2026):', c4);
  }
  check();
}
