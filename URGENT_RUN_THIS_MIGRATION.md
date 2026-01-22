# URGENT: Run This SQL Migration

**File:** `migrations/2026-01-22_sync_has_rental_field.sql`

## Problem
The rental filter is not working because products with rental_options don't have `has_rental = true` in the database.

## Solution
Execute the migration SQL in Supabase Dashboard SQL Editor:

1. Go to: https://supabase.com/dashboard/project/xeithuvgldzxnggxadri/sql/new
2. Copy and paste the entire content of `migrations/2026-01-22_sync_has_rental_field.sql`
3. Click "Run" button

## What This Does
- Updates all products with rental_options to set `has_rental = true`
- Creates a trigger to automatically maintain the `has_rental` field whenever rental_options are added/removed
- This ensures the rental filter on the /products page works correctly

## Verification
After running, you should see output showing:
- Number of products with rental
- Number of products without rental  
- Total products

The rental filter should now show products correctly.
