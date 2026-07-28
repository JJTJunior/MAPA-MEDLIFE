const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    await client.connect();
    const res = await client.query(`SELECT email, encrypted_password FROM auth.users WHERE email = 'aline@medlifebrasil.com'`);
    console.log(res.rows[0]);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}
main();
