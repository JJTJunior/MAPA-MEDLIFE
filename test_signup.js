const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config({ path: './frontend/.env.local' });
require('dotenv').config({ path: './frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const passwordDB = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${passwordDB}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function testSignUp() {
  const tempClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log('Signing up user...');
  const { data, error } = await tempClient.auth.signUp({
    email: 'test_signup@medlifebrasil.com',
    password: 'securepassword123',
    options: {
      data: { name: 'Test User', group_name: 'Vendedor' }
    }
  });

  if (error) {
    console.error('SignUp Error:', error);
    return;
  }
  
  console.log('User signed up:', data.user.id);
  
  console.log('Confirming user via SQL...');
  await pgClient.connect();
  await pgClient.query(`UPDATE auth.users SET email_confirmed_at = now() WHERE id = $1`, [data.user.id]);
  
  console.log('Testing login...');
  const { data: loginData, error: loginError } = await tempClient.auth.signInWithPassword({
    email: 'test_signup@medlifebrasil.com',
    password: 'securepassword123'
  });
  
  if (loginError) {
    console.error('Login Error:', loginError);
  } else {
    console.log('Login Success!', loginData.user.id);
  }
  
  await pgClient.query(`DELETE FROM user_profiles WHERE id = $1`, [data.user.id]);
  await pgClient.query(`DELETE FROM auth.identities WHERE user_id = $1`, [data.user.id]);
  await pgClient.query(`DELETE FROM auth.users WHERE id = $1`, [data.user.id]);
  await pgClient.end();
}

testSignUp();
