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
    const { rows: users } = await client.query(`SELECT * FROM auth.users WHERE email = 'instrumentacao@medlifebrasil.com'`);
    console.log('User:', users[0] ? { ...users[0], encrypted_password: users[0].encrypted_password.substring(0, 15) } : 'Not found');
    
    if (users.length > 0) {
      const { rows: idents } = await client.query(`SELECT * FROM auth.identities WHERE user_id = $1`, [users[0].id]);
      console.log('Identities:', idents);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}
main();
