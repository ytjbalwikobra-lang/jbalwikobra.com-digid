import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { setCacheHeaders } from './_utils/cacheControl.js';

// Initialize Supabase client
const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').replace(/[\r\n\\]/g, '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '').replace(/[\r\n\\]/g, '').trim();

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const BASE_URL = 'https://jbalwikobra.com';

// Static pages with their priorities and change frequencies
const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/products', priority: '0.9', changefreq: 'daily' },
  { path: '/flash-sales', priority: '0.9', changefreq: 'daily' },
  { path: '/help', priority: '0.7', changefreq: 'monthly' },
  { path: '/terms', priority: '0.5', changefreq: 'monthly' },
  { path: '/feed', priority: '0.6', changefreq: 'weekly' },
];

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const today = formatDate(new Date());
    const urls: string[] = [];

    // Add static pages
    for (const page of staticPages) {
      urls.push(`
  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
    }

    // Fetch dynamic product data from database
    if (supabase) {
      // Fetch active products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, updated_at, created_at')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(500);

      if (!productsError && products) {
        for (const product of products) {
          const lastmod = formatDate(product.updated_at || product.created_at);
          urls.push(`
  <url>
    <loc>${BASE_URL}/products/${escapeXml(product.id)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
        }
      }

      // Fetch active flash sales
      const { data: flashSales, error: flashSalesError } = await supabase
        .from('flash_sales')
        .select('id, updated_at, created_at, end_time')
        .gte('end_time', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (!flashSalesError && flashSales) {
        for (const flashSale of flashSales) {
          const lastmod = formatDate(flashSale.updated_at || flashSale.created_at);
          urls.push(`
  <url>
    <loc>${BASE_URL}/flash-sales/${escapeXml(flashSale.id)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>`);
        }
      }

      // Fetch games for category pages (if you have game category pages)
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('id, name, slug, updated_at')
        .order('name');

      if (!gamesError && games) {
        for (const game of games) {
          const slug = game.slug || game.name.toLowerCase().replace(/\s+/g, '-');
          const lastmod = formatDate(game.updated_at || new Date());
          urls.push(`
  <url>
    <loc>${BASE_URL}/products?game=${escapeXml(slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>`);
        }
      }

      // Fetch categories for SEO landing pages
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, slug, updated_at')
        .order('name');

      if (!categoriesError && categories) {
        for (const category of categories) {
          const slug = category.slug || category.name.toLowerCase().replace(/\s+/g, '-');
          const lastmod = formatDate(category.updated_at || new Date());
          // Category landing page (higher priority for SEO)
          urls.push(`
  <url>
    <loc>${BASE_URL}/kategori/${escapeXml(slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
          // Also keep the filter URL for alternate access
          urls.push(`
  <url>
    <loc>${BASE_URL}/products?category=${escapeXml(slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
        }
      }

      // Fetch tiers for filter pages
      const { data: tiers, error: tiersError } = await supabase
        .from('tiers')
        .select('id, name, slug, updated_at')
        .order('name');

      if (!tiersError && tiers) {
        for (const tier of tiers) {
          const slug = tier.slug || tier.name.toLowerCase().replace(/\s+/g, '-');
          const lastmod = formatDate(tier.updated_at || new Date());
          urls.push(`
  <url>
    <loc>${BASE_URL}/products?tier=${escapeXml(slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.65</priority>
  </url>`);
        }
      }

      // Add popular search term combinations for long-tail SEO
      const popularSearchTerms = [
        'akun premium',
        'akun murah',
        'rental akun',
        'flash sale',
        'diskon',
        'sultan',
        'mythic',
        'legendary'
      ];

      for (const term of popularSearchTerms) {
        urls.push(`
  <url>
    <loc>${BASE_URL}/products?search=${encodeURIComponent(term)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`);
      }
    }

    // Build XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.join('')}
</urlset>`;

    // Set cache headers (cache for 1 hour, stale-while-revalidate for 1 day)
    setCacheHeaders(res, {
      maxAge: 3600, // 1 hour cache
      staleWhileRevalidate: 86400 // 1 day stale-while-revalidate
    });

    // Return XML response
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(sitemap);

  } catch (error) {
    console.error('Sitemap generation error:', error);
    return res.status(500).json({ error: 'Failed to generate sitemap' });
  }
}
