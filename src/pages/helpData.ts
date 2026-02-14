/**
 * Data statis untuk halaman Pusat Bantuan (/help)
 * Dipisahkan dari komponen utama agar HelpPage.tsx tetap ringkas
 */

export interface FAQ {
  category: string;
  q: string;
  a: string;
}

export interface Guide {
  title: string;
  description: string;
  steps: string[];
}

export interface TopicCategory {
  key: string;
  label: string;
  iconKey: string;
}

// ============================================================
// FAQ — Pertanyaan yang sering diajukan
// ============================================================
export const faqs: FAQ[] = [
  // --- Akun & Login ---
  {
    category: 'Akun & Login',
    q: 'Bagaimana cara daftar akun?',
    a: 'Ada 2 cara: (1) Klik "Masuk" → pilih "Daftar" → isi email & password → selesai; atau (2) Klik "Masuk dengan Google" untuk daftar instan menggunakan akun Google. Setelah daftar, lengkapi profil untuk pengalaman terbaik.'
  },
  {
    category: 'Akun & Login',
    q: 'Saya lupa password, bagaimana cara resetnya?',
    a: 'Klik "Lupa password?" di halaman login → Anda akan diarahkan ke WhatsApp admin untuk verifikasi identitas dan reset password. Pastikan gunakan email atau nomor yang terdaftar di akun Anda.'
  },
  {
    category: 'Akun & Login',
    q: 'Apakah bisa login dengan akun Google?',
    a: 'Ya! Klik tombol "Masuk dengan Google" di halaman login. Akun otomatis terbuat jika belum pernah daftar. Kami hanya mengakses nama dan email dari Google — data Anda tetap aman.'
  },
  // --- Pembelian & Rental ---
  {
    category: 'Pembelian & Rental',
    q: 'Bagaimana cara membeli akun game?',
    a: 'Browse katalog → pilih produk → klik "Beli Sekarang" → isi data pemesanan → pilih metode pembayaran (QRIS, Virtual Account, atau e-wallet) → bayar sesuai invoice → akun otomatis diproses setelah pembayaran terkonfirmasi.'
  },
  {
    category: 'Pembelian & Rental',
    q: 'Apa itu sistem rental dan bagaimana cara kerjanya?',
    a: 'Rental adalah sewa akun game untuk durasi tertentu (harian, mingguan, atau bulanan). Pilih produk berlabel "Rental" → pilih durasi → bayar → admin mengaktifkan rental. Status rental bisa dipantau real-time: "Aktif" saat berjalan, "Hampir Selesai" saat sisa waktu < 10%, dan "Berakhir" saat durasi habis.'
  },
  {
    category: 'Pembelian & Rental',
    q: 'Bagaimana cara memantau status rental saya?',
    a: 'Status rental terlihat di 3 tempat: (1) Badge kartu produk di katalog — hijau "Tersedia", pink "Sedang Di-rental", kuning "Hampir Selesai"; (2) Halaman detail produk — progress bar & countdown; (3) Halaman "Riwayat Order" — status lengkap pesanan.'
  },
  // --- Pembayaran ---
  {
    category: 'Pembayaran',
    q: 'Metode pembayaran apa saja yang tersedia?',
    a: 'Semua pembayaran diproses aman melalui Xendit: QRIS (scan QR), Virtual Account (BCA, BNI, Mandiri), E-Wallet (DANA, GoPay, ShopeePay, LinkAja), serta transfer manual via WhatsApp admin untuk kondisi khusus.'
  },
  {
    category: 'Pembayaran',
    q: 'Berapa lama konfirmasi pembayaran?',
    a: 'Konfirmasi otomatis via sistem webhook: E-Wallet & QRIS instan (1-2 detik), Virtual Account 1-5 menit, Transfer Bank 1-15 menit. Status order otomatis terupdate — cek di halaman "Riwayat Order".'
  },
  {
    category: 'Pembayaran',
    q: 'Pembayaran saya gagal atau expired, apa yang harus dilakukan?',
    a: 'Cek di "Riwayat Order": jika masih pending, klik "Bayar Sekarang" untuk mencoba ulang. Jika sudah expired, buat pesanan baru. Pastikan saldo dan limit mencukupi. Jika masalah berlanjut, hubungi support via live chat.'
  },
  // --- Keamanan & Garansi ---
  {
    category: 'Keamanan & Garansi',
    q: 'Apakah transaksi dan data saya aman?',
    a: 'Sangat aman. Kami menggunakan: Row Level Security (RLS) pada database, enkripsi data sensitif, payment gateway Xendit (PCI DSS compliant), serta Google OAuth terverifikasi. Data kartu kredit tidak pernah disimpan di server kami.'
  },
  {
    category: 'Keamanan & Garansi',
    q: 'Bagaimana garansi jika produk bermasalah?',
    a: 'Garansi 100% untuk semua produk. Jika ada masalah (login gagal, data tidak sesuai), hubungi admin via live chat disertai bukti pembelian (nomor order). Tim support akan memberikan troubleshoot atau penggantian akun sesuai kebijakan.'
  },
  // --- Fitur Platform ---
  {
    category: 'Fitur Platform',
    q: 'Bagaimana cara menggunakan wishlist?',
    a: 'Klik ikon ❤️ pada produk yang disukai → produk tersimpan di wishlist Anda (akses via profil atau menu navigasi). Bonus: Anda otomatis mendapat notifikasi saat item wishlist masuk Flash Sale!'
  },
  {
    category: 'Fitur Platform',
    q: 'Apa itu Flash Sale dan bagaimana cara ikutan?',
    a: 'Flash Sale adalah diskon besar dengan waktu & stok terbatas! Akses via menu "Flash Sale" atau dari notifikasi. Timer countdown menunjukkan sisa waktu. Tips: tambahkan produk ke wishlist untuk mendapat notifikasi otomatis saat Flash Sale dimulai.'
  },
  {
    category: 'Fitur Platform',
    q: 'Apakah ada fitur live chat dengan admin?',
    a: 'Ya! Klik ikon chat (💬) di pojok kanan bawah layar. Pilih topik masalah → mulai percakapan langsung dengan admin. Fitur ini tersedia di semua halaman, mendukung pengiriman gambar, dan admin merespon saat jam operasional (09:00-21:00 WIB).'
  },
  {
    category: 'Fitur Platform',
    q: 'Bagaimana sistem notifikasi bekerja?',
    a: 'Notifikasi real-time muncul otomatis saat: pesanan berubah status (dibayar, diproses, selesai), ada Flash Sale baru, atau pengumuman penting. Klik ikon 🔔 untuk melihat semua notifikasi, atau buka halaman "Notifikasi" untuk riwayat lengkap.'
  },
  // --- Bantuan ---
  {
    category: 'Bantuan',
    q: 'Bagaimana cara menghubungi customer service?',
    a: 'Ada 3 cara: (1) Live Chat — klik ikon chat di pojok kanan bawah, respon tercepat saat jam operasional; (2) WhatsApp — untuk masalah urgent di luar jam kerja; (3) Email support@jbalwikobra.com — untuk pertanyaan non-urgent atau lampiran dokumen.'
  },
];

