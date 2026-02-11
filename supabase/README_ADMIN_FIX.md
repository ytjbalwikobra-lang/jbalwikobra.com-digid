# Admin Panel Empty Tables Fix - Migration Instructions

## Problem
Admin panel shows empty order and user tables with zero revenue statistics.

## Solution
Run the migrations in this folder to add service_role policies to admin tables.

## Quick Start (Recommended)

**Run this one migration file:**
```
20251228_complete_admin_panel_fix.sql
```

This consolidated migration applies all fixes at once and includes verification.

### How to Apply
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Navigate to SQL Editor
3. Copy the entire content of `20251228_complete_admin_panel_fix.sql`
4. Paste and click "Run"
5. Verify output shows policies created successfully

## Alternative: Run Individual Migrations

If you prefer to run migrations separately:

```
1. 20251228_fix_users_rls_service_role.sql
2. 20251228_add_service_role_policies_orders.sql
3. 20251228_add_service_role_policies_admin_tables.sql
```

Run them in this order in Supabase SQL Editor.

## Verification

After running the migrations, verify they were applied:

```sql
-- Run this in Supabase SQL Editor:
-- Copy content from: VERIFY_SERVICE_ROLE_POLICIES.sql
```

Expected output: Each admin table should have a service_role policy.

## What These Migrations Do

Adds service_role policies to 8 admin-related tables:
- ✅ `users` - Fixes circular dependency
- ✅ `orders` - Enables order list and revenue stats
- ✅ `products` - Enables product management
- ✅ `notifications` - Enables notification display
- ✅ `payments` - Enables payment information
- ✅ `reviews` - Enables review statistics
- ✅ `flash_sales` - Enables flash sale statistics
- ✅ `website_settings` - Enables settings management

## Environment Configuration

After running migrations, ensure your environment has:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get this key from: Supabase Dashboard → Settings → API → `service_role` key

## Documentation

For detailed information, see:
- `../../ADMIN_PANEL_FIX_GUIDE.md` - Complete fix guide
- `../../TESTING_ADMIN_PANEL_FIX.md` - Testing instructions
- `../../PR_SUMMARY.md` - Quick reference

## Need Help?

If migrations fail or admin panel still shows empty tables:
1. Check that migrations were applied successfully
2. Verify service_role key is configured
3. Clear browser cache and reload admin panel
4. See troubleshooting section in `ADMIN_PANEL_FIX_GUIDE.md`

## Migration Files Summary

| File | Purpose | Size | Run This? |
|------|---------|------|-----------|
| `20251228_complete_admin_panel_fix.sql` | All-in-one fix | 7KB | ⭐ **YES** |
| `20251228_fix_users_rls_service_role.sql` | Users table only | 1KB | Optional |
| `20251228_add_service_role_policies_orders.sql` | Orders table only | 1KB | Optional |
| `20251228_add_service_role_policies_admin_tables.sql` | Other 6 tables | 3KB | Optional |
| `VERIFY_SERVICE_ROLE_POLICIES.sql` | Verification script | 3KB | After fix |

**Recommendation:** Use the consolidated migration for simplicity.
