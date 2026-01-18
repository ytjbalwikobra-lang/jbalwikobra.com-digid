# Deployment & Testing Instructions

## 🚀 Deploy to Vercel

### Option 1: Via Vercel Dashboard (Recommended)
1. Go to https://vercel.com/dashboard
2. Select your project: `jbalwikobra.com-digid`
3. Click **"Deploy"** or push to Git to trigger auto-deployment
4. Wait for build to complete (~2-3 minutes)

### Option 2: Via Vercel CLI (if logged in)
```powershell
# Login first (one-time)
npx vercel login

# Deploy to production
npx vercel --prod
```

### Option 3: Via Git Push (if Git is configured)
```powershell
git add -A
git commit -m "fix: admin users API and payment type errors"
git push origin main
```

---

## ✅ What Was Fixed

### 1. **Payment API Type Errors** 
- File: `api/xendit/create-direct-payment.ts`
- Fixed QRIS type from `'QRIS'` to `'QR_CODE'` (matches Xendit API)
- Fixed comparison logic for QR_CODE payment method

### 2. **Admin Users API**
- File: `api/admin.ts` line 261
- Removed non-existent `role` field from SELECT query
- Added `avatar_url` field
- Improved search: now checks both name AND email
- Added error logging

### 3. **Admin Orders API**
- File: `api/admin.ts` line 180
- Removed non-existent `product_name` from SELECT query (orders table doesn't have this column)
- Removed legacy `xendit_invoice_id` field
- Added separate query to fetch product names from products table
- Product names now properly joined via product_id relationship

### 4. **Enhanced Logging**
- File: `src/services/adminService.ts`
- Added sample data logging
- Added detailed error response logging

---

## 🧪 Test After Deployment

### Test 1: Check Admin Users Table
1. Open browser: `https://jbalwikobra.com/admin/users`
2. Login with admin credentials
3. **Expected:** Table shows user data with columns (ID, Name, Email, Phone, Admin, Active, Last Login)
4. **Check console:** Should see `[adminService.getUsers - CACHED] Fetched via API: X of Y`

### Test 2: Check Admin Orders Table
1. Open browser: `https://jbalwikobra.com/admin/orders`
2. **Expected:** Table shows order data with customer names, amounts, statuses
3. **Check console:** Should see `[adminService.getOrders - CACHED] Fetched via API: X of Y`

### Test 3: Test Payment Flow (QRIS)
1. Go to catalog: `https://jbalwikobra.com/catalog`
2. Add any product to cart
3. Go to checkout
4. Select **QRIS** as payment method
5. Fill in customer details
6. Click "Bayar Sekarang"
7. **Expected:** Redirects to Xendit payment page (no "channel_code required" error)

### Test 4: Test Payment Flow (Virtual Account)
1. Repeat steps 1-3 above
2. Select **BNI Virtual Account** as payment method
3. Complete checkout
4. **Expected:** Shows BNI VA number and payment instructions

### Test 5: Test Payment Flow (E-wallet)
1. Repeat steps 1-3 above
2. Select **ShopeePay** as payment method
3. Complete checkout
4. **Expected:** Shows ShopeePay QR code or deeplink

---

## 🔍 Manual API Testing (After Rate Limit Clears)

Wait 10-15 minutes for rate limit to reset, then test via browser console:

### Test Users API
```javascript
fetch('https://jbalwikobra.com/api/admin?action=users&page=1&limit=5')
  .then(r => r.json())
  .then(d => console.log('Users:', d))
```

### Test Orders API
```javascript
fetch('https://jbalwikobra.com/api/admin?action=orders&page=1&limit=5')
  .then(r => r.json())
  .then(d => console.log('Orders:', d))
```

### Test Payment API
```javascript
fetch('https://jbalwikobra.com/api/xendit/create-direct-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 50000,
    currency: 'IDR',
    payment_method_id: 'qris',
    external_id: 'test-' + Date.now(),
    description: 'Test Payment',
    customer: {
      given_names: 'Test User',
      email: 'test@test.com',
      mobile_number: '+628123456789'
    }
  })
})
.then(r => r.json())
.then(d => console.log('Payment:', d))
```

---

## 📊 Expected Results

### Admin Users API
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "User Name",
      "email": "user@example.com",
      "phone": "+628xxx",
      "avatar_url": "https://...",
      "is_admin": false,
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "last_login": "2025-01-15T10:30:00Z"
    }
  ],
  "count": 955,
  "page": 1
}
```

### Admin Orders API
```json
{
  "data": [
    {
      "id": "uuid",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "total_amount": 150000,
      "status": "completed",
      "payment_status": "paid",
      "created_at": "2025-01-15T09:00:00Z"
    }
  ],
  "count": 1324,
  "page": 1
}
```

### Payment API
```json
{
  "id": "pr-xxx",
  "status": "PENDING",
  "amount": 50000,
  "currency": "IDR",
  "actions": {
    "desktop_web_checkout_url": "https://checkout.xendit.co/...",
    "mobile_web_checkout_url": "https://checkout.xendit.co/..."
  }
}
```

---

## ⚠️ Current Status

- ✅ All TypeScript errors fixed
- ✅ Admin users API query corrected
- ✅ Payment type errors resolved
- ✅ Enhanced logging implemented
- ⏳ **PENDING:** Deployment to Vercel
- ⏳ **PENDING:** Testing on live environment

Production site is currently rate-limited (429 errors) from previous test attempts. Wait 10-15 minutes before testing APIs again.

---

## 🛠️ Files Changed

1. `api/xendit/create-direct-payment.ts` - Lines 119, 181
2. `api/admin.ts` - Lines 241-252
3. `src/services/adminService.ts` - Enhanced logging
4. `scripts/test-production-apis.ps1` - New test script

All changes are ready for deployment!
