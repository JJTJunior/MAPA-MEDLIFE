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
  const dateStr = new Date().toISOString().split('T')[0];
  
  const statuses = [
    { status: 'MATERIAL ENTREGUE', time: '10:00', patient: 'TESTE COR VERDE (LOTE 5)', delivery_status: '🟢', status_color: '🟢' },
    { status: 'EM SEPARAÇÃO', time: '12:00', patient: 'TESTE COR AZUL (LOTE 5)', delivery_status: '🔵', status_color: '🔵' },
    { status: 'SEPARADO PARA ENTREGAR', time: '13:00', patient: 'TESTE COR LARANJA (LOTE 5)', delivery_status: '🟠', status_color: '🟠' },
    { status: 'AGUARDANDO AUTORIZAÇÃO', time: '14:00', patient: 'TESTE COR AMARELA (LOTE 5)', delivery_status: '🟡', status_color: '🟡' },
    { status: 'URGÊNCIA', time: '15:00', patient: 'TESTE COR ROXA (LOTE 5)', delivery_status: '🟣', status_color: '🟣' },
    { status: 'SUSPENSA', time: '16:00', patient: 'TESTE COR VERMELHA (LOTE 5)', delivery_status: '🔴', status_color: '🔴' },
    { status: 'ELETIVA', time: '17:00', patient: 'TESTE COR BRANCA/CINZA (LOTE 5)', delivery_status: '⚪', status_color: '⚪' }
  ];

  const payload = statuses.map(s => ({
    patient: s.patient,
    status: s.status,
    delivery_status: s.delivery_status,
    status_color: s.status_color,
    time: s.time,
    date: dateStr,
    doctor: 'DR TESTE',
    hospital: 'HOSPITAL TESTE',
    insurance: 'TESTE',
    surgery_type: 'TESTE',
    salesperson: 'TESTE'
  }));

  const { data, error } = await supabase.from('surgeries').insert(payload);
  if (error) console.error(error);
  else console.log('Agendamentos de teste (LOTE 4) inseridos com sucesso!');
}
run();
