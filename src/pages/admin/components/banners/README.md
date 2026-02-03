# Banner Management Components Refactoring

Halaman admin untuk mengelola banner telah direfaktor menjadi komponen-komponen kecil yang modular dan mudah dimaintenance.

## Struktur Komponen

### 1. **BannerHeader** (`BannerHeader.tsx`)
- Menampilkan header halaman dengan tombol refresh dan add banner
- Props: `loading`, `onRefresh`, `onCreateBanner`

### 2. **BannerSearch** (`BannerSearch.tsx`)  
- Komponen search input untuk filter banner berdasarkan title/description
- Props: `searchTerm`, `onSearchChange`

### 3. **BannerTable** (`BannerTable.tsx`)
- Menampilkan tabel banner dengan pagination
- Menangani loading state dan empty state
- Props: `banners`, `loading`, `totalPages`, `currentPage`, `onPageChange`, dll.

### 4. **BannerForm** (`BannerForm.tsx`)
- Modal form untuk create/edit banner
- Menangani form state secara internal
- Props: `isOpen`, `onClose`, `editingBanner`, `onSubmit`, `submitting`

### 5. **ImagePreviewModal** (`ImagePreviewModal.tsx`)
- Modal untuk preview gambar banner
- Props: `imageUrl`, `onClose`

### 6. **useBannerManagement** (`useBannerManagement.ts`)
- Custom hook untuk business logic banner management
- Menangani semua API calls dan state management
- Return: `banners`, `loading`, `error`, `saveBanner`, dll.

## Keuntungan Refactoring

### 1. **Separation of Concerns**
- Setiap komponen memiliki tanggung jawab yang jelas
- Business logic terpisah dari UI logic
- Mudah untuk testing individual components

### 2. **Reusability**
- Komponen dapat digunakan ulang di halaman lain
- Custom hook dapat digunakan untuk fitur banner lainnya

### 3. **Maintainability**
- Kode lebih organized dan mudah dibaca
- Bug fixing lebih mudah karena scope yang terbatas
- Adding features baru lebih straightforward

### 4. **Type Safety**
- Semua props dan interfaces terdefinisi dengan baik
- IntelliSense support yang lebih baik

## File Structure

```
src/pages/admin/components/banners/
├── index.ts                    # Export barrel file
├── types.ts                    # Type definitions
├── useBannerManagement.ts      # Custom hook
├── BannerHeader.tsx           # Header component  
├── BannerSearch.tsx           # Search component
├── BannerTable.tsx            # Table component
├── BannerForm.tsx             # Form modal component
└── ImagePreviewModal.tsx      # Image preview modal
```

## Usage

The banner management is handled directly by the `AdminBanners.tsx` page which uses these modular components.

```tsx
// In AdminBanners.tsx
import { BannerForm, BannerFormData } from './components/banners';
```

## Future Improvements

1. **Add unit tests** untuk setiap komponen
2. **Optimize performance** dengan React.memo jika diperlukan
3. **Add loading skeleton** untuk better UX
4. **Implement drag & drop** untuk reorder banner
5. **Add bulk operations** (delete multiple, toggle status multiple)
