const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    
    const result = await client.query(`SELECT COUNT(*) FROM public.audit_logs;`);
    console.log('Total de logs no banco:', result.rows[0].count);

    const rls = await client.query(`SELECT relrowsecurity FROM pg_class WHERE relname = 'audit_logs';`);
    console.log('RLS habilitado em audit_logs?', rls.rows[0]?.relrowsecurity);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main();
