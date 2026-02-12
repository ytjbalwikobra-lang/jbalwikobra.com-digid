# GitHub Copilot Instructions

These instructions guide AI assistants (including GitHub Copilot) when working on this codebase.

## 🛠️ Technology Stack

- **Frontend**: React 18+ with TypeScript
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Styling**: Tailwind CSS + Cyber Compact Design System V3
- **Payments**: Xendit Payment Gateway
- **Realtime**: Supabase Realtime subscriptions
- **Authentication**: Google OAuth (via Supabase Auth) + Email/Password (custom session)
- **Messaging**: WhatsApp Business API (grup admin saja, individual customer WA dihapus Feb 2026)

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

Gunakan `npx supabase db push` untuk menerapkan migrasi ke production:

```bash
# 1. Link ke project Supabase (satu kali)
npx supabase link --project-ref xeithuvgldzxnggxadri

# 2. Push semua migrasi pending ke remote
echo "Y" | npx supabase db push

# 3. Cek status migrasi (semua harus sync local = remote)
npx supabase migration list

# 4. Generate types dari remote database
npx supabase gen types typescript --linked > src/types/database.ts

# 5. Verifikasi TypeScript compiles
npx tsc --noEmit
```

**Jika migrasi gagal:**
```bash
# 1. Catat error message dengan seksama
# 2. Revert status migrasi yang gagal
npx supabase migration repair NOMOR_MIGRASI --status reverted

# 3. Fix file migrasi SQL
# 4. Push ulang
echo "Y" | npx supabase db push
```

**CRITICAL Migration Rules:**
1. **SELALU gunakan `npx supabase db push`** — JANGAN via Dashboard SQL Editor
2. **Always generate types AFTER migration** using `supabase gen types`
3. **Verify** dengan `npx supabase migration list` — local dan remote harus sync
4. **Then commit** migration file + updated types together
5. **Jika gagal** — repair → fix → push ulang (jangan skip ke Dashboard)

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

### 2b. Supabase Migration — Pelajaran dari Kesalahan (Lessons Learned)

**PENTING**: Aturan ini berasal dari error nyata saat push migrasi. Ikuti ketat!

**1. `supabase db push` memvalidasi SEMUA statement sebelum eksekusi:**
- Jika migration file punya 5 statement, SEMUA di-validate dulu
- Jika statement ke-5 reference kolom yang baru dibuat di statement ke-1, GAGAL
- Error: `column "xxx" does not exist (SQLSTATE 42703)`

**2. DDL (ALTER TABLE) dan fungsi yang reference kolom baru HARUS di file terpisah:**
```sql
-- ❌ GAGAL: Satu file, CREATE FUNCTION reference kolom baru
ALTER TABLE users ADD COLUMN role VARCHAR(50);
CREATE FUNCTION validate_session(...) RETURNS TABLE(user_role VARCHAR) AS $$ 
  SELECT u.role FROM users u ...  -- GAGAL: role belum ada saat validasi
$$;

-- ✅ BENAR: Pisah jadi 2 file migrasi
-- File 058_add_role_column.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50);

-- File 059_update_function.sql  
CREATE OR REPLACE FUNCTION validate_session(...) ...
```

**3. PL/pgSQL mengkompilasi saat parse-time:**
- `UPDATE table SET new_col = 'value'` di dalam `DO $$` block GAGAL jika `new_col` belum ada
- Solusi: Gunakan `EXECUTE` dengan string untuk dynamic SQL
```sql
-- ❌ GAGAL
DO $$ BEGIN
  UPDATE users SET role = 'super_admin' WHERE is_admin = true;
END $$;

-- ✅ BENAR
DO $$ BEGIN
  EXECUTE 'UPDATE users SET role = ''super_admin'' WHERE is_admin = true';
END $$;
```

**4. Function overloads — DROP harus semua signature:**
- `DROP FUNCTION IF EXISTS func(VARCHAR(64))` hanya drop signature exact itu
- Jika ada overload dengan signature lain, function tetap ada → `COMMENT ON FUNCTION` gagal: "function name is not unique"
- Solusi: Gunakan loop `pg_proc` untuk drop SEMUA overloads
```sql
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT oid::regprocedure AS sig 
           FROM pg_proc WHERE proname = 'validate_session' 
           AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;
```

