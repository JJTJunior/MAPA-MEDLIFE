const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './frontend/.env.local' });
require('dotenv').config({ path: './frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const tempClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });

const passwordDB = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${passwordDB}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    
    // Call the RPC to create a user
    console.log('Creating aline3 using admin_create_user...');
    const { rows } = await client.query(`
      SELECT admin_create_user('ti@medlifebrasil.com', 'aline3@medlifebrasil.com', 'securepassword123', 'ALINE', 'Vendedor', '{"can_edit": true, "can_view_only": false}')
    `);
    console.log('RPC result:', rows[0]);

    // Test login
    console.log('Testing login for aline3...');
    const { data, error } = await tempClient.auth.signInWithPassword({
      email: 'aline3@medlifebrasil.com',
      password: 'securepassword123'
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
