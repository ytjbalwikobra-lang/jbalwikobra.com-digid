import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Rocket, MessageCircle, Sparkles, DollarSign, Handshake } from 'lucide-react';
import { PNSection, PNContainer, PNHeading, PNText, PNButton } from '../../ui/PinkNeonDesignSystem';
import { SettingsService } from '../../../services/settingsService';
import { ensureUrlProtocol } from '../../../utils/helpers';
import type { WebsiteSettings } from '../../../types';

const PNHero: React.FC = () => {
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await SettingsService.get();
        if (mounted) setSettings(data);
      } catch {
        // silent fail – hero can render without settings
      }
    })();
    return () => { mounted = false; };
  }, []);

  const topupGameUrl = ensureUrlProtocol(settings?.topupGameUrl || 'https://www.alwikobrastore.com');
  const whatsappChannelUrl = ensureUrlProtocol(settings?.whatsappChannelUrl || 'https://whatsapp.com/channel/0029VaZgVaZGOj9tyv9b8Y0E');
  const jualAkunWhatsappUrl = ensureUrlProtocol(settings?.jualAkunWhatsappUrl || 'https://www.alwikobra.com');
  
  // Use hero settings from admin settings
  const heroTitle = settings?.heroTitle || 'Gaming Marketplace #1';
  const heroSubtitle = settings?.heroSubtitle || 'Beli, jual, dan rental akun game favorit dengan aman, cepat, dan terpercaya';

  return (
    <PNSection padding="lg">
      <PNContainer>
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-black via-gray-900/50 to-black px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          {/* Animated glow background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-pink-500/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-fuchsia-600/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          
          <div className="relative z-10 text-center max-w-xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-pink-500/15 border border-pink-500/25 rounded-full px-4 py-2 mb-5" role="status">
              <Sparkles size={14} className="text-pink-400" aria-hidden="true" />
              <span className="text-xs font-medium text-pink-300 tracking-wide">Trusted by 10K+ Gamers</span>
            </div>
            
            <PNHeading level={1} gradient className="mb-4">{heroTitle}</PNHeading>
            <PNText color="secondary" className="mb-8 text-base sm:text-lg leading-relaxed">{heroSubtitle}</PNText>

            {/* Primary CTA - Top Up Game (most important) */}
            <a href={topupGameUrl} target="_blank" rel="noopener noreferrer" className="block mb-4" aria-label="Top Up Semua Game - Murah! (membuka di tab baru)">
              <PNButton variant="primary" size="lg" fullWidth className="flex items-center justify-center gap-2.5">
                <Rocket size={18} aria-hidden="true" />
                <span>Top Up Semua Game - Murah!</span>
              </PNButton>
            </a>
            
            {/* Secondary CTAs - 2x2 grid */}
            <div className="grid grid-cols-2 gap-3 mb-3" role="navigation" aria-label="Menu utama">
              <Link to="/products" className="block">
                <PNButton variant="secondary" size="md" fullWidth className="flex items-center justify-center gap-2">
                  <ShoppingBag size={16} aria-hidden="true" />
                  <span>Lihat Stok</span>
                </PNButton>
              </Link>
              <a href={jualAkunWhatsappUrl} target="_blank" rel="noopener noreferrer" className="block" aria-label="Jual Akun - Hubungi Admin (membuka di tab baru)">
                <PNButton variant="secondary" size="md" fullWidth className="flex items-center justify-center gap-2">
                  <DollarSign size={16} aria-hidden="true" />
                  <span>Jual Akun</span>
                </PNButton>
              </a>
              <a href={jualAkunWhatsappUrl} target="_blank" rel="noopener noreferrer" className="block" aria-label="Rekber Aman - Layanan Rekening Bersama (membuka di tab baru)">
                <PNButton variant="ghost" size="md" fullWidth className="flex items-center justify-center gap-2">
                  <Handshake size={16} aria-hidden="true" />
                  <span>Nomor Resmi</span>
                </PNButton>
              </a>
              <a href={whatsappChannelUrl} target="_blank" rel="noopener noreferrer" className="block" aria-label="Join WhatsApp Channel (membuka di tab baru)">
                <PNButton variant="ghost" size="md" fullWidth className="flex items-center justify-center gap-2">
                  <MessageCircle size={16} aria-hidden="true" />
                  <span>WA Channel</span>
                </PNButton>
              </a>
            </div>
          </div>
        </div>
      </PNContainer>
    </PNSection>
  );
};

export default React.memo(PNHero);
