#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function checkUsersTable() {
  console.log('🔍 Checking users table structure...\n');
  
  // Get one user to see all columns
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }
  
  if (users && users[0]) {
    console.log('✅ Users table columns:');
    console.log(JSON.stringify(users[0], null, 2));
  }
  
  // Check all users
  const { data: allUsers, error: allError } = await supabase
    .from('users')
    .select('*');
  
  if (!allError) {
    console.log(`\n📊 Total users: ${allUsers.length}`);
    console.log('\nAll users:');
    allUsers.forEach(u => {
      console.log(`  - ${u.email || 'NO EMAIL'} (id: ${u.id})`);
      console.log(`    is_admin: ${u.is_admin}`);
      console.log(`    created: ${u.created_at}`);
      console.log('');
    });
  }
}

checkUsersTable();
