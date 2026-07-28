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
    const { rows } = await client.query(`
      SELECT pg_get_functiondef(oid)
      FROM pg_proc
      WHERE proname = 'admin_create_user';
    `);
    rows.forEach(r => console.log(r.pg_get_functiondef));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}
main();
