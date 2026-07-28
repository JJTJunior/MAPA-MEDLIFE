const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });
require('dotenv').config({ path: './.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testAuth() {
  console.log('Testing Aline user with common passwords...');
  const passwordsToTest = ['123456', '12345678', 'medlife123', 'Aline123', 'aline123'];
  
  for (const p of passwordsToTest) {
    let res = await supabase.auth.signInWithPassword({
      email: 'aline@medlifebrasil.com',
      password: p,
    });
    if (res.data?.user) {
      console.log('Success with password:', p);
      return;
    }
  }
  console.log('All common passwords failed (Invalid login credentials)');
}

testAuth();
