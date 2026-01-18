# Auto-retry payment test - waits for Xendit rate limit
param([int]$MaxMinutes = 10, [string]$Method = "qris")

Write-Host "`n🔄 Auto-retry test started at $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Cyan
Write-Host "Will retry every 30 seconds for up to $MaxMinutes minutes`n" -ForegroundColor Gray

$attempts = 0
$maxAttempts = $MaxMinutes * 2

while ($attempts -lt $maxAttempts) {
    $attempts++
    $mins = [math]::Round($attempts * 0.5, 1)
    Write-Host "[$mins min] Attempt $attempts..." -ForegroundColor Yellow -NoNewline
    
    $body = "{`"amount`":50000,`"currency`":`"IDR`",`"payment_method_id`":`"$Method`",`"customer`":{`"given_names`":`"Test`",`"email`":`"test@test.com`"},`"description`":`"Test`",`"external_id`":`"test_$(Get-Date -Format 'HHmmss')`"}"
    
    try {
        $r = Invoke-RestMethod -Uri 'https://www.jbalwikobra.com/api/xendit/create-direct-payment' -Method Post -Body $body -ContentType 'application/json' -ErrorAction Stop
        Write-Host " ✅ SUCCESS!" -ForegroundColor Green
        Write-Host "`nPayment ID: $($r.id)" -ForegroundColor White
        Write-Host "Status: $($r.status)" -ForegroundColor White
        Write-Host "Amount: $($r.amount) $($r.currency)" -ForegroundColor White
        if ($r.payment_url) { Write-Host "URL: $($r.payment_url)" -ForegroundColor Yellow }
        exit 0
    }
    catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -eq 429) {
            Write-Host " 429 (waiting...)" -ForegroundColor Red
            Start-Sleep -Seconds 30
        }
        elseif ($status -eq 400) {
            Write-Host " ❌ ERROR 400" -ForegroundColor Red
            $err = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "`nError: $($err.data.message)" -ForegroundColor Yellow
            exit 1
        }
        else {
            Write-Host " ❌ HTTP $status" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host "`n⏱️  Timeout - still rate limited" -ForegroundColor Yellow
exit 1
