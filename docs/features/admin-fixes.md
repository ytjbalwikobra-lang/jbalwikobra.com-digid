# 🔧 Payment & Admin Issues - Fixes Applied

## Issues Fixed

### 1. ✅ Payment Method Error: "The provided payment method is not yet supported"

**Problem:** Xendit API was rejecting QRIS payments because the payment method type was incorrect.

**Root Cause:** 
- Code was sending `type: 'qris'` directly
- Xendit Payment Request API requires `type: 'QR_CODE'` with proper channel structure

**Fix Applied:**
- Added payment method mapping in `api/xendit/create-direct-payment.ts`
- Maps user-friendly IDs to Xendit Payment Request API format:
  - `qris` → `QR_CODE`
  - `bca/bni/bri/mandiri/permata` → `VIRTUAL_ACCOUNT` with `channel_code`
  - `gopay/ovo/dana/linkaja/shopeepay` → `EWALLET` with `channel_code`
  - `alfamart/indomaret` → `OVER_THE_COUNTER` with `channel_code`

**Changed Code:**
```typescript
// Before
payment_method: {
  type: payment_method_id, // Wrong: 'qris'
  reusability: 'ONE_TIME_USE'
}

// After
const paymentMethodMap = {
  'qris': 'QR_CODE',
  'bca': 'VIRTUAL_ACCOUNT',
  // ... more mappings
};
const xenditPaymentType = paymentMethodMap[payment_method_id.toLowerCase()];

payment_method: {
  type: xenditPaymentType, // Correct: 'QR_CODE'
  reusability: 'ONE_TIME_USE',
  // Add channel-specific config
  ...(xenditPaymentType === 'VIRTUAL_ACCOUNT' && {
    virtual_account: { channel_code: payment_method_id.toUpperCase() }
  })
}
```

---

### 2. ✅ Duplicate Key Constraint Error

**Problem:** 
```
duplicate key value violates unique constraint "uq_orders_customer_amount_hour"
Key (customer_email, amount, extract_hour_key(created_at))=(ask.digid@gmail.com, 750000.00, 2025-12-29-20) already exists.
```

**Root Cause:**
- Database has a unique constraint preventing duplicate orders from same customer with same amount in same hour
- Upsert was using `client_external_id` as conflict target, but constraint is on different columns
- When user retries payment, it tries to create duplicate order

**Fix Applied:**
- Changed from `upsert` to explicit check-and-update/insert logic
- Now checks if order exists with `client_external_id` before creating
- Updates existing order if found, creates new only if not found

**Changed Code:**
```typescript
// Before
const { data, error } = await sb
  .from('orders')
  .upsert(orderPayload, { onConflict: 'client_external_id' })
  .select()
  .single();

// After
const { data: existingOrder } = await sb
  .from('orders')
  .select('id, customer_name, product_name, amount, status')
  .eq('client_external_id', external_id)
  .maybeSingle();

if (existingOrder) {
  // Update existing order
  const updateResult = await sb
    .from('orders')
    .update(orderPayload)
    .eq('id', existingOrder.id)
    .select()
    .single();
} else {
  // Create new order
  const insertResult = await sb
    .from('orders')
    .insert(orderPayload)
    .select()
    .single();
}
```

---

### 3. ⚠️ User & Order Tables Empty in Admin Panel

**Status:** Requires verification

**Possible Causes:**
1. **Authentication Issue**: Admin user not logged in
2. **RLS Policies**: Row Level Security blocking access
3. **API Endpoint**: Using wrong endpoint or client

**What to Check:**

#### A. Verify Admin is Logged In
```typescript
// In browser console on admin page:
import { supabase } from './services/supabase';
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('Is Admin:', session?.user?.user_metadata?.is_admin);
```

#### B. Test Direct Database Query
```typescript
// In browser console:
const { data, error } = await supabase.from('users').select('*').limit(5);
console.log('Users:', data);
console.log('Error:', error);

const { data: orders, error: ordersError } = await supabase.from('orders').select('*').limit(5);
console.log('Orders:', orders);
console.log('Error:', ordersError);
```