**5. `ALTER TABLE ADD COLUMN IF NOT EXISTS` lebih simpel:**
```sql
-- ❌ Terlalu verbose
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns ...) THEN
    ALTER TABLE x ADD COLUMN y TEXT;
  END IF;
END $$;

-- ✅ Simpel dan idempotent (PostgreSQL 9.6+)
ALTER TABLE x ADD COLUMN IF NOT EXISTS y TEXT;
```

**6. `COMMENT ON FUNCTION` harus specify signature jika ada overloads:**
```sql
-- ❌ GAGAL jika ada multiple signatures
COMMENT ON FUNCTION public.validate_session IS 'description';

-- ✅ BENAR: Specify exact parameter types
COMMENT ON FUNCTION public.validate_session(VARCHAR(64)) IS 'description';
```

**7. Return type fungsi HARUS cocok exact dengan tipe kolom tabel:**
- PostgreSQL error `42804`: "structure of query does not match function result type"
- Jika kolom tabel bertipe `TEXT`, return type fungsi HARUS `TEXT` (bukan `VARCHAR`)
- `TEXT` ≠ `VARCHAR` di PostgreSQL function return types meskipun keduanya string
- Selalu cek tipe kolom tabel SEBELUM menulis RETURNS TABLE
```sql
-- ❌ GAGAL: users.email bertipe TEXT, tapi return VARCHAR
RETURNS TABLE (user_email VARCHAR, user_name VARCHAR) ...
-- Error: Returned type text does not match expected type character varying

-- ✅ BENAR: Return type sesuai tipe kolom tabel
RETURNS TABLE (user_email TEXT, user_name TEXT) ...
```

**8. Argumen fungsi — perhatikan urutan parameter:**
- `setCorsHeaders(req, res)` ≠ `setCorsHeaders(res, req)` — swap argumen menyebabkan TS error di build Vercel
- Build error di Vercel menghasilkan "A server error has occurred" (plain text) bukan JSON
- Selalu cek TypeScript types untuk memastikan urutan argumen benar

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

## 📡 Supabase Realtime — Best Practices (WAJIB)

**Supabase Realtime (`postgres_changes`) ADALAH mekanisme utama untuk fitur real-time (chat, notifikasi, dll.). JANGAN gunakan polling sebagai pengganti Realtime.**

### Cara Kerja Realtime + RLS

1. Client subscribe ke channel menggunakan **anon key** (karena project ini pakai custom session auth, bukan Supabase Auth)
2. Supabase mengevaluasi **RLS policy** untuk role `anon` sebelum mengirim event
3. **Jika TIDAK ada SELECT policy untuk `anon` → event TIDAK PERNAH dikirim ke client**
4. Subscription filter (mis. `conversation_id=eq.xxx`) diterapkan SETELAH RLS check

### Aturan WAJIB untuk Tabel Realtime

```sql
-- ✅ WAJIB: Setiap tabel yang butuh Realtime HARUS punya:

-- 1. RLS enabled
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;

-- 2. Anon SELECT policy (karena custom auth, bukan Supabase Auth)
CREATE POLICY "my_table_anon_select"
  ON public.my_table
  FOR SELECT TO anon
  USING (true);

-- 3. Tabel di-publish ke realtime
ALTER PUBLICATION supabase_realtime ADD TABLE my_table;

-- ❌ JANGAN: Mengandalkan `authenticated` role atau `auth.uid()` untuk Realtime
-- Project ini menggunakan custom session auth → semua client pakai anon key
-- auth.uid() selalu NULL → policy dengan auth.uid() TIDAK BEKERJA untuk Realtime
```

### Keamanan Tanpa Supabase Auth

