const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './frontend/.env.local' });
require('dotenv').config({ path: './frontend/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testAuth() {
  console.log('Testing Aline user...');
  let res = await supabase.auth.signInWithPassword({
    email: 'aline@medlifebrasil.com',
    password: 'wrongpassword123',
  });
  console.log('Aline Response Error:', res.error?.status, res.error?.name, res.error?.message);
}

testAuth();
