# Supabase Migration Workflow

This guide explains how to create and push database migrations using Supabase CLI.

## Prerequisites

✅ Supabase CLI installed (via npx)  
✅ Project linked to remote: `xeithuvgldzxnggxadri`  
✅ Migrations directory: `supabase/migrations/`

## Quick Start

### 1. Create a New Migration

```powershell
# Using helper script (recommended)
.\scripts\new-migration.ps1 -Name "your_migration_name"

# Or manually using Supabase CLI
npx supabase migration new your_migration_name
```

This creates a timestamped file in `supabase/migrations/`:
- Format: `YYYYMMDD_HHMMSS_your_migration_name.sql`
- Example: `20260119_143022_add_new_column.sql`

### 2. Write Your Migration SQL

Edit the created file and add your SQL:

```sql
-- Example: Add a new column
ALTER TABLE products ADD COLUMN featured BOOLEAN DEFAULT false;

-- Example: Create an index
CREATE INDEX idx_products_featured ON products(featured) WHERE featured = true;

-- Example: Update existing data
UPDATE products SET featured = true WHERE id IN ('uuid1', 'uuid2');
```

### 3. Push Migration to Remote Database

```powershell
# Using helper script (recommended)
.\scripts\push-migrations.ps1

# Or directly with Supabase CLI
npx supabase db push
```

The helper script will:
1. ✅ Check if project is linked
2. 📋 Show pending migrations
3. 🚀 Push to remote database
4. ✅ Verify success

## Commands Reference

### Check Migration Status
```powershell
npx supabase migration list
```

### Push Migrations
```powershell
npx supabase db push
```

### Pull Remote Migrations
```powershell
npx supabase db pull
```

### Create New Migration
```powershell
npx supabase migration new migration_name
```

### Reset Local Database (Dev Only)
```powershell
npx supabase db reset
```

## Migration Best Practices

### ✅ DO:
- Use descriptive migration names: `add_rental_notification_types` not `update_db`
- Test migrations locally first with `supabase db reset`
- Use transactions for multi-statement migrations
- Add comments explaining complex changes
- Use `IF EXISTS` / `IF NOT EXISTS` for idempotency
- Keep migrations small and focused

### ❌ DON'T:
- Don't modify existing migration files after they're pushed
- Don't delete migration files
- Don't use DROP commands without backups
- Don't push untested migrations to production

## Migration Template

```sql
-- Migration: [Clear description]
-- Created: [Date]
-- Purpose: [Why this change is needed]

-- Step 1: [Description]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'my_table') THEN
    CREATE TABLE my_table (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Step 2: [Description]
ALTER TABLE my_table 
  ADD COLUMN IF NOT EXISTS new_column TEXT;

-- Step 3: Verify
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'my_table';
```

## Troubleshooting

### Migration Push Fails

**Error: "Not linked to remote"**
```powershell
npx supabase link --project-ref xeithuvgldzxnggxadri
```

**Error: "SQL syntax error"**
- Check your SQL syntax in Supabase SQL Editor first
- Test locally with `supabase db reset`

**Error: "Constraint violation"**
- Check if migration is idempotent
- Verify data doesn't violate new constraints

### Check Remote Database State

1. Go to: https://supabase.com/dashboard/project/xeithuvgldzxnggxadri/editor
2. Run queries to verify migration:
```sql
-- Check table structure
\d table_name

-- Check constraints
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'table_name'::regclass;
```

## Example Workflow

### Scenario: Add Email Notifications

```powershell
# 1. Create migration
.\scripts\new-migration.ps1 -Name "add_email_notifications_table"

# 2. Edit supabase/migrations/20260119_143022_add_email_notifications_table.sql
# Add your SQL:
CREATE TABLE email_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_notifications_user_id ON email_notifications(user_id);
CREATE INDEX idx_email_notifications_sent_at ON email_notifications(sent_at);

# 3. Push to remote
.\scripts\push-migrations.ps1

# 4. Verify
npx supabase migration list
```

## Directory Structure

```
supabase/
├── config.toml                 # Supabase configuration
├── migrations/                 # Migration files
│   ├── 001_initial_schema.sql
│   ├── 002_enable_rls.sql
│   └── 20260119_add_rental_notification_types.sql
└── ...

scripts/
├── new-migration.ps1          # Helper: Create new migration
└── push-migrations.ps1        # Helper: Push migrations to remote

migrations/                    # Old location (for reference)
└── MANUAL_RUN_*.sql          # Manual migration backups
```

## Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Migration Guide](https://supabase.com/docs/guides/cli/managing-environments)
- [SQL Reference](https://www.postgresql.org/docs/current/sql.html)

---

**Need help?** Check the Supabase Dashboard SQL Editor:
https://supabase.com/dashboard/project/xeithuvgldzxnggxadri/sql/new
