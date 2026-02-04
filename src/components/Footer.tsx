/**
 * Footer - Global footer with Pink Neon Design System
 * ISO 8pt Grid Compliance | WCAG 2.1 AA Accessible | Mobile-First
 * Design: Glass morphism, pink neon accents, gaming aesthetic
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Mail, 
  MessageCircle,
  Heart,
  ChevronRight,
  Zap,
  Headphones,
  Lock
} from 'lucide-react';
import { SettingsService } from '../services/settingsService';
import type { WebsiteSettings } from '../types';

// Footer link sections - centralized configuration
const footerSections = [
  {
    title: 'Belanja',
    links: [
      { label: 'Semua Produk', href: '/products' },
      { label: 'Flash Sale', href: '/flash-sales' },
      { label: 'Game Populer', href: '/products?sort=popular' },
    ]
  },
  {
    title: 'Layanan',
    links: [
      { label: 'Jual Akun', href: '/sell' },
      { label: 'Rekber Aman', href: '/rekber' },
      { label: 'Top Up', href: '/topup' },
    ]
  },
  {
    title: 'Akun',
    links: [
      { label: 'Profil Saya', href: '/profile' },
      { label: 'Pesanan', href: '/orders' },
      { label: 'Wishlist', href: '/wishlist' },
    ]
  },
  {
    title: 'Bantuan',
    links: [
      { label: 'Pusat Bantuan', href: '/help' },
      { label: 'Syarat & Ketentuan', href: '/terms' },
      { label: 'Kebijakan Privasi', href: '/terms#privacy' },
    ]
  },
];

// Trust badges configuration
const trustBadges = [
  { icon: Shield, label: 'Transaksi Aman', color: 'text-green-400' },
  { icon: Headphones, label: '24/7 Support', color: 'text-pink-500' },
  { icon: Lock, label: 'Data Terlindungi', color: 'text-blue-400' },
];

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await SettingsService.get();
        if (mounted) setSettings(data);
      } catch {
        // Silently fail - use defaults
      }
    })();
    return () => { mounted = false; };
  }, []);

  const siteName = settings?.siteName || 'JBalwikobra';
  const whatsappNumber = settings?.contactPhone || '6289653510125';
  const supportEmail = settings?.supportEmail || settings?.contactEmail || 'support@jbalwikobra.com';

  return (
    <footer 
      className="relative bg-[var(--cyber-bg-surface)] border-t border-[var(--cyber-border)] overflow-hidden"
      role="contentinfo"
      aria-label="Footer website"
    >
      {/* Background gradient accent */}
      <div 
        className="absolute inset-0 bg-gradient-to-t from-[var(--cyber-pink-subtle)] via-transparent to-transparent pointer-events-none" 
        aria-hidden="true" 
      />
      
      {/* Trust Badges Bar - Mobile: horizontal scroll, Desktop: centered row */}
      <div className="relative border-b border-[var(--cyber-border)] bg-[var(--cyber-bg-elevated)]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-6 sm:gap-8 lg:gap-12 overflow-x-auto scrollbar-hide">
            {trustBadges.map((badge) => (
              <div 
                key={badge.label} 
                className="flex items-center gap-2 flex-shrink-0"
              >
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <badge.icon className={`w-4 h-4 ${badge.color}`} aria-hidden="true" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-200 whitespace-nowrap">
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        
        {/* Main Grid: Brand + Links - Mobile stacked, Desktop side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* Brand Section - Full width on mobile, 4 cols on desktop */}
          <div className="lg:col-span-4 space-y-6">
            {/* Logo & Name */}
            <Link 
              to="/" 
              className="inline-flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 rounded-xl transition-transform active:scale-[0.98]"
              aria-label={`Kembali ke beranda ${siteName}`}
            >
              <div 
                className="w-12 h-12 bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:shadow-pink-500/40 transition-all duration-300" 
                aria-hidden="true"
              >
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="block text-xl font-bold text-white group-hover:text-pink-200 transition-colors">
                  {siteName}
                </span>
                <span className="block text-xs text-[var(--cyber-text-muted)] font-medium">
                  Game Account Marketplace
                </span>
              </div>
            </Link>
            
            {/* Tagline */}
            <p className="text-sm text-[var(--cyber-text-secondary)] leading-relaxed max-w-xs">
              Platform terpercaya untuk jual beli akun game. Transaksi aman, proses cepat, harga terjangkau.
            </p>

            {/* Contact Buttons - Styled as pill buttons */}
            <div className="flex flex-wrap gap-3">
              <a 
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/30 rounded-xl text-sm font-medium text-green-300 hover:bg-green-500/20 hover:border-green-500/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 active:scale-[0.98]"
                aria-label="Hubungi via WhatsApp"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>WhatsApp</span>
              </a>
              <a 
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-500/10 border border-pink-500/30 rounded-xl text-sm font-medium text-pink-300 hover:bg-pink-500/20 hover:border-pink-500/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 active:scale-[0.98]"
                aria-label={`Email ke ${supportEmail}`}
              >
                <Mail className="w-4 h-4" aria-hidden="true" />
                <span>Email</span>
              </a>
            </div>
          </div>

          {/* Links Sections - 8 cols on desktop, 2x2 grid on mobile/tablet */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
              {footerSections.map((section) => (
                <nav 
                  key={section.title} 
                  aria-labelledby={`footer-${section.title.toLowerCase().replace(/\s+/g, '-')}`}
                  className="space-y-4"
                >
                  <h3 
                    id={`footer-${section.title.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-sm font-bold text-white tracking-wide uppercase"
                  >
                    {section.title}
                  </h3>
                  <ul className="space-y-3" role="list">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          to={link.href}
                          className="group inline-flex items-center gap-1.5 text-sm text-[var(--cyber-text-secondary)] hover:text-pink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60 rounded-md"
                        >
                          <ChevronRight 
                            className="w-3 h-3 text-[var(--cyber-text-muted)] group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all" 
                            aria-hidden="true" 
                          />
                          <span>{link.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar - Copyright & Made with love */}
      <div className="relative border-t border-white/5 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Copyright */}
            <p className="text-xs sm:text-sm text-[var(--cyber-text-muted)] text-center sm:text-left order-2 sm:order-1">
              © {currentYear} {siteName}. All rights reserved.
            </p>

            {/* Made with love */}
            <p className="text-xs sm:text-sm text-[var(--cyber-text-muted)] flex items-center gap-1.5 order-1 sm:order-2">
              <span>Made with</span>
              <Heart 
                className="w-3.5 h-3.5 text-pink-500 animate-pulse" 
                fill="currentColor"
                aria-hidden="true" 
              />
              <span className="sr-only">cinta</span>
              <span>in Indonesia</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default React.memo(Footer);
