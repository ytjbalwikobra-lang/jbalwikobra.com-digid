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

**Public pages** use `--cyber-*` namespace tokens:

| Category | Variables |
|---|---|
| Colors | `--cyber-accent`, `--cyber-success`, `--cyber-error`, `--cyber-warning`, `--cyber-info` |
| Backgrounds | `--cyber-bg-pure`, `--cyber-bg-surface`, `--cyber-bg-card`, `--cyber-bg-elevated` |
| Text | `--cyber-text-primary`, `--cyber-text-secondary`, `--cyber-text-muted`, `--cyber-text-disabled` |
| Borders | `--cyber-border`, `--cyber-border-hover`, `--cyber-border-active` |
| Z-Index | `--cyber-z-base(0)`, `--cyber-z-elevated(10)`, `--cyber-z-sticky(100)`, `--cyber-z-dropdown(200)`, `--cyber-z-overlay(300)`, `--cyber-z-modal(400)`, `--cyber-z-toast(500)` |

**PENTING — Validasi Token CSS:**
- `--cyber-accent` = `#ec4899` (alias dari `--cyber-pink-primary`)
- Sebelum menggunakan variabel CSS `var(--token-name)`, **pastikan token tersebut sudah didefinisikan** di `src/styles/cyber-compact.css`
- Jika token tidak ada di CSS, elemen akan terlihat transparan/invisible!
- Jika butuh token baru, **tambahkan ke CSS dulu**, baru gunakan di komponen
- Gunakan browser DevTools → Computed tab untuk verifikasi nilai token resolve

```tsx
// ✅ Good: Token yang SUDAH ada di CSS
<button className="bg-[var(--cyber-accent)] text-white">
// --cyber-accent: #ec4899 → tombol terlihat pink

// ❌ Bad: Token yang TIDAK ada di CSS
<button className="bg-[var(--cyber-nonexistent)] text-white">
// --cyber-nonexistent: undefined → tombol transparan, tidak terlihat!
```

### 3b. Admin Page Wrapper Rules

**WAJIB**: Halaman admin TIDAK boleh menambahkan wrapper `min-h-screen` sendiri.

`AdminShell` (di `AdminShellWrapper.tsx`) sudah menyediakan:
- `<div className="min-h-screen bg-black text-white">` — wrapper utama
- `<main className="p-3 lg:p-4">` — padding kontainer konten
- Sidebar, header, floating notifications

**Rules:**
- ❌ Jangan bungkus halaman admin dengan `<div className="min-h-screen bg-[var(--admin-bg-pure)]">`
- ✅ Gunakan `<>` (Fragment) atau langsung render tanpa wrapper tambahan
- ✅ `AdminHeroSection` langsung sebagai child pertama

```tsx
// ✅ Good: Tanpa wrapper duplikat
return (
  <>
    <AdminHeroSection title="Page" subtitle="..." badge="TAG" badgeColor="pink" />
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* konten */}
    </div>
  </>
);

// ❌ Bad: Wrapper duplikat — menyebabkan layout berlapis
return (
  <div className="min-h-screen bg-[var(--admin-bg-pure)]">
    <AdminHeroSection title="Page" subtitle="..." />
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* konten */}
    </div>
  </div>
);
```

### 3a. Mobile-First Approach (Public Pages)

**WAJIB**: Semua fitur untuk halaman public HARUS menggunakan pendekatan **mobile-first**.

**Prinsip:**
1. **Desain untuk mobile terlebih dahulu**, lalu tambahkan breakpoint untuk layar lebih besar (`sm:`, `md:`, `lg:`)
2. **Gunakan Tailwind responsive prefix secara ascending**: `base` → `sm:` → `md:` → `lg:` → `xl:`
3. **Hindari `hidden` tanpa breakpoint** — pastikan elemen terlihat di semua ukuran layar
4. **CyberBottomNav**: Ditampilkan di mobile (`lg:hidden`), tinggi ~80px, z-index `var(--cyber-z-sticky)` = 100

**Rules:**
- ✅ Gunakan `text-base sm:text-sm` pada `<input>` dan `<textarea>` (16px mencegah auto-zoom iOS)
- ✅ Tambahkan `touch-manipulation` pada tombol untuk menghilangkan delay 300ms
- ✅ Tambahkan `active:scale-95` atau `active:scale-[0.98]` untuk feedback sentuh
- ✅ Gunakan `env(safe-area-inset-bottom)` untuk padding bawah pada perangkat notch
- ✅ Fixed elements harus clear dari CyberBottomNav: `bottom-24 lg:bottom-4`
- ✅ Z-index fixed elements harus di atas CyberBottomNav: `z-[200]` minimum
- ✅ Widget/overlay pada mobile harus fullscreen: `fixed inset-0 sm:inset-auto sm:relative`
- ❌ Jangan gunakan fixed width tanpa fallback responsive: `w-[350px]` → `w-full sm:w-[350px]`
- ❌ Jangan gunakan `hover:` saja — selalu pasangkan dengan `active:` untuk touch

