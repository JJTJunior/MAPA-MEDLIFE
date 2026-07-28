const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const passwordDB = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${passwordDB}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    await client.connect();
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('123456', salt);
    
    await client.query(`UPDATE auth.users SET encrypted_password = $1 WHERE email = 'aline@medlifebrasil.com'`, [hash]);
    console.log('Password reset to 123456');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}
main();
