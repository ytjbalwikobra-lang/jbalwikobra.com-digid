# GitHub Copilot Instructions

These instructions guide AI assistants (including GitHub Copilot) when working on this codebase.

## 🛠️ Technology Stack

- **Frontend**: React 18+ with TypeScript
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Styling**: Tailwind CSS + Cyber Compact Design System V3
- **Payments**: Xendit Payment Gateway
- **Realtime**: Supabase Realtime subscriptions
- **Messaging**: WhatsApp Business API (dynamic provider)

---

## 📋 Development Guidelines

### 1. React, Next.js & Supabase Best Practices

**React:**
- Use functional components with hooks (no class components)
- Implement proper error boundaries for critical sections
- Use `useMemo`, `useCallback`, and `React.memo` for performance optimization
- Follow the single responsibility principle for components
- Use lazy loading (`React.lazy`, `Suspense`) for code splitting
- Implement proper cleanup in `useEffect` hooks

**TypeScript:**
- Always define proper interfaces/types for all data structures
- Avoid `any` type — use `unknown` with type guards if necessary
- Use discriminated unions for complex state
- Export types from dedicated `types/` files

**Supabase:**
- Always use the typed Supabase client
- Implement proper RLS policies for all tables
- Use RPC functions for complex queries to minimize round trips
- Handle errors gracefully — never assume queries succeed
- Use service role key only in backend API (never expose to client)
- Prefer `.select()` with specific columns over `*` to reduce egress

```typescript
// ✅ Good
const { data, error } = await supabase
  .from('orders')
  .select('id, status, amount, customer_name')
  .eq('user_id', userId);

if (error) {
  console.error('[OrderService] Query failed:', error);
  return [];
}

// ❌ Bad
const { data } = await supabase.from('orders').select('*');
```

### 2. Supabase Migration Workflow

**Development Database (Local):**
```bash
# Start Supabase locally via Docker
docker-compose -f docker-dev.yml up supabase

# Run migrations locally
docker exec -it supabase-cli supabase db push --local

# Generate types from local
docker exec -it supabase-cli supabase gen types typescript --local > src/types/supabase.ts
```

**Production Database (Remote):**

For production databases with existing migration history managed via Dashboard:

```bash
# 1. Link to your Supabase project (one-time)
npx supabase link --project-ref YOUR_PROJECT_REF

# 2. Execute migration manually via Supabase Dashboard SQL Editor
#    - Open migration file in code editor
#    - Copy SQL content
#    - Paste into Dashboard → SQL Editor
#    - Click "Run"
#    - Verify tables created in Table Editor

# 3. Generate types from remote database
npx supabase gen types typescript --linked > src/types/database.ts

# 4. Verify TypeScript compiles
npx tsc --noEmit
```

**CRITICAL Migration Rules:**
1. **For New Projects**: Use `npx supabase db push` to apply migrations
2. **For Production with Manual History**: Execute SQL via Dashboard → SQL Editor
3. **Always generate types AFTER migration** using `supabase gen types`
4. **Verify changes** in Supabase Dashboard → Table Editor
5. **Then commit** migration file + updated types together

**Why Manual Execution for Production?**
- Production databases often have migration history managed via Dashboard
- `db push` fails when remote history doesn't match local migrations/
- Manual execution ensures no conflicts with existing migrations
- Safer for databases with existing data

**Idempotent Migrations:**
Always write migrations that can be run multiple times without errors:

```sql
-- ✅ Good: Idempotent CREATE TABLE
CREATE TABLE IF NOT EXISTS my_table (...);

-- ✅ Good: Idempotent ALTER PUBLICATION
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'my_table'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE my_table;
    END IF;
END $$;

-- ✅ Good: Idempotent ALTER TABLE ADD COLUMN
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'my_table' AND column_name = 'new_column'
    ) THEN
        ALTER TABLE my_table ADD COLUMN new_column TEXT;
    END IF;
END $$;

-- ❌ Bad: Will fail on second run
ALTER PUBLICATION supabase_realtime ADD TABLE my_table;
ALTER TABLE my_table ADD COLUMN new_column TEXT;
```

Reference: [SUPABASE_CLI_REFERENCE.md](../SUPABASE_CLI_REFERENCE.md)

### 3. Consistent Design System

**CRITICAL**: The admin panel uses the **Cyber Compact Design System V3** defined in `src/styles/cyber-compact.css`.

**Rules:**
- ❌ Never use hardcoded Tailwind colors in admin components (e.g., `text-pink-500`, `bg-emerald-400`)
- ✅ Always use CSS custom properties with `--admin-*` namespace

**Available tokens:**

| Category | Variables |
|---|---|
| Colors | `--admin-accent`, `--admin-success`, `--admin-error`, `--admin-warning`, `--admin-info`, `--admin-orange`, `--admin-purple` |
| Backgrounds | `--admin-bg-pure`, `--admin-bg-surface`, `--admin-bg-card`, `--admin-bg-elevated` |
| Text | `--admin-text`, `--admin-text-secondary`, `--admin-text-tertiary`, `--admin-text-muted` |
| Borders | `--admin-border`, `--admin-border-light`, `--admin-border-lighter` |

