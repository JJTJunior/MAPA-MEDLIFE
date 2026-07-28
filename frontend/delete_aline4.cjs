const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    await client.connect();
    
    // Delete aline4
    await client.query(`DELETE FROM auth.users WHERE email = 'aline4@medlifebrasil.com'`);
    
    console.log('aline4 deleted successfully.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}
main();
