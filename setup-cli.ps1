# CLI Setup Script for Vercel & Supabase
# This script helps automate the setup process

Write-Host "=== CLI Setup Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
    Write-Host "✓ npm version: $npmVersion" -ForegroundColor Green
    $nodeInstalled = $true
} catch {
    Write-Host "✗ Node.js is not installed" -ForegroundColor Red
    Write-Host "  Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "  Then run this script again." -ForegroundColor Yellow
    $nodeInstalled = $false
}

Write-Host ""

if (-not $nodeInstalled) {
    exit 1
}

# Check if Docker is running
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "✓ Docker is installed" -ForegroundColor Green
    
    docker ps | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "⚠ Docker is installed but not running" -ForegroundColor Yellow
    Write-Host "  Start Docker Desktop to use local Supabase" -ForegroundColor Yellow
}

Write-Host ""

# Install dependencies
Write-Host "Installing project dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check CLI versions
Write-Host "Verifying CLI installations..." -ForegroundColor Yellow
$vercelVersion = npx vercel --version
$supabaseVersion = npx supabase --version

Write-Host "✓ Vercel CLI version: $vercelVersion" -ForegroundColor Green
Write-Host "✓ Supabase CLI version: $supabaseVersion" -ForegroundColor Green

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Login to Vercel:" -ForegroundColor White
Write-Host "   npx vercel login" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Link Vercel project:" -ForegroundColor White
Write-Host "   npx vercel link" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Login to Supabase:" -ForegroundColor White
Write-Host "   npx supabase login" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Link Supabase project:" -ForegroundColor White
Write-Host "   npx supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Create .env.local file with your credentials" -ForegroundColor White
Write-Host ""
Write-Host "See SETUP_CLI.md for detailed instructions" -ForegroundColor Cyan
