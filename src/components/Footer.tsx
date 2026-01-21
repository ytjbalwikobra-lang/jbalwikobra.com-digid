/**
 * Footer - Unified footer component using PinkNeonDesignSystem
 * Features: Compact design, WCAG 2.1 AA compliant, responsive layout
 * Reduced from 433 lines to ~180 lines - no duplicate logic
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Mail, 
  MessageCircle,
  Heart
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
      className="bg-gray-950 border-t border-white/10"
      role="contentinfo"
      aria-label="Footer website"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Main Grid: Brand + Links */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <Link 
              to="/" 
              className="flex items-center gap-2 mb-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 rounded-lg"
              aria-label={`Kembali ke beranda ${siteName}`}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-pink-500/25 transition-all" aria-hidden="true">
                <span className="text-white font-bold text-sm">JB</span>
              </div>
              <span className="text-lg font-bold text-white group-hover:text-pink-300 transition-colors">
                {siteName}
              </span>
            </Link>
            
            <p className="text-sm text-gray-300 leading-relaxed mb-4">
              Platform terpercaya jual beli akun game. Aman, cepat, dan terjangkau.
            </p>

            {/* Contact Quick Links */}
            <div className="space-y-2">
              <a 
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-pink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60 rounded-md"
                aria-label="Hubungi via WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-green-400" aria-hidden="true" />
                <span>WhatsApp Support</span>
              </a>
              <a 
                href={`mailto:${supportEmail}`}
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-pink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60 rounded-md"
                aria-label={`Email ke ${supportEmail}`}
              >
                <Mail className="w-4 h-4 text-pink-400" aria-hidden="true" />
                <span>{supportEmail}</span>
              </a>
            </div>
          </div>

          {/* Links Sections */}
          <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {footerSections.map((section) => (
              <nav key={section.title} aria-labelledby={`footer-${section.title.toLowerCase()}`}>
                <h3 
                  id={`footer-${section.title.toLowerCase()}`}
                  className="font-semibold text-white text-sm mb-3"
                >
                  {section.title}
                </h3>
                <ul className="space-y-2" role="list">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="text-sm text-gray-300 hover:text-pink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60 rounded-sm inline-block"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* Divider & Bottom Section */}
        <div className="border-t border-white/10 mt-8 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Trust Badges */}
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-green-400" aria-hidden="true" />
                <span>Transaksi Aman</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-pink-400 font-bold">24/7</span>
                <span>Support</span>
              </div>
            </div>

            {/* Copyright */}
            <div className="text-xs text-gray-400 text-center sm:text-right">
              <p>
                © {currentYear} {siteName}. All rights reserved.
              </p>
              <p className="mt-0.5">
                Made with <Heart className="w-3 h-3 text-pink-400 inline mx-0.5" aria-hidden="true" /> 
                <span className="sr-only">cinta</span> in Indonesia
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default React.memo(Footer);
