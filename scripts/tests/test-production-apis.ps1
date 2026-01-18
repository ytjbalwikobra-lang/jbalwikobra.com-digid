# Test Production APIs with Rate Limit Handling
# Usage: .\scripts\test-production-apis.ps1

param(
    [string]$BaseUrl = "https://jbalwikobra.com"
)

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Testing APIs on: $BaseUrl" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

function Test-API {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Body = $null
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "URL: $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            TimeoutSec = 15
            ErrorAction = 'Stop'
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            $params.ContentType = 'application/json'
        }
        
        $response = Invoke-RestMethod @params
        
        Write-Host "  Status: SUCCESS" -ForegroundColor Green
        
        if ($response.count -ne $null) {
            Write-Host "  Total Count: $($response.count)" -ForegroundColor White
        }
        
        if ($response.data) {
            Write-Host "  Data Items: $($response.data.Count)" -ForegroundColor White
            
            if ($response.data.Count -gt 0) {
                $sample = $response.data[0]
                Write-Host "  Sample Fields: $($sample.PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
                
                # Show key info based on type
                if ($sample.email) {
                    Write-Host "  First Item: $($sample.name) - $($sample.email)" -ForegroundColor White
                } elseif ($sample.customer_name) {
                    Write-Host "  First Item: Order #$($sample.id) - $($sample.customer_name) - IDR $($sample.total_amount)" -ForegroundColor White
                }
            }
        }
        
        if ($response.id -and $response.actions) {
            Write-Host "  Payment ID: $($response.id)" -ForegroundColor White
            if ($response.actions.desktop_web_checkout_url) {
                Write-Host "  Checkout URL: $($response.actions.desktop_web_checkout_url)" -ForegroundColor White
            }
            if ($response.actions.mobile_deeplink_checkout_url) {
                Write-Host "  Mobile URL: $($response.actions.mobile_deeplink_checkout_url)" -ForegroundColor White
            }
        }
        
        Write-Host ""
        return $true
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  Status: FAILED ($statusCode)" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($_.ErrorDetails.Message) {
            try {
                $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
                Write-Host "  Details: $($errorObj.error)" -ForegroundColor Red
            } catch {
                Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
            }
        }
        
        Write-Host ""
        return $false
    }
}

# Test 1: Users API
$test1 = Test-API -Name "Admin Users API" -Url ($BaseUrl + '/api/admin?action=users&page=1&limit=5')
Start-Sleep -Seconds 2

# Test 2: Orders API
$test2 = Test-API -Name "Admin Orders API" -Url ($BaseUrl + '/api/admin?action=orders&page=1&limit=5')
Start-Sleep -Seconds 2

# Test 3: QRIS Payment
$qrisBody = @{
    amount = 50000
    currency = "IDR"
    payment_method_id = "qris"
    external_id = "test-qris-$(Get-Date -Format 'yyyyMMddHHmmss')"
    description = "Test QRIS Payment"
    customer = @{
        given_names = "Test User"
        email = "test@example.com"
        mobile_number = "+628123456789"
    }
}
$test3 = Test-API -Name "Payment - QRIS" -Url ($BaseUrl + '/api/xendit/create-direct-payment') -Method POST -Body $qrisBody
Start-Sleep -Seconds 2

# Test 4: BNI VA Payment
$bniBody = @{
    amount = 75000
    currency = "IDR"
    payment_method_id = "bni"
    external_id = "test-bni-$(Get-Date -Format 'yyyyMMddHHmmss')"
    description = "Test BNI VA Payment"
    customer = @{
        given_names = "Test User"
        email = "test@example.com"
        mobile_number = "+628123456789"
    }
}
$test4 = Test-API -Name "Payment - BNI VA" -Url ($BaseUrl + '/api/xendit/create-direct-payment') -Method POST -Body $bniBody
Start-Sleep -Seconds 2

# Test 5: ShopeePay Payment
$shopeeBody = @{
    amount = 100000
    currency = "IDR"
    payment_method_id = "shopeepay"
    external_id = "test-shopeepay-$(Get-Date -Format 'yyyyMMddHHmmss')"
    description = "Test ShopeePay Payment"
    customer = @{
        given_names = "Test User"
        email = "test@example.com"
        mobile_number = "+628123456789"
    }
}
$test5 = Test-API -Name "Payment - ShopeePay" -Url ($BaseUrl + '/api/xendit/create-direct-payment') -Method POST -Body $shopeeBody

# Summary
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  1. Admin Users API:    $(if($test1){'PASS'}else{'FAIL'})" -ForegroundColor $(if($test1){'Green'}else{'Red'})
Write-Host "  2. Admin Orders API:   $(if($test2){'PASS'}else{'FAIL'})" -ForegroundColor $(if($test2){'Green'}else{'Red'})
Write-Host "  3. Payment - QRIS:     $(if($test3){'PASS'}else{'FAIL'})" -ForegroundColor $(if($test3){'Green'}else{'Red'})
Write-Host "  4. Payment - BNI VA:   $(if($test4){'PASS'}else{'FAIL'})" -ForegroundColor $(if($test4){'Green'}else{'Red'})
Write-Host "  5. Payment - ShopeePay: $(if($test5){'PASS'}else{'FAIL'})" -ForegroundColor $(if($test5){'Green'}else{'Red'})
Write-Host "===============================================" -ForegroundColor Cyan

$passCount = @($test1, $test2, $test3, $test4, $test5) | Where-Object { $_ } | Measure-Object | Select-Object -ExpandProperty Count
Write-Host "  Result: $passCount/5 tests passed" -ForegroundColor $(if($passCount -eq 5){'Green'}else{'Yellow'})
Write-Host "===============================================" -ForegroundColor Cyan
