/**
 * Push SQL Migration to Remote Supabase Database
 * Uses the Supabase service role key to execute SQL via pg-meta API
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

// Read the migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260120_auth_system_optimization.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Pushing migration to Supabase...');
console.log(`   Project: ${PROJECT_REF}`);
console.log(`   SQL Size: ${(sql.length / 1024).toFixed(1)} KB`);
console.log('');

// Use Supabase's internal pg-meta API endpoint
const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);

// First, let's try with the pg-meta approach using fetch
async function executeSql() {
    try {
        // Method 1: Try using the Supabase REST API with a custom function
        // Since there's no built-in exec_sql, we need to use pg_query via pg-meta
        
        // The Supabase pg-meta endpoint
        const pgMetaUrl = `https://${PROJECT_REF}.supabase.co/pg/query`;
        
        const response = await fetch(pgMetaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'apikey': SERVICE_KEY
            },
            body: JSON.stringify({ query: sql })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Migration applied successfully!');
            console.log('   Response:', JSON.stringify(result).substring(0, 200));
            return true;
        }

        // If that fails, try alternate endpoint
        const status = response.status;
        const text = await response.text();
        
        if (status === 404) {
            console.log('ℹ️  pg-meta endpoint not available, trying alternate method...');
            return await tryAlternateMethod();
        }
        
        console.error(`❌ Error ${status}: ${text}`);
        return false;

    } catch (error) {
        console.error('❌ Request failed:', error.message);
        return await tryAlternateMethod();
    }
}

async function tryAlternateMethod() {
    // Split SQL into individual statements and execute via database.sql endpoint
    console.log('📝 Trying SQL execution via database endpoint...');
    
    const dbUrl = `https://${PROJECT_REF}.supabase.co/rest/v1/`;
    
    // Try executing through the Supabase PostgREST interface
    // This won't work for DDL, but let's check connectivity
    
    try {
        // Check if we can connect
        const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?limit=1`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'apikey': SERVICE_KEY
            }
        });
        
        if (testResponse.ok) {
            console.log('✅ Connection verified!');
            console.log('');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('⚠️  Direct SQL execution requires Supabase Dashboard');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('');
            console.log('Please run the migration manually:');
            console.log('');
            console.log('1. Open: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
            console.log('2. Paste the SQL (copied to clipboard)');
            console.log('3. Click RUN');
            console.log('');
            
            // Copy SQL to clipboard
            const { exec } = require('child_process');
            exec(`powershell -command "Set-Clipboard -Value (Get-Content '${migrationPath.replace(/\\/g, '\\\\')}' -Raw)"`, (err) => {
                if (!err) {
                    console.log('📋 SQL copied to clipboard!');
                }
            });
            
            return false;
        }
    } catch (e) {
        console.error('Connection test failed:', e.message);
    }
    
    return false;
}

// Run
executeSql().then(success => {
    process.exit(success ? 0 : 1);
});
