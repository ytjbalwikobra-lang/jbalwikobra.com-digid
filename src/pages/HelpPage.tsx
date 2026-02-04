import React from 'react';
import { SettingsService } from '../services/settingsService';
import { 
  HelpCircle, 
  ShieldCheck, 
  CreditCard, 
  Truck, 
  MessageSquare, 
  ChevronDown, 
  Search, 
  Sparkles,
  User,
  ShoppingBag,
  Heart,
  Settings,
  Zap,
  Star,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Home,
  Phone,
  Mail,
  Globe
} from 'lucide-react';
import { 
  PNSection, 
  PNContainer, 
  PNCard, 
  PNButton,
  PNHeading,
  PNText,
  PNSectionHeader,
  PNPill 
} from '../components/ui/PinkNeonDesignSystem';
import { useNavigate } from 'react-router-dom';
import { SEOHead, Breadcrumb, FAQPageSchema } from '../components/seo';

const faqs = [
  {
    category: 'Akun & Registrasi',
    q: 'Bagaimana cara daftar akun?',
    a: 'Klik "Masuk" → pilih "Daftar" → masukkan email dan password → verifikasi WhatsApp (opsional). Setelah daftar, Anda akan mendapat notifikasi selamat datang.'
  },
  {
    category: 'Pembelian',
    q: 'Bagaimana cara beli akun game?',
    a: 'Pilih produk → klik "Beli Sekarang" → isi form lengkap → pilih metode pembayaran → bayar sesuai invoice → akun dikirim otomatis setelah pembayaran konfirmasi.'
  },
  {
    category: 'Pembelian',
    q: 'Apa itu sistem rental?',
    a: 'Rental adalah sewa akun untuk durasi tertentu (harian/bulanan). Klik "Sewa" → pilih durasi → bayar → gunakan akun sesuai periode → akun dikembalikan otomatis.'
  },
  {
    category: 'Pembayaran',
    q: 'Metode pembayaran apa saja tersedia?',
    a: 'Semua pembayaran via Xendit: Transfer Bank, E-Wallet (DANA, GoPay, OVO, ShopeePay), Virtual Account, QRIS, dan Kartu Kredit/Debit. Pilih metode saat checkout.'
  },
  {
    category: 'Pembayaran',
    q: 'Berapa lama konfirmasi pembayaran?',
    a: 'Otomatis via webhook Xendit: Transfer bank 1-15 menit, e-wallet instan, virtual account 1-5 menit. Status order update real-time di "Riwayat Order".'
  },
  {
    category: 'Keamanan',
    q: 'Apakah data saya aman?',
    a: 'Ya, sangat aman. Kami gunakan Row Level Security (RLS), enkripsi data sensitif, payment gateway Xendit (PCI DSS compliant), dan monitoring 24/7. Data kartu tidak disimpan.'
  },
  {
    category: 'Keamanan',
    q: 'Jika akun bermasalah gimana?',
    a: 'Garansi 100% untuk semua akun. Jika ada masalah (login gagal, data salah), hubungi admin dengan bukti beli. Tim support siap troubleshoot atau replacement sesuai kebijakan.'
  },
  {
    category: 'Fitur',
    q: 'Bagaimana cara pakai wishlist?',
    a: 'Klik ❤️ pada produk → akses via profile dashboard → tersimpan otomatis tersinkron → dapat notifikasi flash sale item wishlist.'
  },
  {
    category: 'Fitur',
    q: 'Apa itu Flash Sale?',
    a: 'Diskon besar waktu terbatas dengan stok terbatas. Akses via menu "Flash Sale" atau notifikasi. Timer countdown show sisa waktu. Tips: Add ke wishlist untuk notifikasi otomatis.'
  },
  {
    category: 'Bantuan',
    q: 'Bagaimana hubungi customer service?',
    a: 'WhatsApp (respon tercepat, 09:00-21:00 WIB), Email support, atau chat admin via tombol bantuan. Untuk urgent, gunakan WhatsApp dengan nomor order.'
  }
];

