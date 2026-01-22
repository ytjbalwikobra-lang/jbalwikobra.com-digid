# Copy migration SQL to clipboard for pasting into Supabase SQL Editor
Write-Host "📋 Copying migration SQL to clipboard..." -ForegroundColor Cyan
Get-Content migrations/2026-01-22_sync_has_rental_field.sql | Set-Clipboard
Write-Host "✅ SQL copied to clipboard!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open: https://supabase.com/dashboard/project/xeithuvgldzxnggxadri/sql/new" -ForegroundColor White
Write-Host "2. Paste the SQL (Ctrl+V)" -ForegroundColor White
Write-Host "3. Click 'Run' button" -ForegroundColor White
Write-Host ""
Write-Host "Opening browser..." -ForegroundColor Cyan
Start-Process "https://supabase.com/dashboard/project/xeithuvgldzxnggxadri/sql/new"
