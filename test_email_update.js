const { Client } = require('pg');

const password = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${password}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    await client.connect();
    
    // Check if the error is from auth.users or user_profiles
    // We can just try to update user_profiles directly
    console.log('Testing update on user_profiles...');
    try {
      await client.query(`UPDATE public.user_profiles SET email = 'test@test.com' WHERE email = 'ti@medlifebrasil.com'`);
      console.log('user_profiles updated successfully');
      // rollback
      await client.query(`UPDATE public.user_profiles SET email = 'ti@medlifebrasil.com' WHERE email = 'test@test.com'`);
    } catch (e) {
      console.error('user_profiles error:', e.message);
    }

    console.log('Testing update on auth.users...');
    try {
      await client.query(`UPDATE auth.users SET email = 'test@test.com' WHERE email = 'ti@medlifebrasil.com'`);
      console.log('auth.users updated successfully');
      await client.query(`UPDATE auth.users SET email = 'ti@medlifebrasil.com' WHERE email = 'test@test.com'`);
    } catch (e) {
      console.error('auth.users error:', e.message);
    }
    
    console.log('Testing update on auth.identities...');
    try {
      await client.query(`UPDATE auth.identities SET email = 'test@test.com' WHERE email = 'ti@medlifebrasil.com'`);
      console.log('auth.identities updated successfully');
      await client.query(`UPDATE auth.identities SET email = 'ti@medlifebrasil.com' WHERE email = 'test@test.com'`);
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
