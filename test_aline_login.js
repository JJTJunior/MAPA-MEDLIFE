const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './frontend/.env.local' });
require('dotenv').config({ path: './frontend/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testAuth() {
  console.log('Testing Aline user...');
  let res = await supabase.auth.signInWithPassword({
    email: 'aline@medlifebrasil.com',
    password: 'securepassword123', // Or whatever password they used. Wait, I don't know the password!
  });
  console.log('Aline Response:', res.error ? res.error : 'Success!');
}

testAuth();
