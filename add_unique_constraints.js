const { Client } = require('pg');
const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function fixConstraints() {
  await client.connect();
  const tables = ['vendedores', 'medicos', 'instrumentadores', 'hospitais', 'convenios', 'surgery_types', 'procedimentos', 'codigos_cirurgia', 'status'];
  
  for (const t of tables) {
    try {
      console.log(`Adding UNIQUE constraint to ${t}...`);
      await client.query(`ALTER TABLE public.${t} ADD CONSTRAINT ${t}_name_key UNIQUE (name);`);
      console.log(`Success for ${t}`);
    } catch (e) {
      console.log(`Skipped ${t}: ${e.message}`);
    }
  }
  await client.end();
}

fixConstraints().catch(console.error);
