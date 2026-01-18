# Database Schema Diagnostic Scripts

These scripts help you understand your actual database schema and create custom migrations.

## Scripts

### 1. simple-schema-check.js
**Quick check of your current database schema**

```bash
node scripts/simple-schema-check.js
```

**What it does:**
- Connects to your Supabase database
- Queries the `website_settings` table
- Shows which columns you have vs. what the code expects
- Lists missing columns

**Requirements:**
- `.env.local` file with `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`

**Output Example:**
```
✅ Connected successfully!

📊 Your current columns (15):
   ✓ address
   ✓ contact_email
   ✓ facebook_url
   ...

🔎 Analysis:
   Existing: 15/31
   Missing: 16

❌ Missing columns:
   ⚠️  support_email
   ⚠️  business_hours
   ...
```

---

### 2. check-website-settings-schema.js
**Advanced diagnostic with custom migration generation**

```bash
node scripts/check-website-settings-schema.js
```

**What it does:**
- Everything from simple-schema-check.js, PLUS:
- Generates a custom SQL migration file
- Only includes columns YOUR database is missing
- Creates file: `supabase/migrations/YYYYMMDD_add_missing_columns_custom.sql`

**Requirements:**
- Same as simple-schema-check.js
- Optionally: `SUPABASE_SERVICE_ROLE_KEY` for better schema access

**Output Example:**
```
🔍 Checking database schema...

✅ Successfully retrieved schema information

📋 Current columns in your database:
   ✓ id (uuid)
   ✓ site_name (text)
   ...

🔎 Analyzing against expected schema...

✅ Existing columns: 15/31
❌ Missing columns: 16

Missing columns:
   ⚠️  support_email (text)
   ⚠️  business_hours (text)
   ...

📝 Generating custom migration...

✅ Custom migration created: supabase/migrations/20251227_add_missing_columns_custom.sql

📋 Next steps:
1. Review the generated migration file
2. Apply it using: supabase db push
```

---

## Setup

### 1. Create .env.local file

```bash
cp .env.example .env.local
```

### 2. Add your credentials

Edit `.env.local`:
```bash
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Run the script

```bash
node scripts/simple-schema-check.js
```

---

## Troubleshooting

### "Missing credentials" error
- Make sure `.env.local` exists
- Check that `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` are set

### "Cannot determine schema" error
- Your table might be empty
- Try the advanced script: `node scripts/check-website-settings-schema.js`
- Or check Supabase dashboard directly

### RLS Policy errors
- The anon key might not have SELECT permission
- Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` for full access
- Or check your RLS policies in Supabase dashboard

---

## Why Use These Scripts?

Instead of blindly applying a migration that might:
- Add columns that already exist
- Be out of sync with your database
- Not match your specific needs

These scripts:
- ✅ Check YOUR actual database
- ✅ Generate migrations for YOUR specific situation
- ✅ Avoid redundant changes
- ✅ Show exactly what's different

---

## After Running

Once you know what's missing, you can:

1. **Use the custom generated migration** (recommended)
   - Review the file
   - Apply with `supabase db push` or SQL editor

2. **Use the pre-made migration**
   - `supabase/migrations/20251227_add_missing_website_settings_columns.sql`
   - Adds all potentially missing columns
   - Safe to use (has `if not exists` checks)

3. **Manually create columns**
   - Use Supabase dashboard Table Editor
   - Add only what you need

---

## Need Help?

See `DATABASE_MIGRATION_REQUIRED.md` for full migration instructions.
