import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Instagram, 
  Twitter, 
  Youtube, 
  Mail, 
  Phone, 
  MapPin, 
  Heart,
  ChevronRight,
  Zap
} from 'lucide-react';
import { PNContainer } from '../../ui/CyberDesignSystem';
import { SettingsService } from '../../../services/settingsService';
import type { WebsiteSettings } from '../../../types';

const columns = [
  {
    title: 'Produk',
    links: [
      { label: 'Semua Produk', href: '/products' },
      { label: 'Flash Sale', href: '/flash-sales' },
      { label: 'Kategori', href: '/products?category=all' },
      { label: 'Terlaris', href: '/products?sort=popular' },
    ],
  },
  {
    title: 'Akun & Layanan',
    links: [
      { label: 'Profil', href: '/profile' },
      { label: 'Wishlist', href: '/wishlist' },
      { label: 'Riwayat Pesanan', href: '/orders' },
    ],
  },
  {
    title: 'Bantuan & Info',
    links: [
      { label: 'Pusat Bantuan', href: '/help' },
      { label: 'Metode Pembayaran', href: '/help#payment' },
      { label: 'Kebijakan Privasi', href: '/terms#privacy' },
      { label: 'Syarat & Ketentuan', href: '/terms' },
    ],
  },
  {
    title: 'Komunitas',
    links: [
      { label: 'Feed Komunitas', href: '/feed' },
      { label: 'Forum', href: '/community' },
      { label: 'Instagram', href: 'https://instagram.com', external: true },
      { label: 'YouTube', href: 'https://youtube.com', external: true },
    ],
  },
];

const socials = [
  { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: Youtube, href: 'https://youtube.com', label: 'YouTube' },
];

