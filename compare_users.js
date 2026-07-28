const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './frontend/.env.local' });
require('dotenv').config({ path: './frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const tempClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });

const passwordDB = encodeURIComponent('Medlife@2026');
const connectionString = `postgresql://postgres:${passwordDB}@db.yslaetfxnsdgntqiqbxa.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    await client.connect();

    // 1. Get a known good user created by GoTrue (like the admin 'ti')
    const { rows: goodUsers } = await client.query(`SELECT * FROM auth.users WHERE email = 'ti@medlifebrasil.com'`);
    const goodUser = goodUsers[0];

    // 2. Get the broken user (aline3)
    const { rows: badUsers } = await client.query(`SELECT * FROM auth.users WHERE email = 'aline3@medlifebrasil.com'`);
    const badUser = badUsers[0];

    // 3. Print all differences
    console.log('Comparing fields...');
    for (const key of Object.keys(goodUser)) {
      const goodVal = goodUser[key];
      const badVal = badUser[key];
      // ignore timestamps, id, email, password
      if (['id', 'email', 'encrypted_password', 'created_at', 'updated_at', 'last_sign_in_at', 'confirmed_at', 'email_confirmed_at'].includes(key)) continue;
      
      if (JSON.stringify(goodVal) !== JSON.stringify(badVal)) {
        console.log(`Difference in ${key}:`);
        console.log(`  Good:`, goodVal);
        console.log(`  Bad: `, badVal);
      }
    }
    
    // Compare Identities
    console.log('--- Identities ---');
    const { rows: goodIdents } = await client.query(`SELECT * FROM auth.identities WHERE user_id = $1`, [goodUser.id]);
    const { rows: badIdents } = await client.query(`SELECT * FROM auth.identities WHERE user_id = $1`, [badUser.id]);
    
    for (const key of Object.keys(goodIdents[0])) {
      const goodVal = goodIdents[0][key];
      const badVal = badIdents[0][key];
      if (['id', 'user_id', 'provider_id', 'created_at', 'updated_at', 'last_sign_in_at', 'email', 'identity_data'].includes(key)) continue;
      
      if (JSON.stringify(goodVal) !== JSON.stringify(badVal)) {
        console.log(`Difference in Identity ${key}:`);
        console.log(`  Good:`, goodVal);
        console.log(`  Bad: `, badVal);
      }
    }

    console.log('Identity Data keys:');
    console.log('  Good:', Object.keys(goodIdents[0].identity_data));
    console.log('  Bad :', Object.keys(badIdents[0].identity_data));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}
main();
