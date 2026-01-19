#!/usr/bin/env pwsh
# Quick Migration Helper - One command to rule them all!

param(
    [Parameter()]
    [ValidateSet("new", "push", "list", "pull", "help")]
    [string]$Action = "help",
    
    [Parameter()]
    [string]$Name
)

function Show-Help {
    Write-Host ""
    Write-Host "🗄️  Supabase Migration Helper" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  .\scripts\migrate.ps1 <action> [options]"
    Write-Host ""
    Write-Host "ACTIONS:" -ForegroundColor Yellow
    Write-Host "  new <name>    Create a new migration file"
    Write-Host "  push          Push local migrations to remote"
    Write-Host "  list          Show migration status"
    Write-Host "  pull          Pull remote migrations to local"
    Write-Host "  help          Show this help message"
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  .\scripts\migrate.ps1 new add_featured_column"
    Write-Host "  .\scripts\migrate.ps1 push"
    Write-Host "  .\scripts\migrate.ps1 list"
    Write-Host ""
    Write-Host "WORKFLOW:" -ForegroundColor Yellow
    Write-Host "  1. Create:  .\scripts\migrate.ps1 new my_migration"
    Write-Host "  2. Edit:    Edit supabase/migrations/[timestamp]_my_migration.sql"
    Write-Host "  3. Push:    .\scripts\migrate.ps1 push"
    Write-Host ""
    Write-Host "DOCS: docs/SUPABASE_MIGRATIONS.md" -ForegroundColor Gray
    Write-Host ""
}

if ($Action -eq "new") {
    if (-not $Name) {
        Write-Host "❌ Error: Migration name required" -ForegroundColor Red
        Write-Host "Usage: .\scripts\migrate.ps1 new <name>" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "`n📝 Creating new migration: $Name" -ForegroundColor Cyan
    npx supabase migration new $Name
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration created!" -ForegroundColor Green
        Write-Host "📍 Location: supabase/migrations/" -ForegroundColor Gray
        Write-Host "`n💡 Next: Edit the file and run: .\scripts\migrate.ps1 push`n" -ForegroundColor Yellow
    }
}
elseif ($Action -eq "push") {
    Write-Host "`n🚀 Pushing migrations to remote database..." -ForegroundColor Cyan
    
    # Check link
    $linked = npx supabase projects list 2>&1 | Select-String "xeithuvgldzxnggxadri"
    if (-not $linked) {
        Write-Host "🔗 Linking to remote project..." -ForegroundColor Yellow
        npx supabase link --project-ref xeithuvgldzxnggxadri
    }
    
    # Show pending
    Write-Host "`n📋 Pending migrations:" -ForegroundColor Cyan
    npx supabase migration list | Select-String "^\s+\d+.*\|.*\|" | Where-Object { $_ -notmatch "\| \w+ \|" }
    
    # Push
    Write-Host "`n⏳ Pushing..." -ForegroundColor Yellow
    npx supabase db push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Migrations pushed successfully!`n" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Push failed. Check errors above.`n" -ForegroundColor Red
    }
}
elseif ($Action -eq "list") {
    Write-Host "`n📋 Migration Status" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray
    npx supabase migration list
}
elseif ($Action -eq "pull") {
    Write-Host "`n⬇️  Pulling remote migrations..." -ForegroundColor Cyan
    npx supabase db pull
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Pulled successfully!`n" -ForegroundColor Green
    }
}
else {
    Show-Help
}
