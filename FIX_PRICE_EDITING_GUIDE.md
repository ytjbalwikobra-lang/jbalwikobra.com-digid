# Fix for Price Editing Issue - Admin Panel

## Problem Summary

**Issue**: Cannot edit prices on the admin page
**Root Cause**: The `is_admin()` function was checking the `profiles` table, but the system uses a `users` table with an `is_admin` boolean column.

## How It Works

### RLS Flow for Product Updates
1. Frontend calls `adminService.updateProductFields()` using **anon key**
2. Supabase checks RLS policy: `"Products admin modify"` 
3. Policy requires: `public.is_admin(auth.uid()) = true`
4. **OLD BEHAVIOR**: Function checked `profiles` table → returned `false` → **UPDATE DENIED** ❌
5. **NEW BEHAVIOR**: Function checks `users` table → returns `true` for admins → **UPDATE ALLOWED** ✅

## Solution Applied

Created migration: `20260107_fix_is_admin_function_for_users_table.sql`

### What It Does:
- Updates `public.is_admin()` function to check `users` table first (primary)
- Falls back to `profiles` table for backward compatibility
- Checks both `auth_user_id` and `id` columns in users table
- Grants execute permission to authenticated and anon users

## Deployment Steps

### 1. Run the Migration in Supabase

Go to Supabase Dashboard → SQL Editor → New Query

```sql
-- Copy and paste the entire content of:
-- /supabase/migrations/20260107_fix_is_admin_function_for_users_table.sql
```

### 2. Verify the Function

```sql
-- Check if function exists and works
SELECT public.is_admin(auth.uid());
-- Should return: true (if you're logged in as admin)

-- Check specific users
SELECT 
    u.email,
    u.is_admin,
    u.auth_user_id,
    public.is_admin(u.auth_user_id) as function_result,
    public.is_admin(u.id) as function_result_by_id
FROM public.users u
WHERE u.is_admin = true
LIMIT 10;
```

### 3. Verify Admin User Exists

```sql
-- Check if you have an admin user
SELECT id, email, name, is_admin, auth_user_id 
FROM public.users 
WHERE is_admin = true;

-- If no admin user exists, create one:
-- UPDATE public.users 
-- SET is_admin = true 
-- WHERE email = 'your-admin-email@example.com';
```

### 4. Test Product Update

After running the migration, test in the admin panel:

1. Log in as admin user
2. Go to Products page
3. Try to edit a price inline (click on the price)
4. Press Enter to save
5. Should work! ✅

### 5. Check Browser Console

If still not working, open browser console (F12) and check for errors:

```javascript
// Should see logs like:
// [adminService.updateProductFields] updating product...
// ✓ Product updated successfully
```

## Troubleshooting

### Issue 1: Migration Fails

**Error**: `table "users" does not exist`

**Solution**: Run this migration first:
```sql
-- Create users table if not exists
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user',
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

### Issue 2: Function Returns False for Admin

**Check**:
```sql
-- Verify user has is_admin = true
SELECT * FROM public.users WHERE email = 'your-email@example.com';
```

**Fix**:
```sql
UPDATE public.users SET is_admin = true WHERE email = 'your-email@example.com';
```

### Issue 3: Still Can't Edit

**Check RLS Policies**:
```sql
-- View all policies on products table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'products';
```

**Expected Policy**:
- Policy name: `Products admin modify`
- Command: `ALL`
- Using: `public.is_admin(auth.uid())`
- With check: `public.is_admin(auth.uid())`

### Issue 4: Auth User ID Mismatch

The function checks both `auth_user_id` and `id` columns. If your users table doesn't have `auth_user_id`, run:

```sql
-- Add auth_user_id column if missing
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Sync auth_user_id from auth.users
UPDATE public.users u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.email = au.email AND u.auth_user_id IS NULL;
```

## Alternative: Use Service Role Key (Not Recommended for Frontend)

If you want the admin API to bypass RLS entirely:

1. Update `/api/admin.ts` to use service role key (already configured)
2. Add an API endpoint for product updates:

```typescript
// In api/admin.ts
if (req.method === 'POST' && action === 'update-product-fields') {
  const { productId, fields } = req.body || {};
  if (!productId || !fields) {
    return respond(res, 400, { error: 'missing_params' });
  }
  
  const { data, error } = await supabase
    .from('products')
    .update(fields)
    .eq('id', productId)
    .select()
    .single();
    
  if (error) {
    return respond(res, 400, { error: 'update_failed', details: error.message });
  }
  
  return respond(res, 200, { success: true, data });
}
```

However, this approach is less secure and adds unnecessary API overhead. The proper fix is to update the `is_admin()` function.

## Verification Checklist

- [ ] Migration executed successfully in Supabase
- [ ] `is_admin()` function returns `true` for admin users
- [ ] Admin user has `is_admin = true` in users table
- [ ] Admin user has `auth_user_id` populated correctly
- [ ] Can edit prices in admin panel
- [ ] Can edit stock in admin panel
- [ ] Can toggle product active status
- [ ] Console shows no RLS policy errors

## Related Files

- **Migration**: `/supabase/migrations/20260107_fix_is_admin_function_for_users_table.sql`
- **Service**: `/src/services/adminService.ts` (line 368-390)
- **Component**: `/src/pages/admin/components/products/ProductsTable.tsx` (line 23-30)
- **RLS Policy**: Migration `20250829_add_rls_products_flash_sales.sql` (line 23-26)

## Questions?

If you need help, check:
1. Supabase logs (Dashboard → Logs → Postgres Logs)
2. Browser console for frontend errors
3. Network tab to see failed requests
