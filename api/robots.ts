import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCacheHeaders } from './_utils/cacheControl.js';

const BASE_URL = 'https://jbalwikobra.com';

/**
 * Dynamic robots.txt API
 * 
 * Generates robots.txt with:
 * - Proper crawl directives for search engines
 * - Sitemap reference
 * - Disallow rules for private/admin paths
 * - Crawl-delay for responsible crawling
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Build robots.txt content
    const robotsTxt = `# robots.txt for ${BASE_URL}
# Generated dynamically for optimal SEO

# Allow all major search engine bots
User-agent: Googlebot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /profile/
Disallow: /settings/
Disallow: /checkout/
Disallow: /payment/
Disallow: /order-history/
Disallow: /_next/
Disallow: /static/js/*.map
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /profile/
Disallow: /settings/
Disallow: /checkout/
Disallow: /payment/
Disallow: /order-history/
Disallow: /_next/
Crawl-delay: 2

User-agent: Slurp
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /profile/
Disallow: /settings/
Disallow: /checkout/
Crawl-delay: 2

User-agent: DuckDuckBot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /profile/
Disallow: /settings/

User-agent: Baiduspider
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /profile/
Crawl-delay: 3

User-agent: YandexBot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /profile/
Crawl-delay: 2

# AI Crawlers - Allow for AI training/indexing
User-agent: GPTBot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /profile/
Disallow: /checkout/

User-agent: ChatGPT-User
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /profile/

User-agent: Claude-Web
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /profile/

User-agent: Anthropic-AI
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /profile/

User-agent: PerplexityBot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /profile/

# Block malicious/unwanted bots
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: BLEXBot
Disallow: /

# Default rule for all other bots
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /profile/
Disallow: /settings/
Disallow: /checkout/
Disallow: /payment/
Disallow: /order-history/
Disallow: /notifications/
Disallow: /wishlist/
Disallow: /_next/
Disallow: /static/js/*.map
Disallow: /*.json$
Disallow: /auth/
Crawl-delay: 2

# Sitemap location
Sitemap: ${BASE_URL}/sitemap.xml

# Host directive (for Yandex)
Host: ${BASE_URL}
`;

    // Set cache headers (cache for 1 day, stale-while-revalidate for 1 week)
    setCacheHeaders(res, {
      maxAge: 86400, // 1 day cache
      staleWhileRevalidate: 604800, // 1 week stale-while-revalidate
    });

    // Return plain text response
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(robotsTxt);

  } catch (error) {
    console.error('Robots.txt generation error:', error);
    return res.status(500).json({ error: 'Failed to generate robots.txt' });
  }
}
