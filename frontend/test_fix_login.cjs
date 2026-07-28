const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const tempClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });

const passwordDB = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${passwordDB}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    await client.connect();
    
    console.log('Fixing aline4 fields...');
    await client.query(`
      UPDATE auth.users 
      SET 
        confirmation_token = '',
        recovery_token = '',
        email_change_token_new = '',
        email_change = '',
        phone_change = '',
        phone_change_token = '',
        reauthentication_token = '',
        email_change_token_current = '',
        email_change_confirm_status = 0,
        raw_user_meta_data = '{"name":"ALINE4","group_name":"Vendedor","email_verified":true}'::jsonb
      WHERE email = 'aline4@medlifebrasil.com'
    `);
    
    console.log('Testing login for aline4 after fix...');
    const { data, error } = await tempClient.auth.signInWithPassword({
      email: 'aline4@medlifebrasil.com',
      password: 'testpassword'
    });
    
    if (error) {
      console.error('Login error:', error.status, error.name, error.message);
    } else {
      console.log('Login success!', data.user.id);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}
main();
