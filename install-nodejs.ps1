# Node.js Installation Script
# This script helps you install Node.js on Windows

Write-Host "=== Node.js Installation Helper ===" -ForegroundColor Cyan
Write-Host ""

# Check current status
Write-Host "Checking current installation status..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✓ Node.js is already installed: $nodeVersion" -ForegroundColor Green
    Write-Host "✓ npm is already installed: $npmVersion" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run: npm install" -ForegroundColor Cyan
    exit 0
} catch {
    Write-Host "✗ Node.js is not installed" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Installation Options ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Option 1: Manual Download (Recommended)" -ForegroundColor Yellow
Write-Host "  1. Open: https://nodejs.org/" -ForegroundColor White
Write-Host "  2. Download the LTS version (Windows Installer .msi)" -ForegroundColor White
Write-Host "  3. Run the installer and follow the wizard" -ForegroundColor White
Write-Host "  4. IMPORTANT: Restart PowerShell after installation" -ForegroundColor White
Write-Host "  5. Run this script again to verify" -ForegroundColor White
Write-Host ""

Write-Host "Option 2: Direct Download Link" -ForegroundColor Yellow
Write-Host "  64-bit: https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi" -ForegroundColor White
Write-Host "  32-bit: https://nodejs.org/dist/v20.11.0/node-v20.11.0-x86.msi" -ForegroundColor White
Write-Host ""

Write-Host "Option 3: Use Windows Package Manager (if available)" -ForegroundColor Yellow
Write-Host "  Run: winget install OpenJS.NodeJS.LTS" -ForegroundColor White
Write-Host ""

Write-Host "After installation:" -ForegroundColor Cyan
Write-Host "  1. Close and reopen PowerShell" -ForegroundColor White
Write-Host "  2. Run: .\install-nodejs.ps1 (to verify)" -ForegroundColor White
Write-Host "  3. Run: npm install (to install project dependencies)" -ForegroundColor White
Write-Host ""

# Ask if user wants to try opening the download page
Write-Host "Press Enter to open Node.js download page in browser, or Ctrl+C to cancel..." -ForegroundColor Yellow
$null = Read-Host
Start-Process "https://nodejs.org/"
