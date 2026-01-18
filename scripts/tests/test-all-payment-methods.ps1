# Test Multiple Payment Methods
# Usage: .\scripts\test-all-payment-methods.ps1 [base_url]
# Example: .\scripts\test-all-payment-methods.ps1 http://localhost:3000

param(
    [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "  TEST ALL PAYMENT METHODS" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor White
Write-Host ""

# Define payment methods to test
$paymentMethods = @(
    @{ id = 'qris'; name = 'QRIS'; amount = 50000 },
    @{ id = 'bni'; name = 'BNI Virtual Account'; amount = 75000 },
    @{ id = 'shopeepay'; name = 'ShopeePay'; amount = 100000 }
)

$results = @()

foreach ($method in $paymentMethods) {
    Write-Host "Testing: $($method.name)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor DarkGray
    
    $externalId = "test-$($method.id)-$(Get-Date -Format 'yyyyMMddHHmmss')"
    $body = @{
        amount = $method.amount
        currency = 'IDR'
        payment_method_id = $method.id
        external_id = $externalId
        description = "Test - $($method.name)"
        customer = @{
            given_names = 'Test Customer'
            email = 'test@jbalwikobra.com'
            mobile_number = '+628123456789'
        }
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod `
            -Uri "$BaseUrl/api/xendit/create-direct-payment" `
            -Method Post `
            -Body $body `
            -ContentType 'application/json' `
            -TimeoutSec 30
        
        Write-Host "  ✅ SUCCESS" -ForegroundColor Green
        Write-Host "  Payment ID: $($response.id)" -ForegroundColor White
        Write-Host "  Status: $($response.status)" -ForegroundColor White
        
        if ($response.actions.desktop_web_checkout_url) {
            Write-Host "  URL: $($response.actions.desktop_web_checkout_url.Substring(0, 50))..." -ForegroundColor Gray
        }
        
        $results += @{
            method = $method.name
            status = 'PASS'
            payment_id = $response.id
        }
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  ❌ FAILED - Status: $statusCode" -ForegroundColor Red
        
        if ($_.ErrorDetails.Message) {
            try {
                $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
                Write-Host "  Error: $($errorObj.error)" -ForegroundColor Red
            } catch {
                Write-Host "  Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
            }
        }
        
        $results += @{
            method = $method.name
            status = 'FAIL'
            error = $statusCode
        }
    }
    
    Write-Host ""
    Start-Sleep -Seconds 2
}

# Summary
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan

foreach ($result in $results) {
    $statusColor = if ($result.status -eq 'PASS') { 'Green' } else { 'Red' }
    $statusIcon = if ($result.status -eq 'PASS') { '✅' } else { '❌' }
    
    Write-Host "  $statusIcon $($result.method): $($result.status)" -ForegroundColor $statusColor
}

$passCount = ($results | Where-Object { $_.status -eq 'PASS' }).Count
$totalCount = $results.Count

Write-Host ""
Write-Host "  Result: $passCount/$totalCount tests passed" -ForegroundColor $(if ($passCount -eq $totalCount) { 'Green' } else { 'Yellow' })
Write-Host "==================================================" -ForegroundColor Cyan
