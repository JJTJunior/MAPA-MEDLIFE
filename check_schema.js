const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'auth' AND table_name = 'users'
    `);
    console.log(res.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}
main();
