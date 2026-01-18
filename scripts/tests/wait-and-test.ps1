# Wait for Xendit rate limit to clear and test payment
param(
    [int]$MaxWaitMinutes = 15,
    [string]$Method = "qris"
)

$methodNames = @{
    'qris' = 'QRIS'
    'bni' = 'BNI Virtual Account'
    'bri' = 'BRI Virtual Account'
}
$methodName = if ($methodNames[$Method]) { $methodNames[$Method] } else { $Method.ToUpper() }

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "  WAITING FOR RATE LIMIT TO CLEAR" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "`nMethod: $methodName" -ForegroundColor White
Write-Host "Max wait: $MaxWaitMinutes minutes" -ForegroundColor Gray
Write-Host "Started: $(Get-Date -Format 'HH:mm:ss')`n" -ForegroundColor Gray

$attempts = 0
$maxAttempts = $MaxWaitMinutes * 2  # Try every 30 seconds

while ($attempts -lt $maxAttempts) {
    $attempts++
    $elapsed = [math]::Round($attempts * 0.5, 1)
    
    Write-Host "[$elapsed min] Attempt $attempts..." -ForegroundColor Yellow -NoNewline
    
    $externalId = "test_$(Get-Date -Format 'yyyyMMddHHmmss')"
    $body = @{
        amount = 50000
        currency = 'IDR'
        payment_method_id = $Method
        customer = @{
            given_names = 'Test'
            email = 'test@example.com'
        }
        description = "Test $methodName"
        external_id = $externalId
    } | ConvertTo-Json -Compress
    
    try {
        $response = Invoke-RestMethod -Uri 'https://www.jbalwikobra.com/api/xendit/create-direct-payment' -Method Post -Body $body -ContentType 'application/json' -ErrorAction Stop
        
        Write-Host " ✅ SUCCESS!" -ForegroundColor Green
        Write-Host "`n==================================================" -ForegroundColor Cyan
        Write-Host "  PAYMENT CREATED" -ForegroundColor Green
        Write-Host "==================================================" -ForegroundColor Cyan
        Write-Host "`nDetails:" -ForegroundColor Cyan
        Write-Host "  ID: $($response.id)" -ForegroundColor White
        Write-Host "  Status: $($response.status)" -ForegroundColor White
        Write-Host "  Amount: $($response.amount) $($response.currency)" -ForegroundColor White
        Write-Host "  Time: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
        
        if ($response.payment_url) {
            Write-Host "`n🔗 Payment URL:" -ForegroundColor Cyan
            Write-Host "  $($response.payment_url)" -ForegroundColor Yellow
        }
        
        Write-Host "`n==================================================" -ForegroundColor Cyan
        exit 0
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($statusCode -eq 429) {
            Write-Host " Rate limited (429)" -ForegroundColor Red
            Write-Host "  Waiting 30 seconds..." -ForegroundColor Gray
            Start-Sleep -Seconds 30
        } elseif ($statusCode -eq 400) {
            Write-Host " ❌ ERROR 400" -ForegroundColor Red
            
            if ($_.ErrorDetails.Message) {
                try {
                    $err = $_.ErrorDetails.Message | ConvertFrom-Json
                    Write-Host "`nAPI Validation Error:" -ForegroundColor Red
                    Write-Host "  Code: $($err.data.error_code)" -ForegroundColor Yellow
                    Write-Host "  Message: $($err.data.message)" -ForegroundColor Yellow
                    
                    Write-Host "`n❌ Payment structure still incorrect!" -ForegroundColor Red
                    Write-Host "The API fix did not work. Check Vercel logs." -ForegroundColor Yellow
                }
                catch {
                    Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
                }
            }
            exit 1
        }
        else {
            Write-Host " ❌ HTTP $statusCode" -ForegroundColor Red
            if ($_.ErrorDetails.Message) {
                Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
            }
            exit 1
        }
    }
}

Write-Host "`n⏱️  Timeout after $MaxWaitMinutes minutes" -ForegroundColor Yellow
Write-Host "Xendit rate limit still active. Try again later." -ForegroundColor Gray
exit 1
