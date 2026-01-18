# Quick Test Script for Admin APIs and Payment
# This tests the deployed Vercel instance

Write-Host "🧪 Testing Admin & Payment APIs" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# You can set the base URL here (Vercel deployment)
$BASE_URL = "https://jbalwikobra.com"  # Change to your Vercel URL
if ($args.Count -gt 0) {
    $BASE_URL = $args[0]
}

Write-Host "Base URL: $BASE_URL" -ForegroundColor Yellow
Write-Host ""

# Test 1: Users API
Write-Host "📊 Test 1: Users API" -ForegroundColor Green
try {
    $uri = $BASE_URL + '/api/admin?action=users&page=1&limit=5'
    $response = Invoke-RestMethod -Uri $uri -Method Get -TimeoutSec 10
    Write-Host "  ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "  Count: $($response.count)" -ForegroundColor White
    Write-Host "  Returned: $($response.data.Count) users" -ForegroundColor White
    if ($response.data.Count -gt 0) {
        $user = $response.data[0]
        Write-Host "  Sample user:" -ForegroundColor White
        Write-Host "    - ID: $($user.id)" -ForegroundColor Gray
        Write-Host "    - Name: $($user.name)" -ForegroundColor Gray
        Write-Host "    - Email: $($user.email)" -ForegroundColor Gray
        Write-Host "    - Admin: $($user.is_admin)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Orders API
Write-Host "📦 Test 2: Orders API" -ForegroundColor Green
try {
    $uri = $BASE_URL + '/api/admin?action=orders&page=1&limit=5'
    $response = Invoke-RestMethod -Uri $uri -Method Get -TimeoutSec 10
    Write-Host "  ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "  Count: $($response.count)" -ForegroundColor White
    Write-Host "  Returned: $($response.data.Count) orders" -ForegroundColor White
    if ($response.data.Count -gt 0) {
        $order = $response.data[0]
        Write-Host "  Sample order:" -ForegroundColor White
        Write-Host "    - ID: $($order.id)" -ForegroundColor Gray
        Write-Host "    - Customer: $($order.customer_name)" -ForegroundColor Gray
        Write-Host "    - Amount: IDR $($order.total_amount)" -ForegroundColor Gray
        Write-Host "    - Status: $($order.status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Payment - QRIS
Write-Host "💳 Test 3: Payment Creation - QRIS" -ForegroundColor Green
try {
    $body = @{
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
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BASE_URL/api/xendit/create-direct-payment" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Host "  ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "  Payment ID: $($response.id)" -ForegroundColor White
    if ($response.actions) {
        Write-Host "  Checkout URL: $($response.actions.desktop_web_checkout_url)" -ForegroundColor White
    }
} catch {
    Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 4: Payment - Virtual Account (BNI)
Write-Host "🏦 Test 4: Payment Creation - BNI VA" -ForegroundColor Green
try {
    $body = @{
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
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BASE_URL/api/xendit/create-direct-payment" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Host "  ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "  Payment ID: $($response.id)" -ForegroundColor White
    if ($response.actions) {
        Write-Host "  Checkout URL: $($response.actions.desktop_web_checkout_url)" -ForegroundColor White
    }
} catch {
    Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 5: Payment - E-wallet (ShopeePay)
Write-Host "💰 Test 5: Payment Creation - ShopeePay" -ForegroundColor Green
try {
    $body = @{
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
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BASE_URL/api/xendit/create-direct-payment" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Host "  ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "  Payment ID: $($response.id)" -ForegroundColor White
    if ($response.actions) {
        Write-Host "  Mobile URL: $($response.actions.mobile_deeplink_checkout_url)" -ForegroundColor White
    }
} catch {
    Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Testing Complete!" -ForegroundColor Cyan