Karena anon key bisa SELECT, keamanan dijamin oleh:
1. **UUID sebagai identifier** — conversation_id/order_id tidak bisa ditebak
2. **Semua operasi tulis melalui API** — menggunakan service_role + custom session validation
3. **Frontend filter** — subscription hanya menerima event per conversation_id
4. **JANGAN simpan data sensitif** (password, token) di tabel yang punya anon SELECT

### Jangan Gunakan Polling Sebagai Pengganti Realtime

```typescript
// ❌ SALAH: Polling sebagai solusi utama
useEffect(() => {
  const interval = setInterval(() => fetchMessages(), 5000);
  return () => clearInterval(interval);
}, []);

// ✅ BENAR: Realtime sebagai mekanisme utama
useEffect(() => {
  const { unsubscribe } = subscribeToMessages(convId, (msg) => {
    setMessages(prev => [...prev, msg]);
  });
  return () => unsubscribe();
}, [convId]);
```

### Checklist Fitur Realtime Baru

- [ ] Tabel sudah enable RLS
- [ ] Policy `anon SELECT` sudah dibuat
- [ ] Tabel sudah di `supabase_realtime` publication
- [ ] Migration idempotent (pakai `IF NOT EXISTS`)
- [ ] Frontend subscribe via `supabase.channel().on('postgres_changes', ...)`
- [ ] Cleanup subscription di `useEffect` return
- [ ] Dedup event di callback (cek ID sebelum append)

---

## 📊 Egress Optimization (KRITIKAL — Budget 300GB/bulan)

**KONTEKS**: Supabase egress pernah meledak hingga 1.8TB/bulan. Limit plan adalah **300GB/bulan**. Setiap perubahan yang menyentuh database query WAJIB mempertimbangkan egress.

### Prinsip Utama

1. **JANGAN pernah gunakan `select('*')`** — selalu list kolom eksplisit
2. **Gunakan RPC untuk agregasi** — jangan unduh ribuan baris untuk dihitung di client
3. **Gunakan `{ count: 'exact', head: true }`** untuk menghitung jumlah baris tanpa transfer data
4. **Selalu pasang `.limit()`** pada query yang bisa mengembalikan banyak baris
5. **Cache response API** dengan `setCacheHeaders()` — hindari hit berulang yang sama
6. **Realtime subscription HARUS difilter** — jangan subscribe ke seluruh tabel

### Aturan Query Supabase

```typescript
// ❌ FATAL: Mengunduh SEMUA baris untuk dihitung di client
const { data } = await supabase.from('orders').select('amount').in('status', ['paid', 'completed']);
const revenue = data.reduce((sum, o) => sum + o.amount, 0); // 10.000 baris × 8 byte = 80KB per hit

// ✅ BENAR: Agregasi di database via RPC (return 1 angka = ~10 byte)
const { data } = await supabase.rpc('get_total_revenue');

// ❌ FATAL: Select semua kolom
const { data } = await supabase.from('products').select('*');

// ✅ BENAR: Hanya kolom yang dibutuhkan
const { data } = await supabase.from('products').select('id, name, price, image');

// ❌ BURUK: Mengunduh semua baris untuk menghitung jumlah
const { data } = await supabase.from('users').select('id');
const count = data.length;

// ✅ BENAR: Head-only count (nol transfer data)
const { count } = await supabase.from('users').select('id', { count: 'exact', head: true });

// ❌ BURUK: Query tanpa limit
const { data } = await supabase.from('orders').select('created_at, amount, status');

// ✅ BENAR: Selalu pasang limit
const { data } = await supabase.from('orders').select('created_at, amount, status').limit(100);
```

### RPC Functions yang Tersedia

| Function | Menggantikan | Hemat Egress |
|---|---|---|
| `get_dashboard_stats()` | 7+ query paralel + client-side reduce | ~95% |
| `get_total_revenue()` | SELECT amount FROM orders + SUM di client | ~99% |
| `get_average_rating()` | SELECT rating FROM reviews + AVG di client | ~99% |
| `get_orders_time_series(start, end)` | SELECT semua orders + bucket di client | ~90% |
| `get_order_status_time_series(start, end)` | SELECT semua orders + group di client | ~90% |
| `get_top_products(start, end, limit)` | SELECT semua orders + 2 query + aggregate client | ~95% |
| `get_product_stats()` | SELECT semua products + filter/reduce di client | ~95% |