```tsx
// ✅ Good
<div className="bg-[var(--admin-bg-card)] text-[var(--admin-text)] border-[var(--admin-border)]">

// ❌ Bad
<div className="bg-white/5 text-white/70 border-white/10">
```

**Public pages** use `--cyber-*` namespace tokens.

### 4. Database Verification Before Modifications

Before creating or modifying any database-related code:

1. **Check table schema:**
   ```sql
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'your_table';
   ```

2. **Check existing constraints:**
   ```sql
   SELECT constraint_name, constraint_type 
   FROM information_schema.table_constraints 
   WHERE table_name = 'your_table';
   ```

3. **Check RLS policies:**
   ```sql
   SELECT policyname, cmd, qual 
   FROM pg_policies 
   WHERE tablename = 'your_table';
   ```

4. **Verify TypeScript types match DB schema** — ensure interfaces in `src/types/` align with actual table columns.

5. **Check for CHECK constraints** on enum-like columns before inserting new values.

### 5. Clean Up After Modifications

After every modification or creation, perform these checks:

**Unused Code:**
```bash
# Find unused exports
npx ts-prune

# Find unused dependencies
npx depcheck
```

**Duplicate Code:**
- Search for similar function names across files
- Check if new logic duplicates existing services
- Look for re-implemented utilities that already exist in `src/utils/`

**Redundant Files:**
- Check if new components overlap with existing ones
- Verify services don't duplicate API calls
- Remove deprecated files (mark with `@deprecated` JSDoc first)

**Overlapping Logic:**
- Review hooks that might be doing the same thing
- Check context providers for duplicate state management
- Consolidate similar API endpoints

### 6. Verify Function After Modifications

After any creation or modification, always:

1. **TypeScript Check:**
   ```bash
   npx tsc --noEmit
   ```

2. **Build Verification:**
   ```bash
   npm run build
   ```

3. **Lint Check:**
   ```bash
   npm run lint
   ```

4. **Test Related Components:**
   - Manually test the modified feature
   - Check console for errors
   - Verify related features still work

5. **Check Imports:**
   - Ensure no circular dependencies
   - Verify all imports resolve correctly
   - Check for broken re-exports

---

## 📂 File Organization

```
src/
├── components/           # Shared UI components
├── pages/
│   ├── admin/           # Admin panel pages
│   │   ├── components/  # Admin-specific components
│   │   └── utils/       # Admin utilities
│   └── public/          # Public-facing pages
├── services/            # Data services (one per domain)
├── hooks/               # Custom React hooks
├── contexts/            # React contexts
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── styles/              # CSS files

api/
├── _config/             # API configuration
├── _middleware/         # Auth, CORS middleware
├── _utils/              # Shared API utilities
├── xendit/              # Payment webhooks
└── cron/                # Scheduled jobs
```

---

## 🔔 Notification System

Two separate systems exist:

| System | Table | Service (Backend) | Service (Frontend) |
|---|---|---|---|
| Admin | `admin_notifications` | `api/_utils/adminNotificationService.ts` | `src/services/adminNotificationService.ts` |
| Customer | `customer_notifications` | (same backend) | `src/services/customerNotificationService.ts` |

**Note:** Backward-compatibility views `notifications` and `notification_reads` exist as aliases.

---

## 🚀 Commit Guidelines

Use semantic versioning for releases:

```
VX.Y.Z - "Descriptive Title"

- feat: New feature description
- fix: Bug fix description
- refactor: Code improvement description
```

Example:
```
V1.2.0 - "Live Chat Feature"

- feat: Add real-time customer-admin chat
- feat: Multi-admin support with assignment
- feat: Chat history and logs
```

---

## ⚠️ Common Pitfalls

1. **RLS Bypass**: Always test queries with both authenticated and service role clients
2. **Type Mismatch**: Supabase returns `null` for missing relations — handle this
3. **Realtime Subscriptions**: Clean up subscriptions in `useEffect` cleanup
4. **Cache Invalidation**: Invalidate relevant caches after mutations
5. **Environment Variables**: Never hardcode secrets — use `process.env`

---

## 📋 Next Steps Recommendations

When providing recommendations or next steps to the user:
- **Minimum 5 actionable points** must be provided
- Each point should be specific and testable
- Include commands or file paths where applicable
- Prioritize by importance (critical → nice-to-have)
- Group related tasks together

**Example:**
```
## Next Steps
1. **Database Migration**: Run `supabase db push` to apply schema changes
2. **Type Generation**: Update TypeScript types with `supabase gen types`
3. **Component Integration**: Add `<NewComponent />` to `App.tsx` line 45
4. **Testing**: Manually test feature at `/admin/new-feature` route
5. **Documentation**: Update `README.md` with new feature usage
```
