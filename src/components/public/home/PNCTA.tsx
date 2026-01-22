import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Handshake, DollarSign, ArrowRight } from 'lucide-react';
import { PNSection, PNContainer, PNHeading, PNText, PNButton, PNCard } from '../../ui/PinkNeonDesignSystem';
import { SettingsService } from '../../../services/settingsService';
import { ensureUrlProtocol } from '../../../utils/helpers';
import type { WebsiteSettings } from '../../../types';

const PNCTA: React.FC = () => {
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await SettingsService.get();
        if (mounted) setSettings(data);
      } catch {
        // silent fail – CTA can render without settings
      }
    })();
    return () => { mounted = false; };
  }, []);

  const jualAkunWhatsappUrl = ensureUrlProtocol(settings?.jualAkunWhatsappUrl || 'https://www.alwikobra.com');
  
  return (
    <PNSection padding="lg">
      <PNContainer>
        {/* Service Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10" role="navigation" aria-label="Layanan kami">
          <a href={jualAkunWhatsappUrl} target="_blank" rel="noopener noreferrer" className="block group" aria-label="Jual Akun - Jual akun game Anda dengan harga terbaik (membuka di tab baru)">
            <PNCard className="p-6 h-full hover:bg-white/10 hover:border-pink-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-green-500/20" aria-hidden="true">
                <DollarSign size={24} className="text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-1.5 group-hover:text-pink-300 transition-colors">Jual Akun</h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">Jual akun game Anda dengan harga terbaik</p>
              <span className="text-pink-400 text-sm font-medium flex items-center gap-1.5 group-hover:gap-2.5 transition-all" aria-hidden="true">
                Hubungi Admin <ArrowRight size={14} />
              </span>
            </PNCard>
          </a>
          
          <a href={jualAkunWhatsappUrl} target="_blank" rel="noopener noreferrer" className="block group" aria-label="Rekber Aman - Transaksi aman dengan layanan rekening bersama (membuka di tab baru)">
            <PNCard className="p-6 h-full hover:bg-white/10 hover:border-pink-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20" aria-hidden="true">
                <Handshake size={24} className="text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-1.5 group-hover:text-pink-300 transition-colors">Rekber Aman</h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">Transaksi aman dengan layanan rekening bersama</p>
              <span className="text-pink-400 text-sm font-medium flex items-center gap-1.5 group-hover:gap-2.5 transition-all" aria-hidden="true">
                Gunakan Rekber <ArrowRight size={14} />
              </span>
            </PNCard>
          </a>
          
          <Link to="/products" className="block group" aria-label="Beli Akun - Lihat katalog akun game premium">
            <PNCard className="p-6 h-full hover:bg-white/10 hover:border-pink-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center mb-4 shadow-lg shadow-pink-500/20" aria-hidden="true">
                <ShoppingBag size={24} className="text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-1.5 group-hover:text-pink-300 transition-colors">Beli Akun</h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">Ribuan akun game premium siap dikirim instant</p>
              <span className="text-pink-400 text-sm font-medium flex items-center gap-1.5 group-hover:gap-2.5 transition-all" aria-hidden="true">
                Lihat Katalog <ArrowRight size={14} />
              </span>
            </PNCard>
          </Link>
        </div>
        
        {/* Main CTA Banner */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-r from-pink-900/30 via-black/50 to-fuchsia-900/30 p-6 sm:p-10" role="region" aria-label="Ajakan bergabung">
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-pink-500/15 rounded-full blur-[100px]" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-fuchsia-500/15 rounded-full blur-[100px]" />
          </div>
          <div className="relative z-10 text-center max-w-xl mx-auto">
            <PNHeading level={2} gradient className="mb-3">Siap Memulai?</PNHeading>
            <PNText color="muted" className="mb-8 text-base">Bergabung dengan 10.000+ gamer yang sudah mempercayakan transaksi mereka kepada kami.</PNText>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Link to="/products" className="flex-1">
                <PNButton variant="primary" size="lg" fullWidth>Mulai Belanja</PNButton>
              </Link>
              <Link to="/flash-sales" className="flex-1">
                <PNButton variant="ghost" size="lg" fullWidth>Lihat Flash Sale</PNButton>
              </Link>
            </div>
          </div>
        </div>
      </PNContainer>
    </PNSection>
  );
};

export default React.memo(PNCTA);
