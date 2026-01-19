# Supabase Migration Helper Script
# Push local migrations to remote Supabase database

Write-Host "`n🚀 Supabase Migration Push Helper`n" -ForegroundColor Cyan

# Check if linked to remote
$linked = npx supabase projects list 2>&1 | Select-String "xeithuvgldzxnggxadri"
if (-not $linked) {
    Write-Host "❌ Not linked to remote project. Running link command..." -ForegroundColor Red
    npx supabase link --project-ref xeithuvgldzxnggxadri
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to link project. Please check your credentials." -ForegroundColor Red
        exit 1
    }
}

Write-Host "📋 Checking for pending migrations..." -ForegroundColor Yellow

# Show remote migration status
Write-Host "`nRemote migrations:" -ForegroundColor Cyan
npx supabase migration list

Write-Host "`n🔄 Pushing local migrations to remote database..." -ForegroundColor Yellow

# Push migrations to remote
npx supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Migrations pushed successfully!" -ForegroundColor Green
    
    Write-Host "`n📊 Current migration status:" -ForegroundColor Cyan
    npx supabase migration list
    
    Write-Host "`n✨ Done! Your database is up to date.`n" -ForegroundColor Green
} else {
    Write-Host "`n❌ Migration push failed. Check the errors above." -ForegroundColor Red
    Write-Host "💡 Tip: You can manually run migrations in Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "   https://supabase.com/dashboard/project/xeithuvgldzxnggxadri/sql/new`n" -ForegroundColor Yellow
}
