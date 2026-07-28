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
    await client.query(`DELETE FROM user_profiles WHERE email = 'aline@medlifebrasil.com'`);
    await client.query(`DELETE FROM auth.identities WHERE email = 'aline@medlifebrasil.com'`);
    await client.query(`DELETE FROM auth.users WHERE email = 'aline@medlifebrasil.com'`);
    console.log('Deleted aline!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}
main();
