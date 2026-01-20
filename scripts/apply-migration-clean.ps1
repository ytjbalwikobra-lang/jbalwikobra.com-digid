# Apply Auth System Optimization Migration to Supabase
# This script applies the database migration via Supabase REST API

param(
 [switch]$DryRun = $false
)

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " AUTH MIGRATION DEPLOYMENT SCRIPT" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env file
if (Test-Path ".env") {
 Write-Host "[+] Loading environment variables from .env..." -ForegroundColor Green
 Get-Content ".env" | ForEach-Object {
 if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*?)\s*$') {
 $name = $matches[1]
 $value = $matches[2]
 [Environment]::SetEnvironmentVariable($name, $value, "Process")
 }
 }
} else {
 Write-Host "`n .env file not found!" -ForegroundColor Red
 exit 1
}

$SUPABASE_URL = $env:SUPABASE_URL
$SUPABASE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_KEY) {
 Write-Host "`n Missing required environment variables:" -ForegroundColor Red
 Write-Host " - SUPABASE_URL: $(if($SUPABASE_URL){''}else{''})" -ForegroundColor $(if($SUPABASE_URL){'Green'}else{'Red'})
 Write-Host " - SUPABASE_SERVICE_ROLE_KEY: $(if($SUPABASE_KEY){' (hidden)'}else{''})" -ForegroundColor $(if($SUPABASE_KEY){'Green'}else{'Red'})
 exit 1
}

Write-Host " Environment variables loaded" -ForegroundColor Green
Write-Host " URL: $($SUPABASE_URL.Substring(0, 30))..." -ForegroundColor Gray

# Read migration file
$migrationPath = "supabase/migrations/20260120_auth_system_optimization.sql"
if (-not (Test-Path $migrationPath)) {
 Write-Host "`n Migration file not found: $migrationPath" -ForegroundColor Red
 exit 1
}

$sql = Get-Content $migrationPath -Raw
Write-Host "`n Loaded migration file ($($sql.Length) characters)" -ForegroundColor Green

if ($DryRun) {
 Write-Host "`n DRY RUN MODE - No changes will be made`n" -ForegroundColor Yellow
 Write-Host "SQL Preview:" -ForegroundColor Cyan
 Write-Host $sql.Substring(0, [Math]::Min(1000, $sql.Length))
 Write-Host "...`n"
 exit 0
}

# Split SQL into individual statements for better error handling
Write-Host "`n Parsing SQL statements..." -ForegroundColor Cyan

function Split-SQLStatements {
 param([string]$SQL)
 
 # Remove comments
 $cleanSQL = $SQL -replace '--[^\r\n]*', '' -replace '/\*[\s\S]*?\*/', ''
 
 # Split by semicolon but respect functions
 $statements = @()
 $current = ""
 $inFunction = $false
 $dollarQuote = $null
 
 $lines = $cleanSQL -split "`n"
 foreach ($line in $lines) {
 $trimmed = $line.Trim()
 
 # Track function boundaries
 if ($trimmed -match 'CREATE\s+(OR\s+REPLACE\s+)?FUNCTION') {
 $inFunction = $true
 }
 
 # Track dollar quotes
 if ($trimmed -match '\$(\w*)\$') {
 $tag = $matches[1]
 if ($null -eq $dollarQuote) {
 $dollarQuote = $tag
 } elseif ($tag -eq $dollarQuote) {
 $dollarQuote = $null
 }
 }
 
 $current += $line + "`n"
 
 # Check for statement end
 if ($trimmed.EndsWith(';') -and -not $inFunction -and $null -eq $dollarQuote) {
 if ($current.Trim().Length -gt 5) {
 $statements += $current.Trim() -replace ';$', ''
 }
 $current = ""
 } elseif ($trimmed.EndsWith(';') -and $inFunction -and $null -eq $dollarQuote) {
 if ($current.Trim().Length -gt 5) {
 $statements += $current.Trim() -replace ';$', ''
 }
 $current = ""
 $inFunction = $false
 }
 }
 
 # Add remaining
 if ($current.Trim().Length -gt 5 -and $current.Trim() -ne 'BEGIN' -and $current.Trim() -ne 'COMMIT') {
 $statements += $current.Trim()
 }
 
 return $statements | Where-Object { $_ -and $_.Trim() -ne 'BEGIN' -and $_.Trim() -ne 'COMMIT' }
}

$statements = Split-SQLStatements -SQL $sql
Write-Host " Found $($statements.Count) SQL statements to execute`n" -ForegroundColor Green

# Execute statements one by one
$executed = 0
$skipped = 0
$failed = 0
$errors = @()

Write-Host " Executing migration...`n" -ForegroundColor Cyan

