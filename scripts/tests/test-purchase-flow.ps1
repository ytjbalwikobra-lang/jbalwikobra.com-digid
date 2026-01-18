# Test Purchase Flow
# Usage: .\scripts\test-purchase-flow.ps1 [base_url] [payment_method]
# Examples:
#   .\scripts\test-purchase-flow.ps1 http://localhost:3000 qris
#   .\scripts\test-purchase-flow.ps1 https://www.jbalwikobra.com bni

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$PaymentMethod = "qris"
)

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "  TEST PURCHASE FLOW" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor White
Write-Host "Payment Method: $PaymentMethod" -ForegroundColor White
Write-Host ""

# Payment method names
$methodNames = @{
    'qris' = 'QRIS'
    'bni' = 'BNI Virtual Account'
    'bri' = 'BRI Virtual Account'
    'mandiri' = 'Mandiri Virtual Account'
    'permata' = 'Permata Virtual Account'
    'cimb' = 'CIMB Virtual Account'
    'bsi' = 'BSI Virtual Account'
    'bjb' = 'BJB Virtual Account'
    'shopeepay' = 'ShopeePay'
    'gopay' = 'GoPay'
    'dana' = 'DANA'
    'linkaja' = 'LinkAja'
    'ovo' = 'OVO'
    'astrapay' = 'AstraPay'
    'jeniuspay' = 'JeniusPay'
    'indomaret' = 'Indomaret'
}

$methodName = $methodNames[$PaymentMethod]
if (-not $methodName) {
    $methodName = $PaymentMethod.ToUpper()
}

Write-Host "Step 1: Creating test purchase with $methodName..." -ForegroundColor Cyan
Write-Host ""

# Create payment payload
$externalId = "test-purchase-$(Get-Date -Format 'yyyyMMddHHmmss')"
$body = @{
    amount = 50000
    currency = 'IDR'
    payment_method_id = $PaymentMethod
    external_id = $externalId
    description = "Test Purchase - $methodName"
    customer = @{
        given_names = 'Test Customer'
        email = 'test@jbalwikobra.com'
        mobile_number = '+628123456789'
    }
} | ConvertTo-Json -Depth 10

Write-Host "Request Payload:" -ForegroundColor Gray
Write-Host $body -ForegroundColor DarkGray
Write-Host ""

# Send request
try {
    Write-Host "Sending request to: $BaseUrl/api/xendit/create-direct-payment" -ForegroundColor White
    
    $response = Invoke-RestMethod `
        -Uri "$BaseUrl/api/xendit/create-direct-payment" `
        -Method Post `
        -Body $body `
        -ContentType 'application/json' `
        -TimeoutSec 30

    Write-Host ""
    Write-Host "✅ SUCCESS! Payment Created" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Cyan
    
    # Display key information
    Write-Host ""
    Write-Host "Payment Information:" -ForegroundColor Yellow
    Write-Host "  ID: $($response.id)" -ForegroundColor White
    Write-Host "  Status: $($response.status)" -ForegroundColor White
    Write-Host "  Amount: IDR $($response.amount)" -ForegroundColor White
    Write-Host "  External ID: $externalId" -ForegroundColor White
    
    if ($response.payment_method) {
        Write-Host ""
        Write-Host "Payment Method Details:" -ForegroundColor Yellow
        Write-Host "  Type: $($response.payment_method.type)" -ForegroundColor White
        
        if ($response.payment_method.qr_code) {
            Write-Host "  QR Code Available: Yes" -ForegroundColor White
        }
        if ($response.payment_method.virtual_account) {
            Write-Host "  Virtual Account Available: Yes" -ForegroundColor White
        }
        if ($response.payment_method.ewallet) {
            Write-Host "  E-wallet Available: Yes" -ForegroundColor White
        }
        if ($response.payment_method.over_the_counter) {
            Write-Host "  Over the Counter Available: Yes" -ForegroundColor White
        }
    }
    
    # Display actions/checkout URLs
    if ($response.actions) {
        Write-Host ""
        Write-Host "Payment Actions:" -ForegroundColor Yellow
        
        if ($response.actions.desktop_web_checkout_url) {
            Write-Host "  Desktop Checkout:" -ForegroundColor Cyan
            Write-Host "    $($response.actions.desktop_web_checkout_url)" -ForegroundColor White
        }
        
        if ($response.actions.mobile_web_checkout_url) {
            Write-Host "  Mobile Checkout:" -ForegroundColor Cyan
            Write-Host "    $($response.actions.mobile_web_checkout_url)" -ForegroundColor White
        }
        
        if ($response.actions.mobile_deeplink_checkout_url) {
            Write-Host "  Mobile Deeplink:" -ForegroundColor Cyan
            Write-Host "    $($response.actions.mobile_deeplink_checkout_url)" -ForegroundColor White
        }
        
        if ($response.actions.qr_checkout_string) {
            Write-Host "  QR String:" -ForegroundColor Cyan
            $qrString = $response.actions.qr_checkout_string
            if ($qrString.Length -gt 100) {
                Write-Host "    $($qrString.Substring(0, 100))..." -ForegroundColor White
            } else {
                Write-Host "    $qrString" -ForegroundColor White
            }
        }
    }
    
    # Display expiry if available
    if ($response.expires_at) {
        Write-Host ""
        Write-Host "Expires At: $($response.expires_at)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Full Response (JSON):" -ForegroundColor Gray
    $response | ConvertTo-Json -Depth 10
    
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "✅ Test Completed Successfully!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ FAILED! Payment Creation Error" -ForegroundColor Red
    Write-Host "==================================================" -ForegroundColor Cyan
    
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host ""
    Write-Host "HTTP Status: $statusCode" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Error Details:" -ForegroundColor Yellow
        try {
            $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
            $errorObj | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Red
            
            # Display specific error messages
            Write-Host ""
            if ($errorObj.error) {
                Write-Host "Error: $($errorObj.error)" -ForegroundColor Red
            }
            if ($errorObj.message) {
                Write-Host "Message: $($errorObj.message)" -ForegroundColor Red
            }
            if ($errorObj.error_code) {
                Write-Host "Error Code: $($errorObj.error_code)" -ForegroundColor Red
            }
        } catch {
            Write-Host $_.ErrorDetails.Message -ForegroundColor Red
        }
    } else {
        Write-Host ""
        Write-Host "Exception: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    
    # Suggestions based on status code
    if ($statusCode -eq 429) {
        Write-Host ""
        Write-Host "💡 Rate Limited - Please wait a few minutes and try again" -ForegroundColor Yellow
    } elseif ($statusCode -eq 400) {
        Write-Host ""
        Write-Host "💡 Bad Request - Check the error message above for details" -ForegroundColor Yellow
    } elseif ($statusCode -eq 500) {
        Write-Host ""
        Write-Host "💡 Server Error - Check server logs for details" -ForegroundColor Yellow
    }
    
    exit 1
}
