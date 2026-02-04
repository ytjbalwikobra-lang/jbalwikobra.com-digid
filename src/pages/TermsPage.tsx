import React from 'react';
import { SEOHead, Breadcrumb } from '../components/seo';

const TermsPage: React.FC = () => {
  const updated = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
      <div className="min-h-screen bg-[var(--cyber-bg-pure)] text-white">
      <SEOHead
        title="Syarat & Ketentuan | JBal WiKobra"
        description="Syarat dan ketentuan penggunaan layanan marketplace akun game JBal WiKobra. Baca kebijakan pembelian, pembayaran, refund, dan privasi data."
        keywords="syarat ketentuan, terms of service, kebijakan privasi, aturan penggunaan"
        url="/terms"
      />
      <Breadcrumb
        items={[
          { label: 'Syarat & Ketentuan', href: '/terms' }
        ]}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <h1 className="text-3xl font-bold text-white mb-2">Syarat &amp; Ketentuan</h1>
          <p className="text-sm text-[var(--cyber-text-secondary)] mb-8">Terakhir diperbarui: {updated}</p>

        <div className="space-y-6">
          <p className="text-[var(--cyber-text-secondary)]">
  Dokumen Syarat &amp; Ketentuan ini mengatur penggunaan layanan marketplace akun game yang dioperasikan oleh
    <strong> PT ALWI KOBRA INDONESIA</strong> (selanjutnya disebut &quot;Perusahaan&quot;). Dengan mengakses atau menggunakan layanan,
            Anda menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan berikut.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">1. Definisi</h2>
              <ul className="list-disc list-inside space-y-1 text-[var(--cyber-text-secondary)]">
              <li>&quot;Layanan&quot; adalah platform jual beli dan/atau rental akun game yang dikelola oleh Perusahaan.</li>
              <li>&quot;Pengguna&quot; adalah setiap pihak yang mengakses atau menggunakan Layanan.</li>
              <li>&quot;Penjual&quot; adalah Pengguna yang menawarkan akun game untuk dijual atau disewakan.</li>
              <li>&quot;Pembeli&quot; adalah Pengguna yang membeli atau menyewa akun game melalui Layanan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">2. Akun &amp; KYC</h2>
              <ul className="list-disc list-inside space-y-1 text-[var(--cyber-text-secondary)]">
              <li>Pengguna wajib memberikan data yang benar, lengkap, dan terbaru.</li>
              <li>Perusahaan berhak melakukan verifikasi (KYC) sesuai kebijakan untuk pencegahan fraud.</li>
              <li>Pengguna bertanggung jawab atas kerahasiaan kredensial dan seluruh aktivitas pada akunnya.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">3. Transaksi</h2>
              <ul className="list-disc list-inside space-y-1 text-[var(--cyber-text-secondary)]">
              <li>Semua transaksi pembelian diproses melalui mitra pembayaran resmi yang ditentukan Perusahaan.</li>
              <li>Perusahaan berhak menunda/menolak transaksi yang diduga melanggar hukum atau kebijakan platform.</li>
              <li>Penjual wajib menjamin keaslian, kepemilikan, dan kelayakan akun yang ditawarkan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">4. Pembayaran, Refund, dan Biaya</h2>
              <ul className="list-disc list-inside space-y-1 text-[var(--cyber-text-secondary)]">
              <li>Pembayaran dilakukan sesuai instruksi pada Layanan. Bukti pembayaran sah jika tervalidasi oleh sistem.</li>
              <li><strong>Semua pembelian bersifat final dan <u>tidak dapat di-refund</u>.</strong></li>
              <li>Biaya layanan dan/atau komisi dapat dikenakan dan diinformasikan secara transparan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">5. Pengiriman &amp; Akses Akun</h2>
              <ul className="list-disc list-inside space-y-1 text-[var(--cyber-text-secondary)]">
              <li>Detail akun akan dikirim setelah pembayaran terkonfirmasi.</li>
              <li>Untuk rental, akses diberikan sesuai durasi dan ketentuan yang disepakati.</li>
              <li>Pengguna wajib mengikuti panduan keamanan yang diberikan untuk mencegah pengambilalihan akun.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">6. Larangan</h2>
              <ul className="list-disc list-inside space-y-1 text-[var(--cyber-text-secondary)]">
              <li>Penggunaan untuk tindakan ilegal, penipuan, atau pelanggaran hak pihak ketiga.</li>
              <li>Distribusi kembali data yang melanggar privasi atau kebijakan platform.</li>
              <li>Eksploitasi bug, celah, atau akses tidak sah terhadap sistem.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">7. Batasan Tanggung Jawab</h2>
              <p className="text-[var(--cyber-text-secondary)]">
              Layanan disediakan “sebagaimana adanya”. Perusahaan tidak bertanggung jawab atas kehilangan tidak langsung,
              insidental, atau konsekuensial yang timbul dari penggunaan Layanan, sejauh diizinkan oleh hukum yang berlaku.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">8. Pernyataan Persetujuan</h2>
              <ul className="list-disc list-inside space-y-1 text-[var(--cyber-text-secondary)]">
              <li><strong>Pembelian akun dilakukan tanpa paksaan dan 100% atas kehendak Pengguna/Guest sendiri.</strong></li>
              <li><strong>Semua pembelian tidak dapat di-refund.</strong></li>
              <li><strong>PT ALWI KOBRA INDONESIA tidak bertanggung jawab atas penggunaan akun setelah dibeli.</strong></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">8. Kekayaan Intelektual</h2>
              <p className="text-[var(--cyber-text-secondary)]">
              Seluruh konten dan materi dalam Layanan adalah milik Perusahaan atau pemberi lisensi yang dilindungi hukum.
              Pengguna dilarang memperbanyak atau mendistribusikan tanpa izin tertulis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">9. Perubahan</h2>
              <p className="text-[var(--cyber-text-secondary)]">
              Perusahaan dapat memperbarui Syarat &amp; Ketentuan ini sewaktu-waktu. Perubahan akan diinformasikan melalui Layanan.
              Dengan tetap menggunakan Layanan, Anda menyetujui perubahan tersebut.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">10. Tanggung Jawab atas Penggunaan Akun</h2>
              <p className="text-[var(--cyber-text-secondary)]">
              Setelah kredensial akun diserahkan kepada Pembeli, seluruh risiko, pengelolaan, dan kepatuhan terhadap syarat platform game
              sepenuhnya menjadi tanggung jawab Pembeli. <strong>PT ALWI KOBRA INDONESIA tidak bertanggung jawab atas konsekuensi pemakaian akun setelah pembelian.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">11. Hukum yang Berlaku</h2>
              <p className="text-[var(--cyber-text-secondary)]">
              Syarat &amp; Ketentuan ini diatur oleh hukum Republik Indonesia. Sengketa akan diselesaikan melalui mekanisme yang
              ditentukan Perusahaan sesuai peraturan perundang-undangan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">12. Kontak</h2>
              <p className="text-[var(--cyber-text-secondary)]">
              Untuk pertanyaan, keluhan, atau permintaan terkait Syarat &amp; Ketentuan ini, silakan hubungi Perusahaan.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
