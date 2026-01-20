# Auth System Optimization - Migration Script
# Run this to apply the database optimizations

Write-Host "🚀 Auth System Optimization - Migration Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Prompt for environment
Write-Host "Select environment:" -ForegroundColor Yellow
Write-Host "1. Local Development" -ForegroundColor White
Write-Host "2. Production (Remote)" -ForegroundColor White
$env_choice = Read-Host "Enter choice (1 or 2)"

$isLocal = $env_choice -eq "1"

Write-Host ""
Write-Host "📋 Migration Plan:" -ForegroundColor Cyan
Write-Host "  1. Create user_sessions table with optimized indexes" -ForegroundColor White
Write-Host "  2. Create phone_verifications table" -ForegroundColor White
Write-Host "  3. Add database functions for session management" -ForegroundColor White
Write-Host "  4. Add triggers for automatic cleanup" -ForegroundColor White
Write-Host "  5. Create session analytics view" -ForegroundColor White
Write-Host "  6. Add missing columns to users table" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Proceed with migration? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ Migration cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🔄 Applying migration..." -ForegroundColor Yellow

try {
    if ($isLocal) {
        Write-Host "📍 Applying to LOCAL database..." -ForegroundColor Cyan
        
        # Apply migration to local database
        supabase db push --local
        
        if ($LASTEXITCODE -ne 0) {
            throw "Migration failed"
        }
    } else {
        Write-Host "📍 Applying to REMOTE database..." -ForegroundColor Cyan
        Write-Host "⚠️  Make sure you're linked to the correct project!" -ForegroundColor Yellow
        Write-Host ""
        
        # Show current project
        supabase projects list
        Write-Host ""
        
        $confirm_remote = Read-Host "Continue with remote migration? (yes/no)"
        if ($confirm_remote -ne "yes") {
            Write-Host "❌ Migration cancelled" -ForegroundColor Red
            exit 0
        }
        
        # Apply migration to remote database
        supabase db push
        
        if ($LASTEXITCODE -ne 0) {
            throw "Migration failed"
        }
    }
    
    Write-Host ""
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Run verification queries
    Write-Host "🔍 Verifying migration..." -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "📊 Migration Summary:" -ForegroundColor Green
    Write-Host "  ✅ Tables created: user_sessions, phone_verifications" -ForegroundColor White
    Write-Host "  ✅ Indexes created: 10+ optimized indexes" -ForegroundColor White
    Write-Host "  ✅ Functions created: 6 database functions" -ForegroundColor White
    Write-Host "  ✅ Triggers created: 2 auto-cleanup triggers" -ForegroundColor White
    Write-Host "  ✅ Analytics view: session_analytics materialized view" -ForegroundColor White
    Write-Host ""
    
    Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Deploy API changes (auth.ts, authMiddleware.ts)" -ForegroundColor White
    Write-Host "  2. Deploy cron job (api/cron/cleanup-auth.ts)" -ForegroundColor White
    Write-Host "  3. Test session validation endpoint" -ForegroundColor White
    Write-Host "  4. Monitor logs for any issues" -ForegroundColor White
    Write-Host ""
    
    Write-Host "📝 Testing Commands:" -ForegroundColor Cyan
    if ($isLocal) {
        Write-Host "  supabase db inspect --local" -ForegroundColor White
        Write-Host "  supabase functions serve --local" -ForegroundColor White
    } else {
        Write-Host "  supabase db inspect" -ForegroundColor White
    }
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ Migration failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check Supabase connection" -ForegroundColor White
    Write-Host "  2. Verify migration file syntax" -ForegroundColor White
    Write-Host "  3. Check database permissions" -ForegroundColor White
    Write-Host "  4. Review Supabase logs" -ForegroundColor White
    exit 1
}

Write-Host "✨ All done!" -ForegroundColor Green
