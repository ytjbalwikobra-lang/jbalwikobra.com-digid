import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsService } from '../services/settingsService';
import {
  HelpCircle, ShieldCheck, CreditCard, MessageSquare, ChevronDown, Search,
  User, ShoppingBag, Zap, Clock, Phone, Mail, ArrowLeft, Home,
  CheckCircle, Star, Key
} from 'lucide-react';
import {
  PNSection, PNContainer, PNCard, PNButton, PNHeading, PNText,
  PNSectionHeader, PNPill
} from '../components/ui/CyberDesignSystem';
import { SEOHead, Breadcrumb, FAQPageSchema } from '../components/seo';
import { faqs, guides, topicCategories } from './helpData';

// Mapping ikon per topik (dipisahkan dari data agar data file bebas JSX)
const topicIcons: Record<string, React.ElementType> = {
  user: User,
  shopping: ShoppingBag,
  credit: CreditCard,
  shield: ShieldCheck,
  zap: Zap,
  message: MessageSquare,
};

const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(
    process.env.REACT_APP_WHATSAPP_NUMBER || '6281234567890'
  );

  // Ambil nomor WhatsApp dari settings
  useEffect(() => {
    (async () => {
      try {
        const s = await SettingsService.get();
        if (s?.whatsappNumber) setWhatsappNumber(s.whatsappNumber);
      } catch (_e) {
        // abaikan error fetch settings di help page
      }
    })();
  }, []);

  const categories = ['Semua', ...Array.from(new Set(faqs.map(f => f.category)))];

  const filteredFaqs = faqs.filter(faq => {
    const matchCat = selectedCategory === 'Semua' || faq.category === selectedCategory;
    const term = searchTerm.toLowerCase();
    const matchSearch = !term || faq.q.toLowerCase().includes(term) || faq.a.toLowerCase().includes(term);
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[var(--cyber-bg-pure)]">
      <SEOHead
        title="Pusat Bantuan & FAQ | JBal WiKobra"
        description="Jawaban lengkap seputar pembelian, rental akun game, pembayaran, keamanan, live chat, dan fitur platform. Panduan & customer support."
        keywords="bantuan, faq, cara beli akun game, rental akun, pembayaran xendit, keamanan, live chat, customer service"
        url="/help"
      />
      <Breadcrumb items={[{ label: 'Pusat Bantuan', href: '/help' }]} />
      <FAQPageSchema faqs={faqs.map(f => ({ question: f.q, answer: f.a }))} />

      {/* ========== Hero Section ========== */}
      <PNSection padding="lg" className="border-b border-[var(--cyber-border)]">
        <PNContainer>
          <div className="mb-6">
            <PNButton variant="ghost" size="sm" onClick={() => navigate('/')} className="group flex items-center gap-2 touch-manipulation active:scale-95">
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Kembali</span>
            </PNButton>
          </div>

          <div className="text-center mb-10">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)] rounded-full flex items-center justify-center shadow-[var(--cyber-glow-md)]">
                <HelpCircle className="text-white" size={32} />
              </div>
            </div>
            <PNHeading level={1} gradient className="mb-3 text-2xl sm:text-3xl lg:text-4xl">
              Pusat Bantuan
            </PNHeading>
            <PNText className="text-base sm:text-lg text-[var(--cyber-text-secondary)] max-w-2xl mx-auto mb-6">
              Temukan jawaban, panduan langkah demi langkah, dan hubungi support kapan saja
            </PNText>

            {/* Search — text-base mencegah auto-zoom iOS */}
            <div className="max-w-md mx-auto relative">
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] rounded-[var(--cyber-radius-2xl)] pl-12 pr-4 py-3.5 text-white placeholder:text-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-pink-primary)] focus:ring-2 focus:ring-[var(--cyber-pink-muted)]/20 text-base sm:text-sm"
                placeholder="Cari pertanyaan atau topik..."
              />
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--cyber-pink-primary)]" />
            </div>
          </div>
        </PNContainer>
      </PNSection>

      {/* ========== Konten Utama ========== */}
      <PNSection padding="lg">
        <PNContainer>
          {/* Topik Cepat — grid 3 kolom mobile, 6 desktop */}
          <div className="mb-10">
            <PNHeading level={2} className="mb-5 text-center text-lg sm:text-xl">Topik Populer</PNHeading>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {topicCategories.map(topic => {
                const Icon = topicIcons[topic.iconKey];
                const isActive = selectedCategory === topic.key;
                return (
                  <button
                    key={topic.key}
                    onClick={() => setSelectedCategory(isActive ? 'Semua' : topic.key)}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-[var(--cyber-radius-xl)] border transition touch-manipulation active:scale-95 ${
                      isActive
                        ? 'border-[var(--cyber-pink-primary)] bg-[var(--cyber-pink-primary)]/10'
                        : 'border-[var(--cyber-border)] bg-[var(--cyber-bg-card)] hover:border-[var(--cyber-pink-primary)]/40 hover:bg-[var(--cyber-pink-primary)]/5'
                    }`}
                  >
                    <Icon className="text-[var(--cyber-pink-primary)]" size={24} />
                    <span className="text-xs sm:text-sm font-medium text-[var(--cyber-text-primary)]">{topic.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Kategori Pills */}
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className="focus:outline-none touch-manipulation">
                <PNPill active={selectedCategory === cat}>{cat}</PNPill>
              </button>
            ))}
          </div>

          {/* FAQ + Sidebar */}
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* FAQ Accordion */}
            <div className="lg:col-span-2">
              <PNSectionHeader title="Pertanyaan Umum" subtitle={`${filteredFaqs.length} pertanyaan ditemukan`} padX={false} />

              {filteredFaqs.length > 0 ? (
                <PNCard className="divide-y divide-[var(--cyber-border)]">
                  {filteredFaqs.map((item, idx) => (
                    <div key={idx} className="p-4 sm:p-5">
                      <button
                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                        className="w-full text-left flex items-start justify-between gap-3 touch-manipulation"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="inline-block px-2.5 py-0.5 bg-[var(--cyber-pink-primary)]/15 text-[var(--cyber-pink-primary)] text-xs rounded-full mb-2 font-medium">
                            {item.category}
                          </span>
                          <PNHeading level={3} className="text-sm sm:text-base">{item.q}</PNHeading>
                        </div>
                        <ChevronDown
                          className={`transition-transform text-[var(--cyber-pink-primary)] flex-shrink-0 mt-1 ${openFaq === idx ? 'rotate-180' : ''}`}
                          size={18}
                        />
                      </button>
                      {openFaq === idx && (
                        <p className="mt-3 text-[var(--cyber-text-secondary)] leading-relaxed text-sm">{item.a}</p>
                      )}
                    </div>
                  ))}
                </PNCard>
              ) : (
                <PNCard className="text-center p-10">
                  <Search className="mx-auto text-[var(--cyber-text-muted)] mb-3" size={40} />
                  <PNHeading level={3} className="mb-2 text-base">Tidak Ada Hasil</PNHeading>
                  <PNText color="muted" className="text-sm">Coba kata kunci lain atau hubungi support via live chat.</PNText>
                </PNCard>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Live Chat — metode utama */}
              <PNCard className="p-5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-[var(--cyber-pink-subtle)] to-transparent" />
                <div className="relative z-10">
                  <PNHeading level={3} className="mb-2 text-base flex items-center gap-2">
                    <MessageSquare className="text-[var(--cyber-pink-primary)]" size={20} />
                    Live Chat
                  </PNHeading>
                  <PNText color="secondary" className="text-sm mb-4">
                    Cara tercepat — klik ikon chat di pojok kanan bawah layar
                  </PNText>
                  <div className="space-y-2 text-sm text-[var(--cyber-text-muted)]">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-[var(--cyber-success)]" />
                      <span>Respon dalam hitungan menit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[var(--cyber-pink-primary)]" />
                      <span>Jam operasional: 09:00 – 21:00 WIB</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star size={14} className="text-[var(--cyber-warning)]" />
                      <span>Kirim gambar & detail order</span>
                    </div>
                  </div>
                </div>
              </PNCard>

              {/* WhatsApp — alternatif */}
              <PNCard className="p-5">
                <PNHeading level={3} className="mb-2 text-base flex items-center gap-2">
                  <Phone className="text-[var(--cyber-success)]" size={20} />
                  WhatsApp Support
                </PNHeading>
                <PNText color="secondary" className="text-sm mb-3">
                  Untuk masalah urgent di luar jam operasional
                </PNText>
                <a
                  href={`https://wa.me/${whatsappNumber}?text=Halo%20admin,%20saya%20butuh%20bantuan`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <PNButton variant="secondary" fullWidth className="flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98]">
                    <MessageSquare size={16} />
                    <span>Chat WhatsApp</span>
                  </PNButton>
                </a>
              </PNCard>

              {/* Navigasi Cepat */}
              <PNCard className="p-5">
                <PNHeading level={3} className="mb-3 text-base">Navigasi Cepat</PNHeading>
                <nav className="space-y-1.5">
                  {[
                    { to: '/products', label: 'Katalog Produk', icon: ShoppingBag },
                    { to: '/orders', label: 'Riwayat Order', icon: Key },
                    { to: '/flash-sales', label: 'Flash Sale', icon: Zap },
                    { to: '/feed', label: 'Feed & Review', icon: Star },
                    { to: '/settings', label: 'Pengaturan Akun', icon: User },
                  ].map(link => (
                    <button
                      key={link.to}
                      onClick={() => navigate(link.to)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-[var(--cyber-radius-lg)] text-[var(--cyber-text-secondary)] hover:text-[var(--cyber-text-primary)] hover:bg-[var(--cyber-bg-elevated)] transition touch-manipulation active:scale-[0.98] text-left text-sm"
                    >
                      <link.icon size={16} className="text-[var(--cyber-pink-primary)] flex-shrink-0" />
                      <span>{link.label}</span>
                    </button>
                  ))}
                </nav>
              </PNCard>
            </div>
          </div>

          {/* ========== Panduan Langkah demi Langkah ========== */}
          <div className="mt-12">
            <PNSectionHeader title="Panduan Langkah demi Langkah" subtitle="Ikuti panduan praktis agar transaksi lancar" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {guides.map((guide, idx) => (
                <PNCard key={idx} className="p-5">
                  <PNHeading level={3} className="mb-1 text-base">{guide.title}</PNHeading>
                  <PNText color="muted" className="text-xs mb-4">{guide.description}</PNText>
                  <ol className="space-y-2.5">
                    {guide.steps.map((step, si) => (
                      <li key={si} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)] text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {si + 1}
                        </span>
                        <span className="text-sm text-[var(--cyber-text-secondary)] pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </PNCard>
              ))}
            </div>
          </div>

          {/* ========== CTA: Tidak Menemukan Jawaban ========== */}
          <div className="mt-12">
            <PNCard className="text-center p-8 sm:p-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--cyber-pink-subtle)] via-transparent to-[var(--cyber-pink-subtle)] pointer-events-none" />
              <div className="relative z-10 max-w-xl mx-auto">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 bg-gradient-to-r from-[var(--cyber-warning)] to-[var(--cyber-orange)] rounded-full flex items-center justify-center">
                    <HelpCircle className="text-white" size={28} />
                  </div>
                </div>
                <PNHeading level={2} className="mb-3 text-lg sm:text-xl">Tidak Menemukan Jawaban?</PNHeading>
                <PNText color="secondary" className="mb-6 text-sm sm:text-base">
                  Tim support kami siap membantu. Gunakan live chat untuk respon tercepat, atau hubungi via WhatsApp &amp; email.
                </PNText>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">
                    <PNButton variant="primary" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98]">
                      <Phone size={18} />
                      <span className="font-semibold">WhatsApp</span>
                    </PNButton>
                  </a>
                  <a href="mailto:support@jbalwikobra.com">
                    <PNButton variant="secondary" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98]">
                      <Mail size={18} />
                      <span className="font-semibold">Email</span>
                    </PNButton>
                  </a>
                </div>
              </div>
            </PNCard>
          </div>

          {/* Bottom — kembali ke beranda */}
          <div className="mt-10 text-center pb-4">
            <PNButton variant="ghost" onClick={() => navigate('/')} className="group inline-flex items-center gap-2 touch-manipulation active:scale-95">
              <Home size={16} className="group-hover:scale-110 transition-transform" />
              <span className="font-medium">Kembali ke Beranda</span>
            </PNButton>
          </div>
        </PNContainer>
      </PNSection>
    </div>
  );
};

export default HelpPage;