const PNFooter: React.FC = () => {
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await SettingsService.get();
        if (mounted) setSettings(data);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Build dynamic social links from settings - memoized to avoid recreating on every render
  const socialsToDisplay = useMemo(() => {
    const dynamicSocials = [
      settings?.instagramUrl && { icon: Instagram, href: settings.instagramUrl, label: 'Instagram' },
      settings?.twitterUrl && { icon: Twitter, href: settings.twitterUrl, label: 'Twitter' },
      settings?.youtubeUrl && { icon: Youtube, href: settings.youtubeUrl, label: 'YouTube' },
    ].filter(Boolean) as Array<{ icon: React.ComponentType<any>; href: string; label: string }>;

    // Fallback to default socials if no settings available
    return dynamicSocials.length > 0 ? dynamicSocials : socials;
  }, [settings?.instagramUrl, settings?.twitterUrl, settings?.youtubeUrl]);

  const siteName = settings?.siteName || 'JBalwikobra';
  const supportEmail = settings?.supportEmail || 'support@jbalwikobra.com';
  const contactPhone = settings?.contactPhone || '+62 812-3456-7890';
  const address = settings?.address || 'Jakarta, Indonesia';

  return (
    <footer 
      className="relative mt-8 border-t border-white/10 bg-[var(--cyber-bg-pure)] overflow-hidden"
      role="contentinfo"
      aria-label="Footer website"
    >
      {/* Background gradient accent */}
      <div 
        className="absolute inset-0 bg-gradient-to-t from-[var(--cyber-pink-subtle)] via-transparent to-transparent pointer-events-none" 
        aria-hidden="true" 
      />

      {/* Main Footer Content */}
      <PNContainer className="relative px-4 py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* Brand Section */}
          <div className="lg:col-span-4 space-y-6">
            {/* Logo & Name */}
            <Link 
              to="/" 
              className="inline-flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyber-pink-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cyber-bg-pure)] rounded-cyber-lg transition-transform active:scale-[0.98]"
              aria-label={`Kembali ke beranda ${siteName}`}
            >
              {settings?.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt={`Logo ${siteName}`} 
                  className="w-12 h-12 rounded-cyber-2xl ring-1 ring-[var(--cyber-border)] group-hover:ring-[var(--cyber-pink-muted)] transition-all shadow-lg" 
                />
              ) : (
                <div 
                  className="w-12 h-12 bg-gradient-to-br from-[var(--cyber-pink-primary)] via-[var(--cyber-pink-glow)] to-[var(--cyber-purple)] rounded-cyber-2xl flex items-center justify-center shadow-lg shadow-[var(--cyber-pink-muted)] group-hover:shadow-[var(--cyber-pink-muted)] transition-all duration-300" 
                  aria-hidden="true"
                >
                  <Zap className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <span className="block text-xl font-bold text-white group-hover:text-pink-200 transition-colors">
                  {siteName}
                </span>
                <span className="block text-xs text-[var(--cyber-text-muted)] font-medium">
                  Digital Game Store
                </span>
              </div>
            </Link>
            
            {/* Tagline */}
            <p className="text-sm text-[var(--cyber-text-secondary)] leading-relaxed max-w-xs">
              Toko digital terpercaya untuk akun game premium, item, dan layanan instan.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <a 
                href={`mailto:${supportEmail}`}
                className="flex items-center gap-3 text-sm text-[var(--cyber-text-secondary)] hover:text-[var(--cyber-pink-secondary)] transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded-md"
                aria-label={`Email ke ${supportEmail}`}
              >
                <div className="w-8 h-8 rounded-xl bg-[var(--cyber-pink-subtle)] border border-[var(--cyber-pink-muted)] flex items-center justify-center group-hover:bg-[var(--cyber-pink-muted)] transition-colors">
                  <Mail className="w-4 h-4 text-[var(--cyber-pink-secondary)]" aria-hidden="true" />
                </div>
                <span>{supportEmail}</span>
              </a>
              <a 
                href={`tel:${contactPhone.replace(/\s+/g, '')}`}
                className="flex items-center gap-3 text-sm text-[var(--cyber-text-secondary)] hover:text-green-300 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 rounded-md"
                aria-label={`Telepon ${contactPhone}`}
              >
                <div className="w-8 h-8 rounded-cyber-lg bg-[var(--cyber-success)]/10 border border-[var(--cyber-success)]/20 flex items-center justify-center group-hover:bg-[var(--cyber-success)]/20 transition-colors">
                  <Phone className="w-4 h-4 text-[var(--cyber-success)]" aria-hidden="true" />
                </div>
                <span>{contactPhone}</span>
              </a>
              <div className="flex items-center gap-3 text-sm text-[var(--cyber-text-secondary)]">
                <div className="w-8 h-8 rounded-cyber-lg bg-[var(--cyber-info)]/10 border border-[var(--cyber-info)]/20 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-[var(--cyber-info)]" aria-hidden="true" />
                </div>
                <span>{address}</span>
              </div>
            </div>

            {/* Social Links */}
            {(settings?.socialMediaEnabled ?? true) && (
              <div className="flex items-center gap-2 pt-2">
                {socialsToDisplay.map(({ icon: Icon, href, label }) => (
                  <a 
                    key={href} 
                    href={href} 
                    target="_blank" 
                    rel="noopener noreferrer nofollow" 
                    className="w-10 h-10 rounded-cyber-lg bg-[var(--cyber-bg-elevated)] border border-[var(--cyber-border)] flex items-center justify-center text-[var(--cyber-text-muted)] hover:text-[var(--cyber-text-primary)] hover:bg-[var(--cyber-bg-card)] hover:border-[var(--cyber-border-hover)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyber-pink-primary)] active:scale-[0.95]"
                    aria-label={label}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Links Sections */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
              {columns.map((col) => (
                <nav 
                  key={col.title} 
                  aria-labelledby={`footer-${col.title.toLowerCase().replace(/\s+/g, '-')}`}
                  className="space-y-4"
                >
                  <h3 
                    id={`footer-${col.title.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-sm font-bold text-white tracking-wide"
                  >
                    {col.title}
                  </h3>
                  <ul className="space-y-3" role="list">
                    {col.links.map((link) => (
                      <li key={`${col.title}-${link.label}`}>
                        {link.external ? (
                          <a 
                            href={link.href} 
                            target="_blank" 
                            rel="noopener noreferrer nofollow" 
                            className="group inline-flex items-center gap-1.5 text-sm text-[var(--cyber-text-secondary)] hover:text-pink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/60 rounded-md"
                          >
                            <ChevronRight 
                              className="w-3 h-3 text-[var(--cyber-text-muted)] group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all" 
                              aria-hidden="true" 
                            />
                            <span>{link.label}</span>
                          </a>
                        ) : (
                          <Link 
                            to={link.href} 
                            className="group inline-flex items-center gap-1.5 text-sm text-[var(--cyber-text-secondary)] hover:text-[var(--cyber-pink-secondary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/60 rounded-md"
                          >
                            <ChevronRight 
                              className="w-3 h-3 text-[var(--cyber-text-muted)] group-hover:text-[var(--cyber-pink-secondary)] group-hover:translate-x-0.5 transition-all" 
                              aria-hidden="true" 
                            />
                            <span>{link.label}</span>
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>
        </div>
      </PNContainer>

      {/* Bottom Bar */}
      <div className="relative border-t border-white/10 bg-gradient-to-r from-[var(--cyber-bg-pure)] via-[var(--cyber-bg-surface)] to-[var(--cyber-bg-pure)]">
        <PNContainer className="px-4 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Copyright - Left side */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 order-2 sm:order-1">
              <p className="text-sm text-[var(--cyber-text-secondary)] font-medium">
                © {year} <span className="text-[var(--cyber-pink-secondary)]">{siteName}</span>
              </p>
              <span className="hidden sm:inline text-white/20">|</span>
              <p className="text-xs text-[var(--cyber-text-muted)]">
                All rights reserved.
              </p>
            </div>

            {/* Center - Made with love (visible on all sizes) */}
            <div className="flex items-center gap-1.5 text-sm text-[var(--cyber-text-secondary)] order-1 sm:order-2">
              <span>Made with</span>
              <Heart 
                className="w-4 h-4 text-[var(--cyber-pink-primary)] animate-pulse" 
                fill="currentColor"
                aria-hidden="true" 
              />
              <span className="sr-only">cinta</span>
              <span>in</span>
              <span className="font-semibold text-white">Indonesia</span>
            </div>

            {/* Right - Links */}
            <div className="flex items-center gap-4 text-sm order-3">
              <Link 
                to="/terms" 
                className="text-[var(--cyber-text-muted)] hover:text-[var(--cyber-pink-secondary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded-sm"
              >
                Syarat
              </Link>
              <span className="text-white/20">•</span>
              <Link 
                to="/terms#privacy" 
                className="text-[var(--cyber-text-muted)] hover:text-[var(--cyber-pink-secondary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded-sm"
              >
                Privasi
              </Link>
            </div>
          </div>
        </PNContainer>
      </div>
    </footer>
  );
};

export default PNFooter;
