# Admin Panel Root Cause Analysis

## Problem
Admin dashboard shows 0 for total revenue, total orders, and total users.

## Root Cause Discovery

### Initial Diagnosis (INCORRECT)
I initially thought the `users` table didn't exist because:
- The schema JSON provided didn't show it in the initial dump
- Migration files only showed `profiles` table being created

### Second Diagnosis (INCORRECT)
I then thought it was a missing service role key configuration.

### Actual Situation (CONFIRMED)
**Database queries revealed:**
```sql
-- Query 1: Check if users table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('users', 'profiles');
-- Result: users table EXISTS ✅

-- Query 2: Check users table has data
SELECT COUNT(*) FROM public.users;
-- Result: 355 users ✅

-- Query 3: Check revenue data exists
SELECT SUM(amount) FROM orders WHERE status IN ('paid', 'completed');
-- Result: 161,900,339.00 IDR ✅
```

## Real Root Cause: RLS Circular Dependency

The admin dashboard shows 0 because of **RLS (Row Level Security) circular dependency on the users table**.

### The Issue

The `users` table has **NO RLS policy for service_role**, causing a circular dependency:

#### Users Table RLS Policies:
```sql
-- Policy 1: users_select_own (authenticated users read own data)
FOR SELECT TO authenticated USING (auth.uid() = id)

-- Policy 2: users_update_own (authenticated users update own data)
FOR UPDATE TO authenticated USING (auth.uid() = id)

-- Policy 3: users_admin_all (admins get all access)
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true))
```

**The Problem:** NO policy exists for `service_role`!

#### Other Tables Check users.is_admin:
```sql
-- Example: admin_notifications, banners, categories policies
USING (EXISTS (SELECT 1 FROM users 
       WHERE users.id = auth.uid() AND users.is_admin = true))
```

**Circular Dependency:**
1. Admin API uses service role key to query tables
2. Table policies check `users.is_admin` 
3. But `users` table has NO service_role policy
4. Service role cannot read `users` table
5. EXISTS query fails → returns 0 rows

## The Fix

### Add Service Role Policy to Users Table

Run this migration to fix the circular dependency:

```sql
-- supabase/migrations/20251228_fix_users_rls_service_role.sql

CREATE POLICY "users_service_role_all" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**What this does:**
- Allows service role to bypass RLS on `users` table
- Breaks the circular dependency
- Other table policies can now successfully check `users.is_admin`
- Admin dashboard queries will return correct data

### Why This Works

1. Service role key is already configured (confirmed by user)
2. Service role tries to query tables for admin stats
3. Table RLS policies check `users.is_admin` via EXISTS query
4. **NEW:** Service role can now read users table
5. EXISTS query succeeds, returns true for admins
6. Dashboard shows correct stats!

## Verification Steps

After setting the service role key:

1. **Check environment variables are set:**
```bash
# Backend
echo $SUPABASE_SERVICE_ROLE_KEY

# Frontend  
echo $REACT_APP_SUPABASE_SERVICE_KEY
```

2. **Test database access:**
```typescript
// Should return data, not 0
const { count } = await supabase.from('users').select('id', { count: 'exact', head: true });
console.log('User count:', count); // Should be > 0
```

3. **Reload admin dashboard** - should now show correct stats

## Why Products Work

Products likely have public RLS policies allowing anon key to read:
```sql
-- Products probably have this policy:
CREATE POLICY "products_public_select" ON public.products
  FOR SELECT TO anon, authenticated
  USING (is_active = true);
```

Users table doesn't have such a policy, hence showing 0.

## Summary

- ✅ `users` table exists
- ❌ `profiles` table does NOT exist  
- ❌ Service role key not configured
- ❌ Anon key blocked by RLS on users table
- ✅ Fix: Set `SUPABASE_SERVICE_ROLE_KEY` environment variable