```tsx
// ✅ Good: Mobile-first chat widget
<div className="fixed inset-0 sm:inset-auto sm:relative sm:w-[350px] h-full sm:h-[min(500px,70vh)]">

// ✅ Good: Input yang tidak trigger zoom di iOS
<input className="text-base sm:text-sm ..." />

// ✅ Good: Tombol dengan feedback sentuh
<button className="hover:bg-white/20 active:bg-white/30 active:scale-95 touch-manipulation">

// ✅ Good: Fixed element clear dari bottom nav
<div className="fixed right-4 bottom-24 lg:bottom-4 z-[200]">

// ❌ Bad: Width tetap yang overflow di layar kecil
<div className="w-[350px] h-[500px]">

// ❌ Bad: Tidak ada padding safe area
<form className="p-3 border-t">
// ✅ Good: Dengan safe area
<form className="p-3 border-t pb-[max(0.75rem,env(safe-area-inset-bottom))]">
```

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

**Periodic Sync (Cron):**
- `api/cron/notification-sync.ts` berjalan setiap 10 menit
- Memeriksa order `paid`/`completed` dalam 48 jam terakhir yang belum punya notifikasi admin
- Membuat notifikasi admin + customer yang terlewat (idempotent)
- Diperlukan karena webhook kadang gagal membuat notifikasi meski berhasil update status order

---

## 🔐 Admin Role System

Sistem role untuk mengatur akses admin panel.

**Role yang tersedia:**

| Role | Akses | Deskripsi |
|---|---|---|
| `super_admin` | Semua halaman | Admin utama, akses penuh |
| `admin_viewer` | Dashboard, Orders, Products, Chat | Admin terbatas, hanya bisa melihat |

**Kolom database:** `public.users.role` (VARCHAR(50))
- Default value: `'user'` (bukan admin)
- Untuk admin baru: set `is_admin = TRUE` DAN `role = 'admin_viewer'` atau `'super_admin'`

**File terkait:**

| Layer | File | Fungsi |
|---|---|---|
| DB | `validate_session()` | Return `user_role` dari kolom `users.role` |
| Middleware | `api/_middleware/authMiddleware.ts` | `AuthResult.role` dikirim ke handler |
| API | `api/auth.ts` | Field `role` di `USER_SAFE_FIELDS` dan response |
| Frontend | `src/contexts/TraditionalAuthContext.tsx` | `User.role` di context |
| Route Guard | `src/components/RequireRole.tsx` | Proteksi route per role |
| Routes | `src/pages/admin/AdminRoutes.tsx` | Route grouping per role |
| Navigation | `src/pages/admin/components/AdminNavigation.tsx` | Filter menu per role |

**Aturan pengembangan:**
1. **Setiap route admin baru** HARUS dibungkus `<RequireRole>` di `AdminRoutes.tsx`
2. **Setiap menu baru** HARUS ditambahkan ke `ROLE_PERMISSIONS` di `RequireRole.tsx`
3. **Jangan hardcode role check** — gunakan `hasAccessToPath(user.role, path)` dari `RequireRole.tsx`
4. **Backend API** harus cek `auth.role` untuk operasi write (bukan hanya `isAdmin`)
5. **Admin baru**: Set di Supabase Dashboard → `users` table → set `is_admin = true`, `role = 'admin_viewer'`

```tsx
// ✅ Good: Route dilindungi RequireRole
<Route element={<RequireRole allowed={['super_admin']} />}>
  <Route path="/settings" element={<AdminSettings />} />
</Route>

// ✅ Good: Cek akses di UI
import { hasAccessToPath } from '../components/RequireRole';
{hasAccessToPath(user.role, '/admin/settings') && <SettingsButton />}

// ❌ Bad: Hardcode role check
{user.role === 'super_admin' && <SettingsButton />}
```

---

## � Docker Development Environment

**Container Name**: `jbalwikobracom-digid`

Container ini berjalan terus di background. Gunakan untuk sinkronisasi dan testing:

```bash
# Cek status container
docker ps -f name=jbalwikobracom-digid

# Masuk ke container
docker exec -it jbalwikobracom-digid /bin/sh

# Sync dengan container yang berjalan
docker logs jbalwikobracom-digid --tail 50
```

Pastikan selalu sync dengan container sebelum push perubahan.

---

## 📁 Konvensi Penamaan File Migrasi

**PENTING**: Gunakan format urutan angka 14 digit (compatible dengan Supabase CLI).

**Format Penamaan:**
```
NNNNNNNNNNNNNN_nama_deskriptif.sql

Contoh:
00000000000000_initial_schema.sql
00000000000001_enable_rls.sql
00000000000002_add_user_id_to_orders.sql
00000000000003_add_invoice_metadata.sql
...
00000000000055_create_live_chat_tables.sql
00000000000056_enable_chat_realtime.sql
00000000000057_add_chat_enhancements.sql
```

