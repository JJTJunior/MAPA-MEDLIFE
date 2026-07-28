const { Client } = require('pg');
const connectionString = 'postgresql://postgres.yslaetfxnsdgntqiqbxa:sb_secret_93cqyZ2dE4oTRGhprRplhw_DRgno5M3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function test() {
  await client.connect();
  const res = await client.query('SELECT * FROM medicos');
  console.log('Medicos in DB:', res.rows.length);
  
  const policies = await client.query("SELECT policyname, cmd FROM pg_policies WHERE tablename = 'medicos'");
  console.log('Policies:', policies.rows);
  
  const rls = await client.query("SELECT relrowsecurity FROM pg_class WHERE relname = 'medicos'");
  console.log('RLS Enforced:', rls.rows[0]);
  
  await client.end();
}

test().catch(console.error);
