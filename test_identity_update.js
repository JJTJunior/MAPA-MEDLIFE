const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    await client.connect();
    
    console.log('Testing update on auth.identities via identity_data only...');
    try {
      await client.query(`
        UPDATE auth.identities 
        SET identity_data = jsonb_set(identity_data, '{email}', '"test@test.com"')
        WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ti@medlifebrasil.com' LIMIT 1)
      `);
      console.log('auth.identities updated successfully via identity_data');
      
      // Rollback
      await client.query(`
        UPDATE auth.identities 
        SET identity_data = jsonb_set(identity_data, '{email}', '"ti@medlifebrasil.com"')
        WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ti@medlifebrasil.com' LIMIT 1)
      `);
    } catch (e) {
      console.error('auth.identities error:', e.message);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}
main();