#### C. Check RLS Policies
The policies should allow:
- `service_role` - full access (used by API)
- `authenticated` users with `is_admin = true` - full access

#### D. Verify API Endpoints Work
```bash
# Test users endpoint
curl https://www.jbalwikobra.com/api/admin?action=getUsers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test orders endpoint  
curl https://www.jbalwikobra.com/api/admin?action=getOrders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Files Already Fixed:**
- ✅ `src/services/adminService.ts` - Uses shared authenticated Supabase client
- ✅ Column selection fixed (removed non-existent `avatar_url`, `phone_verified`)
- ✅ Uses `supabase` (authenticated) instead of creating new client

**Next Steps if Still Empty:**
1. Check browser console for errors when loading admin pages
2. Verify admin user has `is_admin: true` in `users` table
3. Check if RLS policies are too restrictive
4. Test with service role key temporarily to isolate issue

---

## Testing Checklist

### Payment Testing
- [ ] Create new order with QRIS payment method
- [ ] Verify payment URL is generated successfully
- [ ] Complete payment and verify webhook updates order status
- [ ] Try other payment methods (BCA, BNI, OVO, etc.)
- [ ] Retry same order (should update, not fail)

### Admin Panel Testing
- [ ] Login as admin user
- [ ] Navigate to Users page - should show user list
- [ ] Navigate to Orders page - should show order list
- [ ] Refresh data - should reload successfully
- [ ] Search/filter users and orders
- [ ] Check notifications page (already working)

### Error Monitoring
- [ ] Check Vercel logs for errors
- [ ] Monitor browser console during checkout
- [ ] Watch for duplicate order attempts
- [ ] Verify webhook processing

---

## Deployment Status

**Files Modified:**
1. ✅ `api/xendit/create-direct-payment.ts` - Payment method mapping + order handling
2. ✅ `src/services/adminService.ts` - Fixed `hasSupabase` → `supabase` typo

**Status:** Ready to deploy
- No breaking changes
- Backward compatible
- Fixes critical payment flow issue
- Prevents duplicate order errors

**Deploy Command:**
```bash
git add .
git commit -m "fix: Payment method mapping, duplicate order handling, admin panel"
git push origin production
```

---

## Monitoring

After deployment, monitor:
1. Payment success rate (should improve significantly)
2. Duplicate order errors (should stop)
3. Admin panel usage (users/orders loading)
4. Xendit webhook callbacks

**Expected Improvements:**
- ✅ QRIS payments work correctly
- ✅ No more duplicate order errors
- ✅ Retry payments update existing orders
- ⏳ Admin panel shows data (if logged in correctly)

---

## Additional Notes

### Payment Method Reference
| User Input | Xendit Type | Channel Code |
|------------|-------------|--------------|
| qris | QR_CODE | - |
| bca | VIRTUAL_ACCOUNT | BCA |
| bni | VIRTUAL_ACCOUNT | BNI |
| bri | VIRTUAL_ACCOUNT | BRI |
| mandiri | VIRTUAL_ACCOUNT | MANDIRI |
| permata | VIRTUAL_ACCOUNT | PERMATA |
| gopay | EWALLET | GOPAY |
| ovo | EWALLET | OVO |
| dana | EWALLET | DANA |
| linkaja | EWALLET | LINKAJA |
| shopeepay | EWALLET | SHOPEEPAY |
| alfamart | OVER_THE_COUNTER | ALFAMART |
| indomaret | OVER_THE_COUNTER | INDOMARET |

### Xendit API Documentation
- Payment Request API: https://developers.xendit.co/api-reference/#payment-request
- Payment Methods: https://developers.xendit.co/api-reference/#payment-methods

---

**Last Updated:** December 30, 2025  
**Status:** ✅ Fixes Applied - Ready for Testing
