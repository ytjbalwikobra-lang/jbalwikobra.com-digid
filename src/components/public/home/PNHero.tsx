import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Rocket, Sparkles, DollarSign, Phone } from 'lucide-react';
import { PNSection, PNContainer, PNHeading, PNText, PNButton } from '../../ui/CyberDesignSystem';
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
  const jualAkunWhatsappUrl = ensureUrlProtocol(settings?.jualAkunWhatsappUrl || 'https://www.alwikobra.com');
  
  // Format WhatsApp number for wa.me link (remove non-digits, ensure no leading 0)
  const whatsappNumber = settings?.whatsappNumber || '6281234567890';
  const cleanWhatsappNumber = whatsappNumber.replace(/\D/g, '').replace(/^0/, '62');
  const whatsappChatUrl = `https://wa.me/${cleanWhatsappNumber}`;
  
  // Use hero settings from admin settings
  const heroTitle = settings?.heroTitle || 'Jual Beli & Rental Akun Game';
  const heroSubtitle = settings?.heroSubtitle || 'Aman, cepat, terpercaya';

  return (
    <PNSection padding="lg">
      <PNContainer>
        <div className="relative overflow-hidden rounded-cyber-2xl sm:rounded-cyber-2xl border border-[var(--cyber-border)] bg-gradient-to-br from-[var(--cyber-bg-pure)] via-[var(--cyber-bg-surface)] to-[var(--cyber-bg-pure)] px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          {/* Animated glow background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-[var(--cyber-pink-muted)] rounded-full blur-[120px] animate-pulse" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-[var(--cyber-pink-subtle)] rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          
          <div className="relative z-10 text-center max-w-xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[var(--cyber-pink-subtle)] border border-[var(--cyber-pink-muted)] rounded-full px-4 py-2 mb-5" role="status">
              <Sparkles size={14} className="text-[var(--cyber-pink-secondary)]" aria-hidden="true" />
              <span className="text-xs font-medium text-[var(--cyber-pink-secondary)] tracking-wide">Trusted by 10K+ Gamers</span>
            </div>
            
            <PNHeading level={1} gradient className="mb-4">{heroTitle}</PNHeading>
            <PNText color="secondary" className="mb-8 text-base sm:text-lg leading-relaxed">{heroSubtitle}</PNText>

            {/* CTAs - Hybrid 4-button layout */}
            <div className="space-y-3" role="navigation" aria-label="Menu utama">
              {/* Primary CTA - Top Up Game */}
              <a href={topupGameUrl} target="_blank" rel="noopener noreferrer" className="block" aria-label="Top Up Semua Game - Murah! (membuka di tab baru)">
                <PNButton variant="primary" size="lg" fullWidth className="flex items-center justify-center gap-2.5">
                  <Rocket size={18} aria-hidden="true" />
                  <span>Top Up Semua Game - Murah!</span>
                </PNButton>
              </a>
              
              {/* Secondary CTAs - 2-column grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Lihat Stok */}
                <Link to="/products" className="block">
                  <PNButton variant="secondary" size="md" fullWidth className="flex items-center justify-center gap-2">
                    <ShoppingBag size={16} aria-hidden="true" />
                    <span>Lihat Stok</span>
                  </PNButton>
                </Link>
                
                {/* Jual Akun */}
                <a href={jualAkunWhatsappUrl} target="_blank" rel="noopener noreferrer" className="block" aria-label="Jual Akun (membuka di tab baru)">
                  <PNButton variant="secondary" size="md" fullWidth className="flex items-center justify-center gap-2">
                    <DollarSign size={16} aria-hidden="true" />
                    <span>Jual Akun</span>
                  </PNButton>
                </a>
              </div>
              
              {/* Tertiary CTA - Nomor Resmi (full width) */}
              <a href={whatsappChatUrl} target="_blank" rel="noopener noreferrer" className="block" aria-label="Nomor Resmi - Chat WhatsApp (membuka di tab baru)">
                <PNButton variant="secondary" size="md" fullWidth className="flex items-center justify-center gap-2">
                  <Phone size={16} aria-hidden="true" />
                  <span>Nomor Resmi</span>
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
