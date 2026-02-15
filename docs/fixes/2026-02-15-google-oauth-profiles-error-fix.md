# Google OAuth Error Fix - February 15, 2026

## Problem Summary

Error encountered when users tried to sign up via Google OAuth:
```
"relation \"public.profiles\" does not exist (SQLSTATE 42P01)"
"Database error saving new user"
```

## Root Cause

The system had a legacy database trigger from an old migration that was never properly cleaned up:

1. **Migration 013** created the `public.profiles` table with a trigger `on_auth_user_created` that automatically inserted new users into `profiles` when they signed up
2. **Migration 041** migrated from `profiles` to `users` table and created a NEW trigger `sync_auth_user_to_users_trigger`
3. **Problem**: The OLD trigger was never dropped, so it continued trying to insert into the non-existent `profiles` table

## Technical Details

### Authentication Flow
1. User clicks "Sign in with Google" on frontend
2. Supabase Auth creates entry in `auth.users` table
3. This triggers `on_auth_user_created` → tries to INSERT INTO `public.profiles` (doesn't exist) → **ERROR**
4. This also triggers `sync_auth_user_to_users_trigger` → should INSERT INTO `public.users` (correct)

### The Issue
- Two triggers were running simultaneously
- One pointing to the wrong table (profiles)
- Causing transaction failure before the correct trigger could complete

## Solution Applied

Created and applied 3 migrations:

### Migration 074: Remove Old Profiles Trigger
- Dropped the legacy `on_auth_user_created` trigger
- Dropped the legacy `handle_new_user()` function
- Verified no old triggers remain

### Migration 075: Ensure Sync Trigger Exists
- Recreated `sync_auth_user_to_users()` function
- Recreated `sync_auth_user_to_users_trigger` trigger
- Added verification checks

### Migration 076: Update Sync Trigger with Google Fields
- Updated sync function to include all Google OAuth fields:
  - `google_id` - Supabase Auth user ID for Google users
  - `avatar_url` - Google profile picture
  - `auth_provider` - Set to 'google' for OAuth users
  - `profile_completed` - Set to TRUE for Google users (they already have name/email)

## Verification

✅ All migrations successfully applied
✅ Local and remote databases are in sync (76 migrations)
✅ Old trigger removed
✅ New trigger properly configured
✅ Google OAuth fields now properly synced

## Files Modified

1. `supabase/migrations/00000000000074_fix_profiles_foreign_keys.sql`
2. `supabase/migrations/00000000000075_ensure_sync_trigger_exists.sql`
3. `supabase/migrations/00000000000076_update_sync_trigger_google_fields.sql`

## Testing Recommendations

1. **Test Google OAuth Signup**: Try signing up with a new Google account
2. **Test Google OAuth Login**: Try logging in with existing Google account
3. **Verify Database**: Check that new user records in `public.users` have:
   - ✅ `auth_user_id` populated
   - ✅ `google_id` populated
   - ✅ `avatar_url` from Google
   - ✅ `auth_provider` = 'google'

## Monitoring

Watch logs for any similar errors:
```bash
# Check Vercel logs for Google OAuth errors
vercel logs --follow

# Check Supabase logs in Dashboard → Database → Logs
```

## Prevention

To prevent similar issues in the future:
1. Always verify triggers when migrating tables
2. Drop old triggers explicitly in migration files
3. Use `DROP TRIGGER IF EXISTS` before creating new ones
4. Add verification steps in migrations to catch orphaned triggers

## Related Files

- Auth API: `api/auth.ts` (handleGoogleCallback function)
- Migration History: See migration 013, 041, 074, 075, 076
- Copilot Instructions: `.github/copilot-instructions.md`
