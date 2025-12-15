import { supabase } from './supabase';
import { deletePublicUrls } from './storageService';
import { Product, FlashSale, Tier, GameTitle, ProductTier } from '../types';

// Global cache for ProductService
const g = globalThis as any;
g._productServiceCache = g._productServiceCache || new Map();

// Capability detection: whether DB exposes relations (tiers/game_titles) in products
// Track database capabilities globally
let hasRelations: boolean | null = null; // null = unknown, true = supports relations, false = legacy schema
let hasFlashSaleJoin: boolean | null = null;
// game_title legacy text column fully removed from schema – purge any adaptive logic
function isUuid(v?: string | null) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

// Sample data untuk development/testing
const sampleTiers: Tier[] = [
  {
    id: '1',
    name: 'Reguler',
    slug: 'reguler',
    description: 'Akun standar untuk pemula',
  color: '#C0C0C0',
  borderColor: '#D1D5DB',
  backgroundGradient: 'from-zinc-400 to-neutral-500',
    icon: 'Trophy',
    priceRangeMin: 0,
    priceRangeMax: 500000,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Pelajar',
    slug: 'pelajar',
    description: 'Akun premium untuk pelajar',
    color: '#3b82f6',
    borderColor: '#60a5fa',
    backgroundGradient: 'from-blue-500 to-indigo-600',
    icon: 'Users',
    priceRangeMin: 500000,
    priceRangeMax: 2000000,
    isActive: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Premium',
    slug: 'premium',
    description: 'Akun premium terbaik',
    color: '#f59e0b',
    borderColor: '#fbbf24',
    backgroundGradient: 'from-amber-500 to-orange-600',
    icon: 'Crown',
    priceRangeMin: 2000000,
    isActive: true,
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const sampleGameTitles: GameTitle[] = [
  {
    id: '1',
    name: 'Mobile Legends',
    slug: 'mobile-legends',
    description: 'MOBA terpopuler di Indonesia',
    icon: 'Sword',
    color: '#10b981',
    isPopular: true,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'PUBG Mobile',
    slug: 'pubg-mobile',
    description: 'Battle Royale terpopuler',
    icon: 'Target',
    color: '#dc2626',
    isPopular: true,
    isActive: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Free Fire',
    slug: 'free-fire',
    description: 'Battle Royale ringan',
    icon: 'Zap',
    color: '#ea580c',
    isPopular: true,
    isActive: true,
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const sampleProducts: Product[] = [
  {
    id: '1',
    name: 'Akun ML Sultan Mythic Glory 1000 Points',
    description: 'Akun Mobile Legends dengan rank Mythic Glory 1000 points. Semua hero unlocked, 500+ skin epic/legend. Akun aman dan terpercaya.',
    price: 2500000,
    originalPrice: 3000000,
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400',
    images: ['https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400'],
    tierId: '3',
    gameTitleId: '1',
    tierData: sampleTiers[2],
    gameTitleData: sampleGameTitles[0],
  categoryId: 'sample-cat-1',
    isFlashSale: true,
    flashSaleEndTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    hasRental: true,
    rentalOptions: [
      { id: '1', duration: '1 Hari', price: 150000, description: 'Akses full 24 jam' },
      { id: '2', duration: '3 Hari', price: 400000, description: 'Akses 3x24 jam + bonus coaching' },
    ],
    stock: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Akun PUBG Mobile Conqueror Asia',
    description: 'Akun PUBG Mobile rank Conqueror server Asia. KD ratio 4.5, tier rewards lengkap, senjata mythic tersedia.',
    price: 1800000,
    originalPrice: 2200000,
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400',
    images: ['https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400'],
    tierId: '2',
    gameTitleId: '2',
    tierData: sampleTiers[1],
    gameTitleData: sampleGameTitles[1],
  categoryId: 'sample-cat-1',
    isFlashSale: false,
    hasRental: true,
    rentalOptions: [
      { id: '3', duration: '1 Hari', price: 120000, description: 'Akses ranked full' },
      { id: '4', duration: '3 Hari', price: 300000, description: 'Main sepuasnya 3 hari' },
    ],
    stock: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Akun Free Fire Grandmaster Ranked',
    description: 'Akun Free Fire Grandmaster dengan koleksi bundle lengkap. Pet maxed, gun skin rare, character unlocked semua.',
    price: 800000,
    originalPrice: 1000000,
    image: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400',
    images: ['https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400'],
    tierId: '2',
    gameTitleId: '3',
    tierData: sampleTiers[1],
    gameTitleData: sampleGameTitles[2],
  categoryId: 'sample-cat-1',
    isFlashSale: true,
    flashSaleEndTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    hasRental: false,
    stock: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class ProductService {
  // Invalidate category related caches
  static invalidateCategoryCache() {
    try {
      g._productServiceCache.delete('categories_simple');
      g._productServiceCache.delete('categories_detailed');
    } catch (_) { /* ignore */ }
  }
  // Force reset of capability detection - useful after schema changes
  static resetCapabilities() {
    hasRelations = null;
    hasFlashSaleJoin = null;
    console.log('🔄 ProductService capabilities reset');
  }

  // Test and detect current schema capabilities
  static async detectSchemaCapabilities(): Promise<{
    hasRelationalSchema: boolean;
    hasRentalOptions: boolean;
    hasFlashSales: boolean;
  }> {
    if (!supabase) {
      return { hasRelationalSchema: false, hasRentalOptions: false, hasFlashSales: false };
    }

  const capabilities = {
      hasRelationalSchema: false,
      hasRentalOptions: false,
      hasFlashSales: false
    };

    try {
      // Test relational schema
      const { data, error } = await supabase
        .from('products')
        .select('id, game_title_id, tier_id')
        .limit(1);

      if (!error) {
        capabilities.hasRelationalSchema = true;
        hasRelations = true;
        console.log('✅ Relational schema detected');
      } else {
        hasRelations = false;
        console.log('⚠️ Legacy schema detected');
      }

  // Legacy products.game_title text column has been dropped – no detection needed

      // Test rental options
      const { error: rentalError } = await supabase
        .from('rental_options')
        .select('id')
        .limit(1);

      if (!rentalError) {
        capabilities.hasRentalOptions = true;
        console.log('✅ Rental options table available');
      }

      // Test flash sales
      const { error: flashError } = await supabase
        .from('flash_sales')
        .select('id')
        .limit(1);

      if (!flashError) {
        capabilities.hasFlashSales = true;
        console.log('✅ Flash sales table available');
      }

    } catch (error) {
      console.error('🔥 Schema detection failed:', error);
    }

    return capabilities;
  }

  static async getAllProducts(opts?: { includeArchived?: boolean }): Promise<Product[]> {
    try {
      // Check if Supabase is configured
      if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
        console.warn('Supabase not configured, using sample data');
        return sampleProducts;
      }

      if (!supabase) return sampleProducts;

      // If we already know relations are unsupported, skip relational select entirely
      if (hasRelations === false) {
        throw new Error('REL_SKIP');
      }
      let query = supabase
        .from('products')
        .select(`
          *,
          rental_options (*),
          tiers (
            id, name, slug, description, color, border_color, 
            background_gradient, icon, price_range_min, price_range_max,
            is_active, sort_order, created_at, updated_at
          ),
          game_titles (
            id, name, slug, description, icon, color,
            logo_url, is_popular, is_active, sort_order, created_at, updated_at
          ),
          categories!fk_products_category (
            id, name, slug, description, icon, color, is_active, sort_order
          )
        `);
      if (!opts?.includeArchived) {
        // Hide archived/inactive products from public lists
        query = (query as any).eq('is_active', true).is('archived_at', null);
      }
      const { data, error } = await (query as any).order('created_at', { ascending: false });

      if (!error && data) {
        hasRelations = true;
        return data.map((product: any) => {
          const cat = product.categories;
          return {
            ...product,
            isActive: product.is_active ?? product.isActive,
            archivedAt: product.archived_at ?? product.archivedAt,
            rentalOptions: product.rental_options || [],
            hasRental: product.has_rental ?? product.hasRental ?? ((product.rental_options || []).length > 0),
            tierData: product.tiers,
            gameTitleData: product.game_titles,
            categoryData: cat ? {
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              description: cat.description,
              icon: cat.icon,
              color: cat.color,
              isActive: cat.is_active ?? cat.isActive,
              sortOrder: cat.sort_order ?? cat.sortOrder,
            } : undefined,
            categoryId: cat?.id || product.category_id || product.categoryId,
            // tier string removed
            // legacy gameTitle removed
          };
        });
      }

      if (error && (error as any).message !== 'REL_SKIP') {
        console.warn('Products relational select failed, trying basic select');
      }
      let q2: any = supabase.from('products').select('id, name, description, price, original_price, image, images, category_id, tier_id, game_title_id, is_flash_sale, flash_sale_end_time, has_rental, stock, is_active, archived_at, created_at, updated_at');
      if (!opts?.includeArchived) {
        q2 = q2.eq('is_active', true).is('archived_at', null);
      }
      const { data: basic, error: err2 } = await q2.order('created_at', { ascending: false });
      if (err2) {
        console.error('Supabase error (basic products):', err2);
        return sampleProducts;
      }
      // Attempt to enrich with category names via categories table if category_id present
      const allCatIds = Array.from(new Set((basic || []).map((p: any) => p.category_id).filter(Boolean)));
      const categoriesMap = new Map<string, any>();
      if (allCatIds.length) {
        try {
          const { data: cats } = await supabase.from('categories').select('id, name, slug, description, icon, color, is_active, sort_order').in('id', allCatIds);
          for (const c of cats || []) categoriesMap.set(c.id, c);
        } catch (_) { /* ignore */ }
      }
      hasRelations = false;
  // Fetch rental options separately
  const rentalsByProduct = new Map<string, any[]>();
      try {
        const ids = (basic || []).map((p: any) => p.id);
        if (ids.length) {
          const { data: ros } = await supabase.from('rental_options').select('id, product_id, duration, price, description').in('product_id', ids);
          for (const ro of ros || []) {
            const arr = rentalsByProduct.get(ro.product_id) || [];
            arr.push(ro);
            rentalsByProduct.set(ro.product_id, arr);
          }
        }
      } catch (e) {
        // Ignore rental options fetch failure; proceed with base products
        if (process.env.NODE_ENV === 'development') {
          console.debug('rental_options fetch failed (non-fatal):', e);
        }
      }
  return (basic || []).map((p: any) => {
        const cat = categoriesMap.get(p.category_id);
        return {
          ...p,
          isActive: p.is_active ?? p.isActive,
          archivedAt: p.archived_at ?? p.archivedAt,
          rentalOptions: rentalsByProduct.get(p.id) || [],
          hasRental: p.has_rental ?? p.hasRental ?? ((rentalsByProduct.get(p.id) || []).length > 0),
          categoryId: p.category_id || p.categoryId,
          categoryData: cat ? {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            icon: cat.icon,
            color: cat.color,
            isActive: cat.is_active ?? cat.isActive,
            sortOrder: cat.sort_order ?? cat.sortOrder,
          } : undefined,
        };
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      console.warn('Using sample data due to error');
      return sampleProducts;
    }
  }

  static async getProductById(id: string): Promise<Product | null> {
    try {
      console.log('[ProductService] getProductById called with id:', id, 'type:', typeof id);
      
      // Validate input ID
      if (!id || typeof id !== 'string' || id.trim() === '' || id.trim() === 'undefined') {
        console.error('[ProductService] Invalid product ID provided:', id);
        return null;
      }

      const trimmedId = id.trim();
      
      // Check if Supabase is configured
      if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
        console.warn('[ProductService] Supabase not configured, using sample data');
        const sample = sampleProducts.find(p => p.id === trimmedId) || null;
        console.log('[ProductService] Returning sample product:', sample?.id);
        return sample;
      }

      if (!supabase) {
        console.warn('[ProductService] No supabase client available, using sample data');
        const sample = sampleProducts.find(p => p.id === trimmedId) || null;
        console.log('[ProductService] No supabase client, returning sample:', sample?.id);
        return sample;
      }

      // Add production environment logging
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        console.log('[ProductService] Production environment - fetching product:', trimmedId);
      }

      // Prefer single-call with nested rental options to reduce round-trips
      // Fix PGRST201 error by specifying exact relationship
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          rental_options (*),
          tiers (*),
          game_titles (*),
          categories!fk_products_category (*)
        `)
        .eq('id', trimmedId)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 errors

      if (error) {
        console.error('[ProductService] Supabase error fetching product by ID:', {
          id: trimmedId,
          error: JSON.stringify(error, null, 2),
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          isProduction
        });
        
        // In production, provide more detailed error information
        if (isProduction) {
          console.error('[ProductService] Production error details:', {
            supabaseUrl: process.env.REACT_APP_SUPABASE_URL ? 'configured' : 'missing',
            supabaseKey: process.env.REACT_APP_SUPABASE_ANON_KEY ? 'configured' : 'missing',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          });
        }
        
        const sample = sampleProducts.find(p => p.id === trimmedId) || null;
        console.log('[ProductService] Error fallback to sample:', sample?.id);
        return sample;
      }

      if (!data) {
        console.log('[ProductService] No product found for id:', trimmedId);
        if (isProduction) {
          console.log('[ProductService] Production: Product not found, this might indicate a routing or database issue');
        }
        return null;
      }
      
      console.log('[ProductService] Found product from DB:', { 
        id: data.id, 
        name: data.name, 
        idType: typeof data.id,
        isActive: data.is_active,
        archivedAt: data.archived_at
      });
      
      const rentalOptions: any[] = (data as any).rental_options || [];
      const cat = (data as any).categories;
      const result = {
        ...data,
        rentalOptions,
        hasRental: (data as any).has_rental ?? (data as any).hasRental ?? (rentalOptions.length > 0),
        tierData: (data as any).tiers,
        gameTitleData: (data as any).game_titles,
        categoryData: cat ? {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          color: cat.color,
          isActive: cat.is_active ?? cat.isActive,
          sortOrder: cat.sort_order ?? cat.sortOrder,
        } : undefined,
        categoryId: cat?.id || (data as any).category_id || (data as any).categoryId,
        // Ensure proper boolean conversion for isActive
        isActive: (data as any).is_active ?? (data as any).isActive ?? true,
        archivedAt: (data as any).archived_at ?? (data as any).archivedAt ?? null,
      } as any;
      
      console.log('[ProductService] Returning final product:', { 
        id: result.id, 
        name: result.name, 
        idType: typeof result.id,
        isActive: result.isActive,
        archivedAt: result.archivedAt
      });
      
      return result;
    } catch (error) {
      console.error('[ProductService] Exception in getProductById:', {
        id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        isProduction: process.env.NODE_ENV === 'production',
        timestamp: new Date().toISOString()
      });
      
      const sample = sampleProducts.find(p => p.id === id) || null;
      console.log('[ProductService] Exception fallback to sample:', sample?.id);
      return sample;
    }
  }

  static async getFlashSales(): Promise<(FlashSale & { product: Product })[]> {
    // Check cache first (2 minute TTL for flash sales)
    const cacheKey = 'flash_sales';
    const hit = g._productServiceCache.get(cacheKey);
    if (hit && Date.now() - hit.t < 2 * 60 * 1000) {
      return hit.v;
    }

    try {
      // Check if Supabase is configured
      if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
        console.warn('Supabase not configured, using sample data');
        const flashSaleProducts = sampleProducts.filter(p => p.isFlashSale);
        return flashSaleProducts.map(product => ({
          id: `flash-${product.id}`,
          productId: product.id,
          salePrice: product.price,
          originalPrice: product.originalPrice || product.price,
          startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          endTime: product.flashSaleEndTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          stock: product.stock,
          isActive: true,
          createdAt: product.createdAt,
          product
        }));
      }

      if (!supabase) {
        const flashSaleProducts = sampleProducts.filter(p => p.isFlashSale);
        return flashSaleProducts.map(product => ({
          id: `flash-${product.id}`,
          productId: product.id,
          salePrice: product.price,
          originalPrice: product.originalPrice || product.price,
          startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          endTime: product.flashSaleEndTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          stock: product.stock,
          isActive: true,
          createdAt: product.createdAt,
          product
        }));
      }

      // If we already know join is unsupported, skip relational join
      if (hasFlashSaleJoin === false) {
        throw new Error('REL_SKIP');
      }
      const { data, error } = await supabase
        .from('flash_sales')
        .select(`
          *,
          products (
            *,
            game_titles (*),
            tiers (*)
          )
        `)
        .eq('is_active', true)
        .gte('end_time', new Date().toISOString())
        .order('end_time', { ascending: true }); // Sort by nearest countdown end first
      
      if (!error && data) {
        hasFlashSaleJoin = true;
      }

      if (error) {
        if ((error as any).message !== 'REL_SKIP') {
          console.warn('Flash sales relational select failed, trying basic');
        }
        const { data: basic, error: err2 } = await supabase
          .from('flash_sales')
          .select('id, product_id, sale_price, original_price, start_time, end_time, stock, is_active, created_at, updated_at')
          .eq('is_active', true)
          .gte('end_time', new Date().toISOString())
          .order('end_time', { ascending: true }); // Sort by nearest countdown end first
        
        if (err2) {
          console.error('Supabase error:', err2);
          const flashSaleProducts = sampleProducts.filter(p => p.isFlashSale);
          return flashSaleProducts.map(product => ({
            id: `flash-${product.id}`,
            productId: product.id,
            salePrice: product.price,
            originalPrice: product.originalPrice || product.price,
            startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            endTime: product.flashSaleEndTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            stock: product.stock,
            isActive: true,
            createdAt: product.createdAt,
            product
          })).sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime()); // Sort by nearest countdown end first
        }
        hasFlashSaleJoin = false;
  const ids = (basic || []).map((b: any) => b.product_id);
        const { data: prods } = await supabase.from('products').select('id, name, description, price, original_price, image, images, category_id, tier_id, game_title_id, is_flash_sale, flash_sale_end_time, has_rental, stock, is_active, archived_at, created_at, updated_at').in('id', ids);
        // Best-effort fetch rental options to derive hasRental when has_rental column is absent
  const rentalsMap = new Map<string, number>();
        try {
          if (ids.length) {
            const { data: ros } = await supabase
              .from('rental_options')
              .select('id, product_id')
              .in('product_id', ids);
            for (const ro of ros || []) {
              rentalsMap.set(ro.product_id, (rentalsMap.get(ro.product_id) || 0) + 1);
            }
          }
        } catch (e) {
          // Ignore rental options fetch failure; proceed without enrichment
          if (process.env.NODE_ENV === 'development') {
            console.debug('rental_options fetch failed (non-fatal):', e);
          }
        }
  const pmap = new Map((prods || []).map((p: any) => [p.id, p]));
        return (basic || []).map((sale: any) => {
          const raw = pmap.get(sale.product_id) || {};
          const product = { ...raw, hasRental: (raw as any).has_rental ?? (raw as any).hasRental ?? ((rentalsMap.get(sale.product_id) || 0) > 0) };
          return {
            id: sale.id,
            productId: sale.product_id,
            salePrice: sale.sale_price,
            originalPrice: sale.original_price,
            startTime: sale.start_time,
            endTime: sale.end_time,
            stock: sale.stock,
            isActive: sale.is_active,
            createdAt: sale.created_at,
            product,
          };
        });
      }

  // When relational join succeeds, also check rental options to infer hasRental if needed
  const rentalsMap = new Map<string, number>();
      try {
        const prodIds = (data || []).map((s: any) => s.product_id || s.productId || s.products?.id).filter(Boolean);
        if (prodIds.length) {
          const { data: ros } = await supabase
            .from('rental_options')
            .select('id, product_id')
            .in('product_id', prodIds);
          for (const ro of ros || []) {
            rentalsMap.set(ro.product_id, (rentalsMap.get(ro.product_id) || 0) + 1);
          }
        }
      } catch (e) {
        // Ignore rental options fetch failure; proceed
        if (process.env.NODE_ENV === 'development') {
          console.debug('rental_options fetch failed (non-fatal):', e);
        }
      }

  const result = data?.map((sale: any) => {
        const prod = sale.products || {};
        const gt = prod.game_titles;
        const tier = prod.tiers;
        const product = {
          ...prod,
          hasRental: prod.has_rental ?? prod.hasRental ?? ((rentalsMap.get(prod.id) || 0) > 0),
          // Enrich with joined data for UI badges/monogram
          gameTitleData: gt ? {
            id: gt.id,
            slug: gt.slug,
            name: gt.name,
            description: gt.description,
            icon: gt.icon,
            color: gt.color,
            logoUrl: gt.logo_url ?? gt.logoUrl,
            isPopular: gt.is_popular ?? gt.isPopular,
            isActive: gt.is_active ?? gt.isActive,
            sortOrder: gt.sort_order ?? gt.sortOrder,
            createdAt: gt.created_at ?? gt.createdAt,
            updatedAt: gt.updated_at ?? gt.updatedAt,
          } : undefined,
          // legacy gameTitle removed
          tierData: tier ? {
            id: tier.id,
            name: tier.name,
            slug: tier.slug,
            description: tier.description,
            color: tier.color,
            borderColor: tier.border_color ?? tier.borderColor,
            backgroundGradient: tier.background_gradient ?? tier.backgroundGradient,
            icon: tier.icon,
            priceRangeMin: tier.price_range_min ?? tier.priceRangeMin,
            priceRangeMax: tier.price_range_max ?? tier.priceRangeMax,
            isActive: tier.is_active ?? tier.isActive,
            sortOrder: tier.sort_order ?? tier.sortOrder,
            createdAt: tier.created_at ?? tier.createdAt,
            updatedAt: tier.updated_at ?? tier.updatedAt,
          } : undefined,
          // Ensure flash sale styling/timer can use these
          isFlashSale: true,
          flashSaleEndTime: sale.end_time || sale.endTime,
          // Apply sale price and preserve original
          price: sale.sale_price ?? sale.salePrice ?? prod.price,
          originalPrice: sale.original_price ?? sale.originalPrice ?? prod.original_price ?? prod.originalPrice ?? prod.price,
        } as any;

        return { ...sale, product };
      }) || [];

      // Cache the result
      g._productServiceCache.set(cacheKey, { v: result, t: Date.now() });
      return result;
    } catch (error) {
      console.error('Error fetching flash sales:', error);
      const flashSaleProducts = sampleProducts.filter(p => p.isFlashSale);
      return flashSaleProducts.map(product => ({
        id: `flash-${product.id}`,
        productId: product.id,
        salePrice: product.price,
        originalPrice: product.originalPrice || product.price,
        startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        endTime: product.flashSaleEndTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        stock: product.stock,
        isActive: true,
        createdAt: product.createdAt,
        product
      })).sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime()); // Sort by nearest countdown end first
    }
  }

  static async getActiveFlashSaleByProductId(productId: string): Promise<{
    salePrice: number;
    originalPrice: number;
    endTime: string;
    startTime?: string;
  } | null> {
    try {
      // Sample fallback
      if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY || !supabase) {
        const flashSales = await this.getFlashSales();
        const found = flashSales.find(fs => fs.productId === productId && fs.isActive);
        if (!found) return null;
        const now = new Date();
        const end = new Date(found.endTime);
        if (end.getTime() <= now.getTime()) return null;
        return {
          salePrice: found.salePrice,
          originalPrice: found.originalPrice,
          endTime: found.endTime,
          startTime: found.startTime,
        };
      }

      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('flash_sales')
        .select('id, product_id, sale_price, original_price, start_time, end_time, stock, is_active, created_at, updated_at')
        .eq('product_id', productId)
        .eq('is_active', true)
        .lte('start_time', nowIso)
        .gte('end_time', nowIso)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Supabase error fetching active flash sale:', error);
        return null;
      }

      if (!data) return null;

      return {
        salePrice: data.sale_price,
        originalPrice: data.original_price,
        endTime: data.end_time,
        startTime: data.start_time,
      };
    } catch (e) {
      console.error('Error getActiveFlashSaleByProductId:', e);
      return null;
    }
  }

  // Flash Sale CRUD
  static async createFlashSale(sale: {
    product_id: string;
    sale_price: number;
    original_price?: number | null;
    start_time?: string | null;
    end_time: string;
    stock?: number | null;
    is_active?: boolean;
  }): Promise<any | null> {
    try {
      if (!supabase) return null;
      // Ensure NOT NULL columns are respected per initial schema
      const payload: any = { ...sale };
      if (!payload.start_time) payload.start_time = new Date().toISOString();
      if (!payload.original_price || Number(payload.original_price) <= 0) payload.original_price = Number(payload.sale_price);
      if (typeof payload.stock === 'undefined') payload.stock = 0;
      // Normalize date strings to ISO
      if (payload.start_time) payload.start_time = new Date(payload.start_time).toISOString();
      if (payload.end_time) payload.end_time = new Date(payload.end_time).toISOString();

      const { data, error } = await (supabase as any)
        .from('flash_sales')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Error creating flash sale:', e);
      return null;
    }
  }

  static async updateFlashSale(id: string, updates: Partial<{
    product_id: string;
    sale_price: number;
    original_price?: number | null;
    start_time?: string | null;
    end_time: string;
    stock?: number | null;
    is_active?: boolean;
  }>): Promise<any | null> {
    try {
      if (!supabase) return null;
      const payload: any = { ...updates };
      // Normalize date strings to ISO when provided
      if (payload.start_time) payload.start_time = new Date(payload.start_time).toISOString();
      if (payload.end_time) payload.end_time = new Date(payload.end_time).toISOString();
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const { data, error } = await (supabase as any)
        .from('flash_sales')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Error updating flash sale:', e);
      return null;
    }
  }

  static async deleteFlashSale(id: string): Promise<boolean> {
    try {
      if (!supabase) return false;
      const { error } = await (supabase as any)
        .from('flash_sales')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Error deleting flash sale:', e);
      return false;
    }
  }

  static async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & Record<string, any>): Promise<Product | null> {
    try {
      console.log('🚀 ProductService.createProduct called with (sanitized):', {
        name: product.name,
        price: product.price,
        categoryId: product.categoryId,
        hasRental: product.hasRental,
        isFlashSale: product.isFlashSale,
      });

      // Server-side defensive guard: prevent any blob: URLs leaking into DB
      if (Array.isArray(product.images) && product.images.some((img: string) => typeof img === 'string' && img.startsWith('blob:'))) {
        throw new Error('Blob URL detected in images payload (create). Upload not finished.');
      }
      if (typeof product.image === 'string' && product.image.startsWith('blob:')) {
        throw new Error('Blob URL detected in image cover (create).');
      }

      if (!supabase) {
        console.error('❌ Supabase client not available');
        return null;
      }

  const payload: any = {
        name: product.name,
        description: product.description,
        price: product.price,
        original_price: product.originalPrice ?? product.original_price ?? null,
        image: product.image,
        images: product.images ?? [],
        category_id: product.categoryId ?? (product as any).category_id ?? null,
        is_flash_sale: product.isFlashSale ?? false,
        has_rental: product.hasRental ?? false,
        stock: product.stock ?? 1,
        is_active: product.isActive !== undefined ? product.isActive : (product as any).is_active ?? true,
      };

      // --- Defensive normalization start ---
      const normalizeFk = (v: any) => (typeof v === 'string' && isUuid(v) ? v : null);
      const emptyToNull = (v: any) => (v === '' ? null : v);

      // Clean primitive required fields
      if (typeof payload.price !== 'number' || isNaN(payload.price)) {
        throw new Error('Invalid price supplied');
      }
      if (!payload.name || !payload.description) {
        throw new Error('Name & description required');
      }

      // Ensure stock is integer >=0
      payload.stock = Number.isFinite(payload.stock) && payload.stock >= 0 ? Math.floor(payload.stock) : 0;

      // Enforce category presence (either FK or legacy text) as required business rule
      if (!payload.category_id) {
        throw new Error('Category is required');
      }

      // Normalize category_id (allow null if not uuid / not yet migrated)
      payload.category_id = normalizeFk(emptyToNull(payload.category_id));

      // Lazy capability detection if not yet determined
      if (hasRelations === null) {
        try {
          const { error: relErr } = await supabase
            .from('products')
            .select('id, game_title_id, tier_id')
            .limit(1);
          if (!relErr) {
            hasRelations = true;
          } else {
            hasRelations = false;
          }
        } catch {
          hasRelations = false;
        }
  // Legacy text column removal – skip detection
      }

  // Relational-only mode: ensure *_id fields set; legacy text column removed
  payload.game_title_id = normalizeFk(emptyToNull(product.gameTitleId ?? (product as any).game_title_id));
  payload.tier_id = normalizeFk(emptyToNull(product.tierId ?? (product as any).tier_id));
  // Never send payload.game_title
  delete payload.game_title;

      // Remove undefined to appease PostgREST
      Object.keys(payload).forEach(k => {
        if (payload[k] === undefined) delete payload[k];
      });
      // --- Defensive normalization end ---

      console.log('💾 Final create payload:', payload);

      const { data, error } = await supabase.from('products').insert([payload]).select().single();

      if (error) {
        console.error('❌ Database insert error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });

        // Special handling for RLS policy errors
        if (error.code === '42501') {
          console.error('🔒 RLS Policy Error Detected!');
          console.error('💡 This indicates that Row Level Security policies are blocking the operation.');
          console.error('🔧 To fix this, the database administrator needs to update RLS policies.');
          console.error('📋 Required policies for products table:');
          console.error('   - Allow INSERT operations for admin users');
          console.error('   - Allow UPDATE operations for admin users');
          console.error('   - Allow DELETE operations for admin users');
          
          // Provide a user-friendly error message
          const rlsError = new Error('Database access denied. This requires administrator access to fix Row Level Security policies.');
          (rlsError as any).code = 'RLS_POLICY_ERROR';
          (rlsError as any).originalError = error;
          throw rlsError;
        }

        throw error;
      }

      console.log('✅ Product created successfully:', data?.id);
      return data;
    } catch (error) {
      console.error('💥 ProductService.createProduct error:', error);
      return null;
    }
  }

  static async updateProduct(id: string, updates: Partial<Product> & Record<string, any>): Promise<Product | null> {
    try {
      console.log('🚀 ProductService.updateProduct called with:', {
        id,
        fields: Object.keys(updates)
      });

      // Server-side defensive guard: reject blob placeholders
      if (Array.isArray((updates as any).images) && (updates as any).images.some((img: string) => typeof img === 'string' && img.startsWith('blob:'))) {
        throw new Error('Blob URL detected in images payload (update). Upload not finished.');
      }
      if (typeof (updates as any).image === 'string' && (updates as any).image.startsWith('blob:')) {
        throw new Error('Blob URL detected in image cover (update).');
      }

      if (!supabase) {
        console.error('❌ Supabase client not available');
        return null;
      }

      if (!isUuid(id)) {
        console.warn('❌ Refusing to update non-UUID id (likely sample data):', id);
        return null;
      }

  const payload: any = {
        name: updates.name,
        description: updates.description,
        price: updates.price,
        original_price: (updates as any).original_price ?? updates.originalPrice,
        image: (updates as any).image,
        images: (updates as any).images,
        category_id: (updates as any).category_id ?? updates.categoryId ?? null,
        is_flash_sale: (updates as any).is_flash_sale ?? updates.isFlashSale,
        has_rental: (updates as any).has_rental ?? updates.hasRental,
        stock: (updates as any).stock ?? updates.stock,
        is_active: (updates as any).is_active ?? updates.isActive,
      };

      // --- Defensive normalization start (update) ---
      const normalizeFk = (v: any) => (typeof v === 'string' && isUuid(v) ? v : null);
      const emptyToNull = (v: any) => (v === '' ? null : v);
      if (payload.price !== undefined && (typeof payload.price !== 'number' || isNaN(payload.price as any))) {
        delete payload.price; // don't send invalid price
      }
      if (payload.category_id !== undefined) {
        payload.category_id = normalizeFk(emptyToNull(payload.category_id));
      }
      // Lazy capability detection on update as well
      if (hasRelations === null) {
        try {
          const { error: relErr } = await supabase
            .from('products')
            .select('id, game_title_id, tier_id')
            .limit(1);
          if (!relErr) {
            hasRelations = true;
          } else {
            hasRelations = false;
          }
        } catch {
          hasRelations = false;
        }
  // Legacy text column removal – skip detection
      }

  // Relational-only mode for updates
  payload.game_title_id = normalizeFk(emptyToNull((updates as any).game_title_id ?? updates.gameTitleId));
  payload.tier_id = normalizeFk(emptyToNull((updates as any).tier_id ?? updates.tierId));
  delete payload.game_title; // ensure not sent
  console.log('� Using relational schema (legacy game_title fully removed)');

      // Remove undefined values to prevent database issues
      Object.keys(payload).forEach(k => {
        if (payload[k] === undefined) {
          delete payload[k];
        }
      });
      // --- Defensive normalization end (update) ---

      console.log('💾 Final update payload:', payload);

      const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single();

      if (error) {
        console.error('❌ Database update error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          payload: payload
        });
        throw error;
      }

      console.log('✅ Product updated successfully:', data?.id);
      return data;
    } catch (error) {
      console.error('💥 ProductService.updateProduct error:', error);
      return null;
    }
  }

  static async deleteProduct(id: string, options?: { images?: string[] }): Promise<boolean> {
    try {
  if (!supabase) return false;
  if (!isUuid(id)) {
    console.warn('Refusing to delete non-UUID id (likely sample data):', id);
    return false;
  }
  // Best-effort cleanup of dependent records to avoid FK constraint errors on delete
  try {
    // Some deployments don't have ON DELETE CASCADE on these tables
    await (supabase as any).from('rental_options').delete().eq('product_id', id);
  } catch (_) {
    // ignore
  }
  try {
    await (supabase as any).from('flash_sales').delete().eq('product_id', id);
  } catch (_) {
    // ignore
  }
  try {
    // Orders usually reference product_id without cascade; set to NULL to keep order history
    await (supabase as any).from('orders').update({ product_id: null }).eq('product_id', id);
  } catch (_) {
    // ignore
  }

  const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      // Best-effort delete related images from storage when provided
      if (options?.images && options.images.length) {
        try { await deletePublicUrls(options.images); } catch (_) {}
      }
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  }

  static async getTiers(): Promise<Tier[]> {
    // Check cache first (5 minute TTL)
    const cacheKey = 'tiers';
    const hit = g._productServiceCache.get(cacheKey);
    if (hit && Date.now() - hit.t < 5 * 60 * 1000) {
      return hit.v;
    }

    try {
      if (!supabase) {
        return sampleTiers;
      }

      const { data, error } = await supabase
        .from('tiers')
        .select('id, name, slug, description, color, border_color, background_gradient, icon, price_range_min, price_range_max, is_active, sort_order, created_at, updated_at')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching tiers:', error);
        return sampleTiers;
      }

      const result = data?.map(tier => ({
        ...tier,
        isActive: tier.is_active,
        sortOrder: tier.sort_order,
        borderColor: tier.border_color,
        backgroundGradient: tier.background_gradient,
        priceRangeMin: tier.price_range_min,
        priceRangeMax: tier.price_range_max,
        createdAt: tier.created_at,
        updatedAt: tier.updated_at
      })) || sampleTiers;

      // Cache the result
      g._productServiceCache.set(cacheKey, { v: result, t: Date.now() });
      return result;
    } catch (error) {
      console.error('Error fetching tiers:', error);
      return sampleTiers;
    }
  }

  static async getGameTitles(): Promise<GameTitle[]> {
    // Check cache first (5 minute TTL)
    const cacheKey = 'game_titles';
    const hit = g._productServiceCache.get(cacheKey);
    if (hit && Date.now() - hit.t < 5 * 60 * 1000) {
      return hit.v;
    }

    try {
      if (!supabase) {
        return sampleGameTitles;
      }

      const { data, error } = await supabase
        .from('game_titles')
        .select('id, slug, name, description, icon, color, logo_url, logo_path, is_popular, is_active, sort_order, created_at, updated_at')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching game titles:', error);
        return sampleGameTitles;
      }

      const result = data?.map(gameTitle => {
        // Get logo URL - prefer new logo_path with public URL, fallback to legacy logo_url
        let logoUrl = gameTitle.logo_url; // Legacy URL fallback
        
        if (gameTitle.logo_path) {
          // Convert storage path to public URL
          try {
            const { data: urlData } = (supabase as any).storage
              .from('game-logos')
              .getPublicUrl(gameTitle.logo_path);
            logoUrl = urlData.publicUrl;
          } catch (error) {
            console.warn('Failed to get public URL for logo_path:', gameTitle.logo_path);
            // Keep legacy logo_url as fallback
          }
        }

        return {
          ...gameTitle,
          isPopular: gameTitle.is_popular,
          isActive: gameTitle.is_active,
          sortOrder: gameTitle.sort_order,
          logoUrl,
          createdAt: gameTitle.created_at,
          updatedAt: gameTitle.updated_at
        };
      }) || sampleGameTitles;

      // Cache the result
      g._productServiceCache.set(cacheKey, { v: result, t: Date.now() });
      return result;
    } catch (error) {
      console.error('Error fetching game titles:', error);
      return sampleGameTitles;
    }
  }

  static async getCategories(): Promise<string[]> {
    // 5 minute TTL cache
    const cacheKey = 'categories_simple';
    const hit = g._productServiceCache.get(cacheKey);
    if (hit && Date.now() - hit.t < 5 * 60 * 1000) {
      return hit.v;
    }
    try {
      if (!supabase) {
        return [];
      }
      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('slug, name, is_active, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      let result: string[] = [];
      if (!catErr && catData && catData.length) {
        // For category names, get from categories table via category_id FK only
        result = catData.map(c => c.slug || c.name).filter(Boolean);
      } else {
        // Fallback: return empty array if no categories table access
        result = [];
      }
      g._productServiceCache.set(cacheKey, { v: result, t: Date.now() });
      return result;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  // Popular games with product counts for the Home page carousel
  static async getPopularGames(limit = 12): Promise<Array<{ id: string; name: string; slug: string; logoUrl?: string | null; count: number }>> {
    try {
      // Lightweight in-memory cache for popular games query
      const cacheKey = `popular_games_${limit}`;
      const g: any = (ProductService as any);
      g._pgCache = g._pgCache || new Map();
      const hit = g._pgCache.get(cacheKey);
      if (hit && Date.now() - hit.t < 2 * 60 * 1000) {
        return hit.v;
      }

      // Fallback to sample data when Supabase isn't configured
      if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY || !supabase) {
        const counts = new Map<string, number>();
        for (const p of sampleProducts) {
          const key = p.gameTitleData?.name || 'Lainnya';
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        const items = sampleGameTitles.map(gt => ({
          id: gt.id,
          name: gt.name,
          slug: gt.slug,
          logoUrl: (gt as any).logoUrl,
          count: counts.get(gt.name) || 0,
        })).filter(i => i.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
        g._pgCache.set(cacheKey, { v: items, t: Date.now() });
        return items;
      }

      // Single relational query with product counts to reduce egress
  const relQuery = supabase
        .from('game_titles')
        .select(`
          id, name, slug, logo_url, logo_path, is_active,
          products:products!inner ( id )
        `)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      const { data: games, error: gErr } = await relQuery;
      if (gErr) throw gErr;

      const items = (games || []).map((g: any) => {
        let logoUrl = g.logo_url;
        if (g.logo_path) {
          try {
            const { data: urlData } = (supabase as any).storage
              .from('game-logos')
              .getPublicUrl(g.logo_path);
            logoUrl = urlData.publicUrl;
          } catch (_e) {
            // ignore
          }
        }
        const count = Array.isArray(g.products) ? g.products.length : 0;
        return { id: g.id, name: g.name, slug: g.slug, logoUrl, count };
      })
      .filter((i: any) => i.count > 0)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, limit);

      g._pgCache.set(cacheKey, { v: items, t: Date.now() });
      return items;
    } catch (error) {
      console.error('Error fetching popular games:', error);
      return [];
    }
  }

  // Detailed category list (id, name, slug) with caching
  static async getCategoryList(): Promise<Array<{ id: string; name: string; slug: string }>> {
    const cacheKey = 'categories_detailed';
    const hit = g._productServiceCache.get(cacheKey);
    if (hit && Date.now() - hit.t < 5 * 60 * 1000) return hit.v;
    try {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, is_active, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      const result = (data || []).map(c => ({ id: c.id, name: c.name, slug: c.slug }));
      g._productServiceCache.set(cacheKey, { v: result, t: Date.now() });
      return result;
    } catch (e) {
      console.error('Error getCategoryList:', e);
      return [];
    }
  }
}