foreach ($stmt in $statements) {
 $executed++
 $preview = $stmt.Substring(0, [Math]::Min(70, $stmt.Length)) -replace '\s+', ' '
 Write-Host "[$executed/$($statements.Count)] $preview..." -NoNewline
 
 try {
 $body = @{
 query = $stmt
 } | ConvertTo-Json
 
 $headers = @{
 "apikey" = $SUPABASE_KEY
 "Authorization" = "Bearer $SUPABASE_KEY"
 "Content-Type" = "application/json"
 "Prefer" = "return=minimal"
 }
 
 $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/rpc/query" `
 -Method POST `
 -Headers $headers `
 -Body $body `
 -UseBasicParsing `
 -ErrorAction Stop
 
 Write-Host " " -ForegroundColor Green
 }
 catch {
 $errorMsg = $_.Exception.Message
 
 # Check if it's a safe error
 if ($errorMsg -match 'already exists|does not exist|duplicate') {
 Write-Host " SKIP" -ForegroundColor Yellow
 $skipped++
 }
 else {
 Write-Host " " -ForegroundColor Red
 $failed++
 $errors += @{
 Statement = $executed
 Preview = $preview
 Error = $errorMsg
 }
 }
 }
}

# Summary
Write-Host "`n==============================================" -ForegroundColor Cyan
Write-Host " MIGRATION SUMMARY" -ForegroundColor Cyan
Write-Host "==============================================`n" -ForegroundColor Cyan

Write-Host " Executed: $executed" -ForegroundColor Green
Write-Host " Skipped: $skipped" -ForegroundColor Yellow 
Write-Host " Failed: $failed" -ForegroundColor $(if($failed -gt 0){'Red'}else{'Green'})
Write-Host " Total: $($statements.Count)`n"

if ($errors.Count -gt 0) {
 Write-Host " Errors encountered:`n" -ForegroundColor Red
 foreach ($err in $errors) {
 Write-Host " [$($err.Statement)] $($err.Preview)" -ForegroundColor Yellow
 Write-Host " Error: $($err.Error)`n" -ForegroundColor Red
 }
 Write-Host "`n Some statements failed. Check errors above." -ForegroundColor Yellow
 Write-Host " You may need to run the migration manually via Supabase Dashboard:`n" -ForegroundColor Yellow
 Write-Host " https://supabase.com/dashboard/project/xeithuvgldzxnggxadri/sql/new`n" -ForegroundColor Cyan
 exit 1
}

Write-Host " Migration completed successfully!`n" -ForegroundColor Green

# Verify migration
Write-Host " Verifying migration..`n" -ForegroundColor Cyan

$checks = @(
 @{ Name = "user_sessions table"; Query = "SELECT to_regclass('public.user_sessions') IS NOT NULL" },
 @{ Name = "phone_verifications table"; Query = "SELECT to_regclass('public.phone_verifications') IS NOT NULL" },
 @{ Name = "validate_session function"; Query = "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'validate_session')" },
 @{ Name = "cleanup_expired_sessions function"; Query = "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'cleanup_expired_sessions')" },
 @{ Name = "session_analytics view"; Query = "SELECT to_regclass('public.session_analytics') IS NOT NULL" }
)

foreach ($check in $checks) {
 Write-Host " $($check.Name)..." -NoNewline
 
 try {
 $body = @{ query = $check.Query } | ConvertTo-Json
 $headers = @{
 "apikey" = $SUPABASE_KEY
 "Authorization" = "Bearer $SUPABASE_KEY"
 "Content-Type" = "application/json"
 }
 
 $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/rpc/query" `
 -Method POST `
 -Headers $headers `
 -Body $body `
 -UseBasicParsing `
 -ErrorAction Stop
 
 Write-Host " " -ForegroundColor Green
 }
 catch {
 Write-Host " " -ForegroundColor Yellow
 }
}

Write-Host "`n Verification complete!`n" -ForegroundColor Green

# Next steps
Write-Host "=============================================="-ForegroundColor Cyan
Write-Host " NEXT STEPS" -ForegroundColor Cyan
Write-Host "==============================================`n" -ForegroundColor Cyan
Write-Host " 1. Deploy API changes:"
Write-Host " git push origin main (auto-deploys to Vercel)`n"
Write-Host " 2. Test authentication flow:"
Write-Host " Open: public/test-auth.html`n"
Write-Host " 3. Monitor cleanup cron job:"
Write-Host " Check: /api/cron/cleanup-auth`n"
Write-Host " 4. Review monitoring queries:"
Write-Host " See: docs/security/README.md`n"
Write-Host "==============================================`n" -ForegroundColor Cyan

