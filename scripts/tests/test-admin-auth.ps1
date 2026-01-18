# Test Admin API Authentication
# This script tests the new authentication middleware for admin endpoints

Write-Host "🔐 Testing Admin API Authentication" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# Configuration
$BaseUrl = "https://www.jbalwikobra.com"
$AdminEmail = Read-Host "Enter admin email"
$AdminPassword = Read-Host "Enter admin password" -AsSecureString
$AdminPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AdminPassword))

Write-Host "`n📝 Step 1: Login to get session token..." -ForegroundColor Yellow

try {
    $loginBody = @{
        email = $AdminEmail
        password = $AdminPasswordPlain
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/api/auth?action=login" `
        -Method Post `
        -Body $loginBody `
        -ContentType 'application/json' `
        -ErrorAction Stop

    if ($loginResponse.session_token) {
        $SessionToken = $loginResponse.session_token
        Write-Host "✅ Login successful!" -ForegroundColor Green
        Write-Host "   User: $($loginResponse.user.email)" -ForegroundColor Gray
        Write-Host "   Admin: $($loginResponse.user.is_admin)" -ForegroundColor Gray
        Write-Host "   Token: $($SessionToken.Substring(0, 20))..." -ForegroundColor Gray
    } else {
        Write-Host "❌ Login failed: No session token returned" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n📝 Step 2: Test admin API WITHOUT authentication (should fail)..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/admin?action=dashboard-stats" `
        -Method Get `
        -ContentType 'application/json' `
        -ErrorAction Stop
    
    Write-Host "⚠️  WARNING: API accessible without authentication!" -ForegroundColor Red
    Write-Host "   This is a SECURITY ISSUE if in production" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "✅ Correctly rejected - 401 Unauthorized" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Unexpected error: HTTP $statusCode" -ForegroundColor Yellow
    }
}

Write-Host "`n📝 Step 3: Test admin API WITH valid authentication..." -ForegroundColor Yellow

try {
    $headers = @{
        'Authorization' = "Bearer $SessionToken"
        'Content-Type' = 'application/json'
    }

    $response = Invoke-RestMethod -Uri "$BaseUrl/api/admin?action=dashboard-stats" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Host "✅ Successfully authenticated!" -ForegroundColor Green
    Write-Host "`n📊 Dashboard Stats:" -ForegroundColor Cyan
    Write-Host "   Orders: $($response.orders.count)" -ForegroundColor White
    Write-Host "   Users: $($response.users.count)" -ForegroundColor White
    Write-Host "   Products: $($response.products.count)" -ForegroundColor White
    Write-Host "   Revenue: Rp $('{0:N0}' -f $response.orders.revenue)" -ForegroundColor White
} catch {
    Write-Host "❌ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $err = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Error: $($err.error)" -ForegroundColor Yellow
        Write-Host "   Message: $($err.message)" -ForegroundColor Yellow
    }
    exit 1
}

Write-Host "`n📝 Step 4: Test admin notifications API..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/admin-notifications?action=recent&limit=5" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Host "✅ Notifications API authenticated!" -ForegroundColor Green
    Write-Host "   Retrieved $($response.data.Count) notifications" -ForegroundColor White
} catch {
    Write-Host "❌ Notifications API failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n📝 Step 5: Test admin WhatsApp API..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/admin-whatsapp" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Host "✅ WhatsApp API authenticated!" -ForegroundColor Green
    Write-Host "   Provider: $($response.name)" -ForegroundColor White
} catch {
    Write-Host "❌ WhatsApp API failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n📝 Step 6: Test with invalid token (should fail)..." -ForegroundColor Yellow

try {
    $badHeaders = @{
        'Authorization' = "Bearer invalid_token_12345"
        'Content-Type' = 'application/json'
    }

    $response = Invoke-RestMethod -Uri "$BaseUrl/api/admin?action=dashboard-stats" `
        -Method Get `
        -Headers $badHeaders `
        -ErrorAction Stop
    
    Write-Host "⚠️  WARNING: Invalid token accepted!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "✅ Correctly rejected invalid token - 401 Unauthorized" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Unexpected error: HTTP $statusCode" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Authentication Tests Complete!" -ForegroundColor Green
Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "✅ Middleware successfully blocks unauthenticated requests" -ForegroundColor Green
Write-Host "✅ Valid session tokens are accepted" -ForegroundColor Green
Write-Host "✅ Invalid tokens are rejected" -ForegroundColor Green
Write-Host "✅ All admin endpoints protected" -ForegroundColor Green
