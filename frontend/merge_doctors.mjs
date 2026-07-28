import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Atualizando cirurgias...');
  const { error: updateError } = await supabase
    .from('surgeries')
    .update({ doctor: 'TIAGO JUSTO' })
    .eq('doctor', 'TIAGO R JUSTOS');

  if (updateError) {
    console.error('Erro ao atualizar cirurgias:', updateError);
  } else {
    console.log('Cirurgias atualizadas com sucesso.');
  }

  console.log('Deletando cadastro antigo de médico...');
  const { error: deleteError } = await supabase
    .from('medicos')
    .delete()
    .eq('name', 'TIAGO R JUSTOS');

  if (deleteError) {
    console.error('Erro ao deletar médico:', deleteError);
  } else {
    console.log('Médico deletado com sucesso.');
  }
  
  process.exit(0);
}

run();
