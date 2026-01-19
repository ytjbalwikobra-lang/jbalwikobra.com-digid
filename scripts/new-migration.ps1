# Supabase Migration Creator
# Creates a new timestamped migration file in supabase/migrations/

param(
    [Parameter(Mandatory=$true)]
    [string]$Name
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$filename = "${timestamp}_${Name}.sql"
$filepath = "supabase/migrations/$filename"

$template = @"
-- Migration: $Name
-- Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
-- Description: [Add your migration description here]

-- Add your SQL migration here
-- Example:
-- ALTER TABLE your_table ADD COLUMN new_column TEXT;

"@

Set-Content -Path $filepath -Value $template

Write-Host "`n✅ Created migration file: $filename" -ForegroundColor Green
Write-Host "📝 Location: $filepath" -ForegroundColor Cyan
Write-Host "`n💡 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Edit the file and add your SQL migration" -ForegroundColor White
Write-Host "   2. Run: .\scripts\push-migrations.ps1" -ForegroundColor White
Write-Host "   3. Or: npx supabase db push`n" -ForegroundColor White

# Open in default editor (optional)
if (Get-Command code -ErrorAction SilentlyContinue) {
    code $filepath
}
