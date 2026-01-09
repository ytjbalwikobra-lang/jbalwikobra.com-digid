# Price Editing Debug Instructions

## Check Browser Console

1. Open `/admin/products` in your browser
2. Open Developer Tools (F12)
3. Go to the **Console** tab
4. Try to edit a price
5. Look for these log messages:

### Expected Log Sequence

When you click on a price and save:

```
[adminService.updateProductFields] Updating product: <id> with fields: { price: <new_price>, stock: <new_stock> }
[Admin API] Updating product: <id> with fields: { price: <new_price>, stock: <new_stock>, updated_at: <timestamp> }
[Admin API] ✅ Product updated successfully
[adminService.updateProductFields] ✅ Updated via API: <product_data>
```

### Possible Error Scenarios

#### 1. Authentication Error
```
[API /api/admin] No session_token provided
```
**Solution**: Check if you're logged in properly

#### 2. Database Error
```
[Admin API] Product update error: <error>
```
**Check**: RLS policies, database connection

#### 3. API Not Reached
```
[adminService.updateProductFields] API call failed: <error>
[adminService.updateProductFields] Using direct Supabase fallback
```
**Check**: Network tab, API endpoint availability

#### 4. Empty Response
```
[adminService.updateProductFields] ❌ UPDATE BLOCKED - Empty response
```
**Check**: Product ID exists, RLS policies

#### 5. Value Mismatch
```
[adminService.updateProductFields] ❌ Price mismatch! Expected: X Got: Y
```
**Check**: Database triggers, constraints

## Quick Test Commands

### Test 1: Check if product exists
```sql
SELECT id, name, price, stock FROM products WHERE id = '<your_product_id>';
```

### Test 2: Test manual update via Supabase
```sql
UPDATE products SET price = 99999 WHERE id = '<your_product_id>';
SELECT price FROM products WHERE id = '<your_product_id>';
```

### Test 3: Check RLS policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'products';
```

### Test 4: Verify is_admin() function
```sql
SELECT is_admin();
```

## Testing the API Directly

Open browser console and run:

```javascript
// Get your session token
const token = localStorage.getItem('session_token');
console.log('Token:', token);

// Test API call
fetch('/api/admin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    action: 'updateProduct',
    id: 'YOUR_PRODUCT_ID_HERE',
    fields: {
      price: 99999,
      stock: 100,
      updated_at: new Date().toISOString()
    }
  })
})
.then(r => r.json())
.then(data => console.log('API Response:', data))
.catch(err => console.error('API Error:', err));
```

## Common Issues

### Issue 1: Changes appear then disappear
**Cause**: Cache reload overwriting changes
**Status**: Should be FIXED (cache now updates instead of clearing)

### Issue 2: Success notification but no DB change
**Cause**: RLS blocking update OR triggers reverting change
**Check**: 
- Database logs
- RLS policies on products table
- Any triggers on products table

### Issue 3: API returns 401/403
**Cause**: Not authenticated as admin
**Check**:
- `localStorage.getItem('session_token')` exists
- User is in `users` table with `is_admin = true`
- `is_admin()` function works correctly

### Issue 4: Network error
**Cause**: API endpoint not accessible
**Check**:
- Network tab in DevTools
- Vercel deployment status
- `/api/admin.ts` file exists

## What to Report

Please provide:

1. **Console logs** - Copy the entire console output when you try to edit
2. **Network tab** - Screenshot of the POST to `/api/admin` (request + response)
3. **Which product ID** you're trying to edit
4. **Current price** and **new price** you're trying to set
5. **Any error messages** you see

## Next Steps Based on Logs

If you see:
- ✅ "Updated via API" → Database issue, check Supabase directly
- ❌ "API call failed" → API endpoint issue
- ❌ "UPDATE BLOCKED" → RLS policy issue
- ❌ "mismatch" → Database trigger or constraint issue
- Nothing → Click handler not firing, check UI code
