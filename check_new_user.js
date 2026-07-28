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
    
    console.log('--- NEW USER (ALINE) ---');
    const res = await client.query(`SELECT * FROM auth.users WHERE email = 'aline@medlifebrasil.com'`);
    if (res.rows.length === 0) {
      console.log('User not found in auth.users');
    } else {
      console.log('User:', { ...res.rows[0], encrypted_password: res.rows[0].encrypted_password.substring(0,15) });
      const idents = await client.query(`SELECT * FROM auth.identities WHERE user_id = $1`, [res.rows[0].id]);
      console.log('Identity:', idents.rows[0]);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}
main();