// ============================================================
// Panduan langkah demi langkah
// ============================================================
export const guides: Guide[] = [
  {
    title: 'Panduan Pembelian',
    description: 'Cara membeli akun game dari awal hingga selesai',
    steps: [
      'Daftar atau login dengan email / Google',
      'Browse katalog di halaman "Produk"',
      'Pilih produk dan baca detail lengkap',
      'Klik "Beli Sekarang" → isi form pemesanan',
      'Pilih metode pembayaran (QRIS, VA, e-wallet)',
      'Selesaikan pembayaran dalam batas waktu',
      'Cek status di "Riwayat Order" — konfirmasi otomatis',
      'Admin memproses & akun dikirim ke Anda',
    ],
  },
  {
    title: 'Panduan Rental',
    description: 'Cara menyewa akun game untuk durasi tertentu',
    steps: [
      'Pilih produk berlabel "Rental" di katalog',
      'Klik tab "Sewa" di halaman detail produk',
      'Pilih durasi: harian, mingguan, atau bulanan',
      'Selesaikan pembayaran seperti pembelian biasa',
      'Admin mengaktifkan rental — status berubah "Aktif"',
      'Pantau sisa waktu di badge produk atau riwayat order',
      'Status otomatis jadi "Hampir Selesai" saat sisa < 10%',
      'Kembalikan akun saat masa rental berakhir',
    ],
  },
  {
    title: 'Tips Keamanan',
    description: 'Cara menjaga keamanan akun dan transaksi Anda',
    steps: [
      'Gunakan password kuat dan unik untuk akun',
      'Jangan bagikan data login ke siapapun',
      'Bayar hanya via metode resmi (Xendit / WA admin)',
      'Simpan bukti pembayaran dan nomor order',
      'Cek notifikasi untuk update status pesanan',
      'Laporkan aktivitas mencurigakan via live chat',
      'Gunakan login Google untuk keamanan tambahan',
    ],
  },
];

// ============================================================
// Topik cepat (ikon dihandle di komponen)
// ============================================================
export const topicCategories: TopicCategory[] = [
  { key: 'Akun & Login', label: 'Akun', iconKey: 'user' },
  { key: 'Pembelian & Rental', label: 'Belanja', iconKey: 'shopping' },
  { key: 'Pembayaran', label: 'Bayar', iconKey: 'credit' },
  { key: 'Keamanan & Garansi', label: 'Keamanan', iconKey: 'shield' },
  { key: 'Fitur Platform', label: 'Fitur', iconKey: 'zap' },
  { key: 'Bantuan', label: 'Bantuan', iconKey: 'message' },
];