```typescript
// ✅ Contoh penggunaan RPC
const { data } = await supabase.rpc('get_dashboard_stats');
// data = { totalOrders: 150, totalRevenue: 50000000, totalUsers: 80, ... }
// 1 query = ~200 byte vs 7+ query = ~50KB
```

### Aturan Realtime Subscription (Egress)

```typescript
// ❌ FATAL: Subscribe ke SEMUA notifikasi — setiap user menerima semua event
supabase.channel('notif').on('postgres_changes', {
  event: 'INSERT', schema: 'public', table: 'customer_notifications'
}, callback);

// ✅ BENAR: Filter server-side berdasarkan user
supabase.channel(`notif:${userId}`).on('postgres_changes', {
  event: 'INSERT', schema: 'public', table: 'customer_notifications',
  filter: `user_id=eq.${userId}`
}, callback);
```

### Aturan Polling

| Komponen | Interval Minimum | Alasan |
|---|---|---|
| Purchase ticker (public) | 15 menit | Data jarang berubah, banyak visitor |
| Notification fallback | 60 detik | Hanya jika realtime gagal |
| Admin cache check | 5 menit | Admin panel jarang banyak user |
| Chat safety-net | 5 menit | Hanya backup, realtime utama |

```typescript
// ❌ BURUK: Polling terlalu sering
setInterval(fetchData, 5000); // Setiap 5 detik

// ✅ BENAR: Gunakan interval yang wajar
setInterval(fetchData, 60000); // Setiap 60 detik (untuk fallback)
// Atau lebih baik: gunakan Realtime sebagai mekanisme utama
```

### Aturan API Cache Headers

```typescript
import { setCacheHeaders, CacheStrategies } from './_utils/cacheControl';

// Data statis/jarang berubah → cache panjang
setCacheHeaders(res, CacheStrategies.Long);     // 10 menit
setCacheHeaders(res, CacheStrategies.Extended);  // 1 jam

// Data dinamis tapi tidak perlu real-time → cache pendek
setCacheHeaders(res, CacheStrategies.Medium);    // 5 menit

// Data yang HARUS real-time → no cache
setCacheHeaders(res, CacheStrategies.NoCache);
```

### Write-path `.select()` (Insert/Update return)

```typescript
// ❌ KURANG OPTIMAL: Return semua kolom setelah insert
const { data } = await supabase.from('products').insert(payload).select();

// ✅ LEBIH BAIK: Return hanya kolom yang dibutuhkan
const { data } = await supabase.from('products').insert(payload).select('id, name, price');

// ✅ TERBAIK: Jika tidak butuh return data
const { error } = await supabase.from('products').insert(payload);
```

### Checklist Fitur Baru (Egress)

- [ ] Tidak ada `select('*')` — semua query list kolom eksplisit
- [ ] Agregasi besar (SUM, AVG, COUNT) → gunakan RPC, bukan client-side
- [ ] Query yang bisa return banyak baris → pasang `.limit()`
- [ ] Realtime subscription → filter server-side (jangan subscribe seluruh tabel)
- [ ] Polling interval → minimum 60 detik untuk fallback
- [ ] API response → pasang `setCacheHeaders()` yang sesuai
- [ ] Write-path → return hanya kolom yang dibutuhkan atau tidak return sama sekali

---

## ⚠️ Common Pitfalls

1. **RLS Bypass**: Always test queries with both authenticated and service role clients
2. **Type Mismatch**: Supabase returns `null` for missing relations — handle this
3. **Realtime Subscriptions**: Clean up subscriptions in `useEffect` cleanup
4. **Realtime + RLS**: Anon SELECT policy WAJIB ada untuk tabel yang butuh Realtime (lihat bagian Supabase Realtime di atas)
5. **Cache Invalidation**: Invalidate relevant caches after mutations
6. **Environment Variables**: Never hardcode secrets — use `process.env`

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
