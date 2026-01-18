# Test payment after waiting for rate limit
param(
    [int]$WaitSeconds = 120,
    [string]$Method = "qris"
)

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "  WAITING FOR RATE LIMIT TO CLEAR" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "`n⏳ Waiting $WaitSeconds seconds..." -ForegroundColor Yellow
Write-Host "   Started at: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray

$remaining = $WaitSeconds
while ($remaining -gt 0) {
    if ($remaining % 30 -eq 0) {
        Write-Host "   $remaining seconds remaining..." -ForegroundColor Gray
    }
    Start-Sleep -Seconds 1
    $remaining--
}

Write-Host "`n✓ Wait complete at: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Green
Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "  TESTING PAYMENT" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

$methodNames = @{
    'qris' = 'QRIS'
    'bni' = 'BNI Virtual Account'
    'bri' = 'BRI Virtual Account'
    'shopeepay' = 'ShopeePay'
    'gopay' = 'GoPay'
    'dana' = 'DANA'
}

$methodName = if ($methodNames[$Method]) { $methodNames[$Method] } else { $Method.ToUpper() }
$externalId = "test_$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "`nMethod: $methodName" -ForegroundColor Cyan
Write-Host "Amount: 50,000 IDR" -ForegroundColor White
Write-Host "External ID: $externalId" -ForegroundColor Gray

$body = @{
    amount = 50000
    currency = 'IDR'
    payment_method_id = $Method
    customer = @{
        given_names = 'Test Customer'
        email = 'test@example.com'
        mobile_number = '+6281234567890'
    }
    description = "Test $methodName Payment"
    external_id = $externalId
    success_redirect_url = 'https://www.jbalwikobra.com/payment-success'
    failure_redirect_url = 'https://www.jbalwikobra.com/payment-failed'
} | ConvertTo-Json -Depth 5

Write-Host "`n🌐 Calling API..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri 'https://www.jbalwikobra.com/api/xendit/create-direct-payment' -Method Post -Body $body -ContentType 'application/json' -ErrorAction Stop
    
    Write-Host "`n✅ SUCCESS!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "`nPayment Details:" -ForegroundColor Cyan
    Write-Host "  ID: $($response.id)" -ForegroundColor White
    Write-Host "  Status: $($response.status)" -ForegroundColor White
    Write-Host "  Amount: $($response.amount) $($response.currency)" -ForegroundColor White
    Write-Host "  Reference: $($response.reference_id)" -ForegroundColor Gray
    
    if ($response.payment_url) {
        Write-Host "`n🔗 Payment URL:" -ForegroundColor Cyan
        Write-Host "  $($response.payment_url)" -ForegroundColor Yellow
    }
    
    Write-Host "`n==================================================" -ForegroundColor Cyan
    Write-Host "✅ Payment created successfully!" -ForegroundColor Green
    
}
catch {
    Write-Host "`n❌ FAILED" -ForegroundColor Red
    Write-Host "==================================================" -ForegroundColor Red
    
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "`nHTTP Status: $statusCode" -ForegroundColor Yellow
    
    if ($_.ErrorDetails.Message) {
        try {
            $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
            
            Write-Host "`nError Details:" -ForegroundColor Red
            if ($errorObj.error_code) {
                Write-Host "  Code: $($errorObj.error_code)" -ForegroundColor Yellow
            }
            if ($errorObj.message) {
                Write-Host "  Message: $($errorObj.message)" -ForegroundColor Yellow
            }
            if ($errorObj.error) {
                Write-Host "  Error: $($errorObj.error)" -ForegroundColor Yellow
            }
            if ($errorObj.data) {
                Write-Host "`n  Raw Data:" -ForegroundColor Gray
                $errorObj.data | ConvertTo-Json -Depth 3 | Write-Host
            }
        } catch {
            Write-Host "`n$($_.ErrorDetails.Message)" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n==================================================" -ForegroundColor Red
}
