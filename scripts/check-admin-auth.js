#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkAdmin() {
  const envPath = path.join(__dirname, '..', '.env.production');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)="?([^"\r\n]+)"?/);
    if (match) {
      envVars[match[1]] = match[2].replace(/\\r\\n$/, '').replace(/\r\n$/, '').trim();
    }
  });

  const SUPABASE_URL = envVars.SUPABASE_URL || envVars.REACT_APP_SUPABASE_URL;
  const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  console.log('🔍 Checking admin user authentication...\n');

  // Get admin user
  const { data: adminUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'admin@jbalwikobra.com')
    .single();

  if (!adminUser) {
    console.log('❌ Admin user not found in users table');
    return;
  }

  console.log('✅ Admin user in users table:');
  console.log('   Email:', adminUser.email);
  console.log('   ID:', adminUser.id);
  console.log('   Auth User ID:', adminUser.auth_user_id);
  console.log('   Is Admin:', adminUser.is_admin);
  console.log('');

  // Check if user exists in auth.users
  if (adminUser.auth_user_id) {
    const { data: authUser, error } = await supabase.auth.admin.getUserById(adminUser.auth_user_id);
    
    if (error) {
      console.log('❌ Auth user not found:', error.message);
      console.log('');
      console.log('⚠️  The admin user exists in public.users but not in auth.users');
      console.log('   This means you need to create an actual authentication account.');
      console.log('');
      console.log('📝 Solutions:');
      console.log('   1. Sign up at your website with email: admin@jbalwikobra.com');
      console.log('   2. Or reset password in Supabase Dashboard → Authentication → Users');
      console.log('   3. Then link it by running:');
      console.log('      UPDATE public.users SET auth_user_id = (SELECT id FROM auth.users WHERE email = \'admin@jbalwikobra.com\') WHERE email = \'admin@jbalwikobra.com\';');
    } else {
      console.log('✅ Auth user exists:');
      console.log('   Email:', authUser.user.email);
      console.log('   Email Confirmed:', authUser.user.email_confirmed_at ? 'Yes' : 'No');
      console.log('   Last Sign In:', authUser.user.last_sign_in_at || 'Never');
      console.log('');
      console.log('✅ Everything is set up correctly!');
      console.log('');
      console.log('🔐 To log in and edit prices:');
      console.log('   1. Go to your admin panel');
      console.log('   2. Log in with: admin@jbalwikobra.com');
      console.log('   3. If you don\'t know the password:');
      console.log('      - Go to Supabase Dashboard → Authentication → Users');
      console.log('      - Find admin@jbalwikobra.com');
      console.log('      - Click "..." → "Reset Password"');
      console.log('      - Set a new password');
    }
  } else {
    console.log('⚠️  auth_user_id is NULL');
    console.log('');
    console.log('This means the user in public.users is not linked to auth.users');
    console.log('');
    console.log('📝 To fix:');
    console.log('   1. Check if admin@jbalwikobra.com exists in auth.users (Supabase Dashboard)');
    console.log('   2. If yes, run this SQL:');
    console.log('      UPDATE public.users SET auth_user_id = (SELECT id FROM auth.users WHERE email = \'admin@jbalwikobra.com\') WHERE email = \'admin@jbalwikobra.com\';');
    console.log('   3. If no, create the auth user first (sign up or create in dashboard)');
  }
}

checkAdmin().catch(console.error);
