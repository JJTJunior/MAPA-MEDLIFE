const { Client } = require('pg');
const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function test() {
  await client.connect();
  const res = await client.query("SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('medicos', 'vendedores', 'hospitais')");
  console.log('Tables RLS:', res.rows);
  const pol = await client.query("SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('medicos', 'vendedores', 'hospitais')");
  console.log('Policies:', pol.rows);
  await client.end();
}
test().catch(console.error);
