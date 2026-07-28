const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './frontend/.env.local' });
require('dotenv').config({ path: './frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testFrontendFlow() {
  const tempClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const email = 'aline2@medlifebrasil.com';
  const password = 'securepassword123';

  console.log('1. Signing up...');
  const { data: authData, error: authError } = await tempClient.auth.signUp({
    email,
    password
  });

  if (authError) {
    console.error('Auth Error:', authError);
    return;
  }
  
  console.log('User signed up successfully:', authData.user.id);

  console.log('2. Calling admin_setup_new_user...');
  // We need an admin client to call the RPC, or we can use the main client with the admin's session.
  // But wait! Is the RPC 'admin_setup_new_user' available to authenticated users?
  // Yes, it is SECURITY DEFINER, but is it granted to authenticated?
  // Let's check if the RPC call fails!
  const mainClient = createClient(supabaseUrl, supabaseKey);
  
  // We must log in as ti@medlifebrasil.com to call the RPC!
  const { error: loginError } = await mainClient.auth.signInWithPassword({
    email: 'ti@medlifebrasil.com',
    password: 'Medlife@2026'
  });
  
  if (loginError) {
    console.error('Failed to login as admin:', loginError);
  }

  const { data, error } = await mainClient.rpc('admin_setup_new_user', {
    admin_email: 'ti@medlifebrasil.com',
    new_user_id: authData.user.id,
    new_name: 'ALINE',
    group_name: 'Vendedor',
    custom_permissions: { can_edit: true, can_view_only: false }
  });

  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('RPC Data:', data);
  }
}

testFrontendFlow();
