import React, { useEffect, useState } from 'react';
import { BannerService } from '../services/bannerService';
import type { Banner } from '../types';

interface Slide {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
}

// Convert Banner to Slide
const bannerToSlide = (banner: Banner): Slide => ({
  id: banner.id,
  image: banner.image_url,
  title: banner.title,
  subtitle: banner.subtitle || undefined,
  ctaLink: banner.link_url || undefined,
  ctaText: banner.link_url ? 'Lihat Detail' : undefined,
});

// Default fallback slides
const defaultSlides: Slide[] = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1602367289840-74b3dfb3d7e8?w=1200',
    title: 'Flash Sale Setiap Hari',
    subtitle: 'Diskon hingga 70% untuk akun terpilih',
    ctaText: 'Lihat Flash Sale',
    ctaLink: '/flash-sales'
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=1200',
    title: 'Koleksi Akun Premium',
    subtitle: 'Akun terverifikasi kualitas terbaik',
    ctaText: 'Jelajahi Katalog',
    ctaLink: '/products'
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200',
    title: 'Rental Akun Mudah',
    subtitle: 'Sewa akun favorit sesuai kebutuhan',
    ctaText: 'Mulai Rental',
    ctaLink: '/products'
  }
];

type Props = { slides?: Slide[] };

const BannerCarousel: React.FC<Props> = ({ slides }) => {
  const [index, setIndex] = useState(0);
  const [dbSlides, setDbSlides] = useState<Slide[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load banners from enhanced service
  useEffect(() => {
    let mounted = true;
    
    const loadBanners = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const banners = await BannerService.list();
        const activeBanners = banners.filter(b => b.is_active);
        
        if (mounted) {
          // Convert banners to slides using the converter function
          const convertedSlides = activeBanners.map(bannerToSlide);
          
          setDbSlides(convertedSlides.length > 0 ? convertedSlides : []);
        }
      } catch (err: any) {
        console.error('Failed to load banners:', err);
        if (mounted) {
          setError(err.message || 'Gagal memuat banner');
          setDbSlides([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadBanners();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Determine which slides to show - prioritize DB slides always
  const resolvedSlides = dbSlides !== null
    ? dbSlides // Always use DB slides even if empty
    : (slides && slides.length > 0 ? slides : defaultSlides);

  // Production: removed verbose slide logging

  const count = Math.min(resolvedSlides.length, 3);

  // Auto-rotate slides
  useEffect(() => {
    if (count <= 1) return;
    
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(id);
  }, [count]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div 
          className="relative rounded-2xl overflow-hidden shadow-xl border border-pink-500/30"
          role="status"
          aria-busy="true"
          aria-label="Memuat banner"
        >
          <div className="w-full aspect-[3/2] flex items-center justify-center">
            <span className="sr-only">Memuat banner promosi...</span>
            <div className="ios-skeleton w-[92%] h-[85%] rounded-xl" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div 
          className="relative rounded-2xl overflow-hidden shadow-xl border border-red-500/30"
          role="alert"
          aria-live="assertive"
        >
          <div className="w-full aspect-[3/2] bg-red-900/20 flex items-center justify-center">
            <div className="text-red-300 text-center p-4">
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-red-200 hover:text-red-100 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-md px-2 py-1"
                aria-label="Muat ulang halaman untuk mencoba lagi"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (count === 0) return null;

  const handlePrevious = () => setIndex((i) => (i - 1 + count) % count);
  const handleNext = () => setIndex((i) => (i + 1) % count);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div 
        className="relative rounded-2xl overflow-hidden shadow-xl border border-pink-500/30 ring-1 ring-black/5"
        role="region"
        aria-roledescription="carousel"
        aria-label="Banner promosi"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Sliding container */}
        <div className="relative w-full aspect-[3/2] overflow-hidden" aria-live="polite" aria-atomic="true">
        <div 
          className="flex transition-transform duration-500 ease-in-out h-full"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {resolvedSlides.slice(0, count).map((slide, i) => (
            <div key={slide.id} className="relative w-full flex-shrink-0 h-full">
              <img
                src={slide.image}
                alt={slide.title || 'Banner promosi'}
                className="absolute inset-0 w-full h-full object-cover ios-image"
                onError={(e) => {
                  console.error('Banner image failed to load:', slide.image);
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1602367289840-74b3dfb3d7e8?w=1200&h=800&fit=crop';
                }}
              />

              {/* iOS-compatible gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" aria-hidden="true" />

              {/* Content with iOS safe area support */}
              <div className="absolute inset-0 p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-end ios-safe-area">
                {(slide.title || slide.subtitle) && (
                  <div className="text-white max-w-full sm:max-w-md lg:max-w-xl">
                    {slide.title && (
                      <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 leading-tight drop-shadow-lg">
                        {slide.title}
                      </h3>
                    )}
                    {slide.subtitle && (
                      <p className="text-white/95 mb-2 sm:mb-3 md:mb-4 text-sm sm:text-base leading-snug drop-shadow-md">
                        {slide.subtitle}
                      </p>
                    )}
                    {slide.ctaText && slide.ctaLink && (
                      <a 
                        href={slide.ctaLink} 
                        className="cyber-btn cyber-btn-primary px-4 sm:px-5 md:px-6 shadow-lg hover:shadow-xl active:scale-95"
                        aria-label={`${slide.ctaText} - ${slide.title || 'banner'}`}
                        tabIndex={i === index ? 0 : -1}
                      >
                        {slide.ctaText}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Indicators */}
      {count > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10" role="group" aria-label="Navigasi banner">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
                i === index 
                  ? 'bg-pink-500 w-6' 
                  : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Lihat banner ${i + 1}`}
              aria-current={i === index ? 'true' : 'false'}
            />
          ))}
        </div>
      )}
    </div>
  </div>
  );
};

export default BannerCarousel;