const guides = [
  {
    title: 'Panduan Pembelian',
    steps: [
      'Daftar dengan email valid',
      'Verifikasi WhatsApp (opsional)',
      'Browse katalog produk',
      'Pilih dan baca detail produk',
      'Klik "Beli Sekarang"',
      'Isi data lengkap',
      'Pilih metode pembayaran',
      'Bayar dalam 24 jam',
      'Terima akun via WhatsApp'
    ]
  },
  {
    title: 'Tips Keamanan',
    steps: [
      'Gunakan akun resmi',
      'Periksa detail dan harga',
      'Bayar via metode resmi',
      'Simpan bukti pembayaran',
      'Jangan share data akun',
      'Update password berkala',
      'Report aktivitas mencurigakan'
    ]
  }
];

const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('Semua');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [whatsappNumber, setWhatsappNumber] = React.useState<string>(process.env.REACT_APP_WHATSAPP_NUMBER || '6281234567890');
  
  React.useEffect(() => {
    (async () => {
      try {
        const s = await SettingsService.get();
        if (s?.whatsappNumber) setWhatsappNumber(s.whatsappNumber);
      } catch (_e) {
        // ignore settings fetch error in help page
      }
    })();
  }, []);

  const categories = ['Semua', ...Array.from(new Set(faqs.map(faq => faq.category)))];
  
  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'Semua' || faq.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      faq.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-black">
      <SEOHead
        title="Pusat Bantuan & FAQ | JBal WiKobra"
        description="Temukan jawaban cepat untuk pertanyaan seputar pembelian akun game, pembayaran, keamanan, dan fitur wishlist. Panduan lengkap dan customer support 24/7."
        keywords="bantuan, faq, cara beli akun game, pembayaran xendit, keamanan akun, customer service"
        url="/help"
      />
      <Breadcrumb
        items={[
          { label: 'Pusat Bantuan', href: '/help' }
        ]}
      />
      <FAQPageSchema
        faqs={faqs.map(faq => ({
          question: faq.q,
          answer: faq.a
        }))}
      />

  {/* Pink Neon Hero Section - PN black theme */}
  <PNSection padding="lg" className="border-b border-white/10">
        <PNContainer>
          {/* Back Button */}
          <div className="mb-8">
            <PNButton 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/')}
      className="group flex items-center gap-2"
            >
      <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
      <span className="font-medium">Kembali ke Beranda</span>
            </PNButton>
          </div>

          {/* Hero Content */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-fuchsia-600 rounded-full flex items-center justify-center">
                <HelpCircle className="text-white" size={40} />
              </div>
            </div>
            
            <PNHeading level={1} gradient className="mb-4 text-3xl lg:text-4xl">
              Pusat Bantuan
            </PNHeading>
            
            <PNText className="text-lg lg:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
              Temukan jawaban cepat, panduan lengkap, dan kontak support untuk pengalaman terbaik di JBalwikobra
            </PNText>

            {/* Search Bar */}
      <div className="max-w-md mx-auto relative">
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl pl-14 pr-4 py-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 text-base" 
                placeholder="Cari: pembelian, pembayaran, keamanan..." 
              />
              <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-pink-500" />
            </div>
          </div>
        </PNContainer>
      </PNSection>

      <PNSection padding="lg">
        <PNContainer>

          {/* Quick Topics */}
          <div className="mb-12">
            <PNHeading level={2} className="mb-6 text-center">
              Topik Populer
            </PNHeading>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              <PNButton 
                variant="ghost"
                onClick={() => setSelectedCategory('Akun & Registrasi')}
                className="h-20 flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-pink-500/40 hover:bg-pink-500/10 group"
              >
                <User className="text-pink-500 group-hover:scale-110 transition-transform" size={28} />
                <span className="text-sm font-medium text-white">Akun</span>
              </PNButton>
              
              <PNButton 
                variant="ghost"
                onClick={() => setSelectedCategory('Pembelian')}
                className="h-20 flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-pink-500/40 hover:bg-pink-500/10 group"
              >
                <ShoppingBag className="text-pink-500 group-hover:scale-110 transition-transform" size={28} />
                <span className="text-sm font-medium text-white">Pembelian</span>
              </PNButton>
              
              <PNButton 
                variant="ghost"
                onClick={() => setSelectedCategory('Pembayaran')}
                className="h-20 flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-pink-500/40 hover:bg-pink-500/10 group"
              >
                <CreditCard className="text-pink-500 group-hover:scale-110 transition-transform" size={28} />
                <span className="text-sm font-medium text-white">Pembayaran</span>
              </PNButton>
              
              <PNButton 
                variant="ghost"
                onClick={() => setSelectedCategory('Keamanan')}
                className="h-20 flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-pink-500/40 hover:bg-pink-500/10 group"
              >
                <ShieldCheck className="text-pink-500 group-hover:scale-110 transition-transform" size={28} />
                <span className="text-sm font-medium text-white">Keamanan</span>
              </PNButton>
              
              <PNButton 
                variant="ghost"
                onClick={() => setSelectedCategory('Fitur')}
                className="h-20 flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-pink-500/40 hover:bg-pink-500/10 group"
              >
                <Heart className="text-pink-500 group-hover:scale-110 transition-transform" size={28} />
                <span className="text-sm font-medium text-white">Wishlist</span>
              </PNButton>
              
              <PNButton 
                variant="ghost"
                onClick={() => setSelectedCategory('Fitur')}
                className="h-20 flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-pink-500/40 hover:bg-pink-500/10 group"
              >
                <Zap className="text-pink-500 group-hover:scale-110 transition-transform" size={28} />
                <span className="text-sm font-medium text-white">Flash Sale</span>
              </PNButton>
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className="focus:outline-none"
                >
                  <PNPill active={selectedCategory === category}>
                    {category}
                  </PNPill>
                </button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* FAQ Section */}
            <div className="lg:col-span-2">
              <PNSectionHeader title="Pertanyaan Umum" subtitle="Jawaban cepat untuk pertanyaan paling sering" padX={false} />
              
              <PNCard className="divide-y divide-white/10">
                {filteredFaqs.map((item, idx) => (
                  <div key={idx} className="p-6">
                    <PNButton
                      variant="ghost"
                      fullWidth
                      onClick={() => setOpen(open === idx ? null : idx)}
                      className="text-left h-auto p-0"
                    >
                      <div className="flex items-start justify-between w-full gap-4">
                        <div className="flex-1">
                          <span className="inline-block px-3 py-1 bg-pink-500/20 text-pink-500 text-xs rounded-full mb-3 font-medium">
                            {item.category}
                          </span>
                          <PNHeading level={3} className="text-base lg:text-lg pr-2">{item.q}</PNHeading>
                        </div>
                        <ChevronDown 
                          className={`transition-transform text-pink-500 flex-shrink-0 mt-1 ${open === idx ? 'rotate-180' : ''}`} 
                          size={20}
                        />
                      </div>
                    </PNButton>
                    {open === idx && (
                      <div className="mt-4 text-gray-300 leading-relaxed text-sm lg:text-base">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </PNCard>

              {filteredFaqs.length === 0 && (
                <PNCard className="text-center p-12">
                  <Search className="mx-auto text-gray-400 mb-4" size={48} />
                  <PNHeading level={3} className="mb-2">Tidak Ada Hasil</PNHeading>
                  <PNText className="text-gray-400">Tidak ada FAQ yang cocok dengan pencarian Anda.</PNText>
                  <PNText className="text-gray-400 text-sm mt-2">Coba kata kunci lain atau hubungi support.</PNText>
                </PNCard>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Contact */}
              <PNCard className="p-6 relative overflow-hidden">
                <PNHeading level={3} className="mb-4 flex items-center gap-2">
                  <MessageSquare className="text-pink-500" />
                  Butuh Bantuan?
                </PNHeading>
                <PNText className="text-gray-300 mb-4">
                  Tim support siap membantu 24/7 via WhatsApp
                </PNText>
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-fuchsia-500/5" />
                <a
                  href={`https://wa.me/${whatsappNumber}?text=Halo%20admin,%20saya%20butuh%20bantuan%20terkait%20JBalwikobra`}
                  target="_blank"
                  rel="noreferrer"
                  className="block relative z-10"
                >
                  <PNButton variant="primary" fullWidth className="mb-4 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0 text-white">
                    <MessageSquare size={18} />
                    <span className="font-semibold">Chat WhatsApp</span>
                  </PNButton>
                </a>
                <div className="space-y-2 text-sm text-gray-400 relative z-10">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-400" />
                    <span>Respon dalam 5 menit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-pink-500" />
                    <span>Online: 09:00 - 21:00 WIB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-yellow-400" />
                    <span>Rating 4.9/5</span>
                  </div>
                </div>
              </PNCard>

              {/* System Status */}
              <PNCard className="p-6">
                <PNHeading level={3} className="mb-4 flex items-center gap-2">
                  <Settings className="text-pink-500" />
                  Status Sistem
                </PNHeading>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Website</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 text-sm font-medium">Online</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Pembayaran</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 text-sm font-medium">Normal</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Database</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 text-sm font-medium">Optimal</span>
                    </div>
                  </div>
                </div>
                <PNText className="text-xs text-gray-400 mt-4">
                  Update: {new Date().toLocaleString('id-ID')}
                </PNText>
              </PNCard>
            </div>
          </div>

          {/* Guides Section */}
          <div className="mt-16">
            <PNSectionHeader title="Panduan Lengkap" subtitle="Langkah-langkah praktis agar transaksi lancar" />
            
            <div className="grid md:grid-cols-2 gap-6">
              {guides.map((guide, idx) => (
                <PNCard key={idx} className="p-6">
                  <PNHeading level={3} className="mb-6">{guide.title}</PNHeading>
                  <div className="space-y-4">
                    {guide.steps.map((step, stepIdx) => (
                      <div key={stepIdx} className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {stepIdx + 1}
                        </div>
                        <PNText className="text-gray-300 pt-1">{step}</PNText>
                      </div>
                    ))}
                  </div>
                </PNCard>
              ))}
            </div>
          </div>

          {/* Still Need Help CTA */}
          <div className="mt-16">
            <PNCard className="text-center p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-fuchsia-500/5 pointer-events-none" />
              <div className="max-w-2xl mx-auto">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <AlertTriangle className="text-white" size={32} />
                  </div>
                </div>
                
                <PNHeading level={2} className="mb-4">Masih Butuh Bantuan?</PNHeading>
                <PNText className="text-gray-300 mb-8">
                  Tim support kami siap membantu menyelesaikan masalah spesifik Anda. Jangan ragu menghubungi kapan saja.
                </PNText>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto relative z-10">
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <PNButton variant="primary" size="lg" className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0 text-white">
                      <Phone size={18} />
                      <span className="font-semibold">WhatsApp Support</span>
                    </PNButton>
                  </a>
                  <a href="mailto:support@jbalwikobra.com">
                    <PNButton variant="secondary" size="lg" className="w-full flex items-center justify-center gap-2">
                      <Mail size={18} />
                      <span className="font-semibold">Email Support</span>
                    </PNButton>
                  </a>
                </div>
              </div>
            </PNCard>
          </div>

          {/* Bottom Navigation */}
          <div className="mt-16 text-center">
            <PNButton 
              onClick={() => navigate('/')}
              variant="ghost"
              size="lg"
              className="group inline-flex items-center justify-center gap-2"
            >
              <Home size={18} className="group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Kembali ke Beranda</span>
            </PNButton>
          </div>
        </PNContainer>
      </PNSection>
    </div>
  );
};

export default HelpPage;
