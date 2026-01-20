// Font optimization and preloading utilities
interface FontDescriptor {
  family: string;
  weight: string | number;
  style?: 'normal' | 'italic';
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  unicode?: string; // Unicode range for subsetting
}

class FontOptimizer {
  private static loadedFonts = new Set<string>();
  private static preloadedFonts = new Set<string>();

  // Critical fonts to preload immediately
  static readonly CRITICAL_FONTS: FontDescriptor[] = [
    { family: 'Inter', weight: 400, display: 'swap' },
    { family: 'Inter', weight: 600, display: 'swap' },
    { family: 'Inter', weight: 700, display: 'swap' }
  ];

  // Non-critical fonts to load lazily (disabled to prevent errors)
  static readonly OPTIONAL_FONTS: FontDescriptor[] = [
    // Temporarily disabled to prevent font loading errors
    // { family: 'Inter', weight: 500, display: 'optional' }
  ];

  // Preload critical fonts (disabled to prevent preload warnings)
  static preloadCriticalFonts(): void {
    // Disabled to prevent "resource was preloaded but not used" warnings
    // Fonts will load naturally through CSS
    return;
  }

  // Preload a specific font
  static preloadFont(font: FontDescriptor): void {
    const fontKey = `${font.family}-${font.weight}-${font.style || 'normal'}`;
    
    if (this.preloadedFonts.has(fontKey)) return;

    try {
      // Create preload link with better error handling
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      
      // Add error handling to prevent console warnings
      link.onerror = () => {
        console.warn(`Failed to preload font: ${fontKey}`);
        // Remove the failed link to prevent repeated attempts
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      };
      
      // Generate font URL
      const fontUrl = this.generateFontUrl(font);
      link.href = fontUrl;

      document.head.appendChild(link);
      this.preloadedFonts.add(fontKey);
    } catch (error) {
      console.warn(`Error preloading font ${fontKey}:`, error);
    }
  }

  // Generate optimized font URL
  private static generateFontUrl(font: FontDescriptor): string {
    // For Google Fonts with proper URL encoding
    const baseUrl = 'https://fonts.googleapis.com/css2';
    const params = new URLSearchParams();
    
    // Properly encode the font family and weight specification
    const fontSpec = `${encodeURIComponent(font.family)}:wght@${font.weight}`;
    params.set('family', fontSpec);
    params.set('display', font.display || 'swap');
    
    if (font.unicode) {
      params.set('subset', font.unicode);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  // Load font with Font Loading API
  static async loadFont(font: FontDescriptor): Promise<void> {
    const fontKey = `${font.family}-${font.weight}-${font.style || 'normal'}`;
    
    if (this.loadedFonts.has(fontKey)) return;

    if ('FontFace' in window) {
      try {
        const fontFace = new FontFace(
          font.family,
          `url(${this.generateFontUrl(font)})`,
          {
            weight: font.weight.toString(),
            style: font.style || 'normal',
            display: font.display || 'swap'
          }
        );

        await fontFace.load();
        const docAny: any = document as any;
        if (docAny.fonts && typeof docAny.fonts.add === 'function') {
          docAny.fonts.add(fontFace);
        }
        this.loadedFonts.add(fontKey);
      } catch (error) {
        console.warn(`Failed to load font ${fontKey}:`, error);
      }
    }
  }

  // Load non-critical fonts after page load
  static loadOptionalFonts(): void {
    if (document.readyState === 'complete') {
      this.OPTIONAL_FONTS.forEach(font => {
        this.loadFont(font);
      });
    } else {
      window.addEventListener('load', () => {
        this.OPTIONAL_FONTS.forEach(font => {
          this.loadFont(font);
        });
      });
    }
  }

  // Generate CSS with font fallbacks
  static generateFontCSS(): string {
    return `
      /* Font face declarations with optimized fallbacks */
      .font-primary {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Helvetica Neue', sans-serif;
        font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1, 'pnum' 1, 'tnum' 0, 'onum' 1, 'lnum' 0, 'dlig' 0;
      }

      /* Font loading states */
      .font-loading .font-primary {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      }

      .font-loaded .font-primary {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      }

      /* Critical font weights */
      .font-normal { font-weight: 400; }
      .font-semibold { font-weight: 600; }
      .font-bold { font-weight: 700; }

      /* Optional font weights (loaded later) */
      .font-light { font-weight: 300; }
      .font-extrabold { font-weight: 800; }
      .font-black { font-weight: 900; }
    `;
  }

  // Measure font loading performance
  static measureFontPerformance(): void {
    const docAny: any = document as any;
    if (docAny.fonts && typeof docAny.fonts.addEventListener === 'function') {
      docAny.fonts.addEventListener('loadingdone', () => {
      });

      docAny.fonts.addEventListener('loadingerror', (e: any) => {
        console.warn('Font loading error:', e);
      });
    }
  }

  // Detect if fonts are loaded
  static async waitForFonts(timeout = 3000): Promise<boolean> {
  const docAny: any = document as any;
  if (!docAny.fonts) return true;

    try {
      await Promise.race([
  docAny.fonts.ready,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Font loading timeout')), timeout)
        )
      ]);
      return true;
    } catch (error) {
      console.warn('Font loading timed out:', error);
      return false;
    }
  }
}

// Auto-initialize font optimization
if (typeof window !== 'undefined') {
  // Preload critical fonts immediately
  FontOptimizer.preloadCriticalFonts();
  
  // Load optional fonts after page load
  FontOptimizer.loadOptionalFonts();
  
  // Add font loading class management
  document.documentElement.classList.add('font-loading');
  
  FontOptimizer.waitForFonts().then(() => {
    document.documentElement.classList.remove('font-loading');
    document.documentElement.classList.add('font-loaded');
  });
}

export { FontOptimizer };