**Aturan:**
1. Gunakan angka 14 digit dengan padding zero (compatible dengan Supabase CLI timestamp format)
2. Pisahkan angka dan nama dengan underscore (_)
3. Gunakan underscore (_) untuk spasi dalam nama
4. Semua file migrasi HARUS berada di `supabase/migrations/`
5. Jangan simpan file non-migrasi di folder migrations

**Menambah Migrasi Baru:**
```bash
# Cek nomor terakhir
ls supabase/migrations/*.sql | tail -1
# Misal terakhir adalah 00000000000057, maka buat 00000000000058
touch supabase/migrations/00000000000058_nama_fitur_baru.sql
```

**Alasan:**
- Lebih mudah track urutan eksekusi
- Compatible dengan Supabase CLI `db push` dan `migration list`
- Sync local/remote lebih reliable
- Mudah dibaca dan di-sort

---

## 🔌 Unified API Pattern

**WAJIB**: Gunakan unified API call pattern untuk mengurangi jumlah endpoint dan menghemat egress.

**Pattern yang Digunakan:**
```typescript
// api/domain.ts - Single endpoint dengan action parameter
export default async function handler(req, res) {
  const { action } = req.query;
  
  switch (action) {
    case 'list':
      return handleList(req, res);
    case 'get':
      return handleGet(req, res);
    case 'create':
      return handleCreate(req, res);
    case 'update':
      return handleUpdate(req, res);
    case 'delete':
      return handleDelete(req, res);
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}
```

**Frontend Service Pattern:**
```typescript
// services/domainService.ts
async function apiCall<T>(action: string, method: 'GET' | 'POST', params?, body?): Promise<T> {
  const url = new URL('/api/domain', window.location.origin);
  url.searchParams.set('action', action);
  // ... unified fetch logic
}

export const listItems = () => apiCall<Item[]>('list', 'GET');
export const getItem = (id: string) => apiCall<Item>('get', 'GET', { id });
export const createItem = (data: CreateRequest) => apiCall<Item>('create', 'POST', undefined, data);
```

**Keuntungan:**
1. Satu endpoint per domain (bukan puluhan endpoint terpisah)
2. Lebih hemat egress (fewer HTTP connections)
3. Konsisten error handling
4. Mudah debug dan maintain

---

## 📦 Code Splitting & Skalabilitas

**WAJIB**: Pecah file besar (>300 baris) menjadi komponen kecil.

**Aturan:**
1. **Komponen UI**: Maksimal 200 baris per file
2. **Service files**: Maksimal 300 baris per file
3. **Page components**: Maksimal 400 baris, pecah ke sub-komponen jika lebih

**Struktur Pemecahan:**
```
src/pages/admin/AdminChatPage/
├── index.tsx              # Main component (imports & composes)
├── ChatConversationList.tsx
├── ChatMessageView.tsx
├── ChatInputForm.tsx
├── ChatTypingIndicator.tsx
├── ChatCannedPicker.tsx
├── ChatActivityLog.tsx
├── hooks/
│   ├── useChatMessages.ts
│   └── useChatTyping.ts
└── utils/
    └── chatHelpers.ts
```

**Panduan Pemecahan:**
- Setiap komponen harus punya single responsibility
- State yang di-share → angkat ke parent atau context
- Logic yang reusable → extract ke custom hook
- Utility functions → pindah ke folder utils/

---

## 💬 Komentar Kode (Bahasa Indonesia)

**WAJIB**: Semua komentar dalam kode menggunakan Bahasa Indonesia.

```typescript
// ✅ Benar
/**
 * Komponen untuk menampilkan daftar percakapan chat
 * Mendukung filter berdasarkan status dan pencarian
 */
const ChatConversationList: React.FC = () => {
  // State untuk menyimpan daftar percakapan
  const [conversations, setConversations] = useState([]);
  
  // Ambil data percakapan dari server
  const loadConversations = async () => {
    // ...
  };
};

// ❌ Salah
/**
 * Component to display chat conversation list
 * Supports filtering by status and search
 */
```

**Pengecualian:**
- JSDoc untuk public API yang mungkin digunakan library external
- Error messages yang ditampilkan ke user (tetap dalam Bahasa Indonesia)
- Console logs untuk debugging (boleh hybrid)

---

## 🗂️ Workspace Organization

**Jaga workspace tetap bersih dan terorganisir:**

```
Root/
├── .github/               # GitHub configs & CI/CD
├── api/                   # Vercel serverless functions
│   ├── _config/          # Shared configs
│   ├── _middleware/      # Auth, CORS
│   └── _utils/           # Shared utilities
├── docs/                  # Documentation
├── migrations/            # Legacy manual migrations (reference only)
├── scripts/               # Build & utility scripts
├── src/                   # React frontend source
├── supabase/
│   └── migrations/        # SEMUA file migrasi SQL di sini
└── public/                # Static assets
```

**File yang TIDAK boleh ada di root:**
- File SQL yang tidak terpakai
- Backup files (.bak, .old)
- Test files (pindahkan ke __tests__/)
- Temporary files

---

## �🚀 Commit Guidelines

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
