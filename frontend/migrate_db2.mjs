import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve('.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/['`"\"]/g, '').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const mappings = [
    { text: 'entregue', icon: '🟢' },
    { text: 'suspensa', icon: '🔴' },
    { text: 'separação', icon: '🔵' },
    { text: 'separacao', icon: '🔵' },
    { text: 'separado', icon: '🟠' },
    { text: 'urgência', icon: '🟣' },
    { text: 'urgencia', icon: '🟣' },
    { text: 'aguardando', icon: '🟡' },
    { text: 'eletiva', icon: '⚪' }
  ];

  for (const mapping of mappings) {
    const { data, error } = await supabase
      .from('surgeries')
      .update({ delivery_status: mapping.icon, status_color: mapping.icon })
      .ilike('status', `%${mapping.text}%`);
      
    if (error) console.error(`Error for ${mapping.text}:`, error);
    else console.log(`Updated ${mapping.text}`);
  }
}
run();
