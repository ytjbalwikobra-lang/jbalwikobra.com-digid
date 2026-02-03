/**
 * GEO & AI SEO Utilities
 * 
 * Structured data generators for:
 * - Perplexity AI / ChatGPT / Gemini crawlers
 * - Google Shopping & Merchant Center
 * - Traditional search engines
 * - Agentic Commerce Protocol (ACP) compliance
 */

// Note: Product/Category types are defined locally to avoid circular dependencies

// ============================================================================
// TYPES
// ============================================================================

export interface GEOProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  imageUrl?: string;
  category?: string;
  brand?: string;
  sku?: string;
  stock: number;
  rating?: number;
  reviewCount?: number;
}

export interface GEOBusiness {
  name: string;
  description: string;
  url: string;
  logo: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country: string;
  };
  socialProfiles?: string[];
}

export interface GEOFaq {
  question: string;
  answer: string;
}

// ============================================================================
// PRODUCT SCHEMA (Schema.org)
// ============================================================================

export function generateProductSchema(product: GEOProduct, businessUrl: string) {
  const availability = product.stock > 0 
    ? 'https://schema.org/InStock' 
    : 'https://schema.org/OutOfStock';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${businessUrl}/product/${product.slug}#product`,
    name: product.name,
    description: product.description || product.name,
    image: product.imageUrl,
    sku: product.sku || product.id,
    brand: product.brand ? {
      '@type': 'Brand',
      name: product.brand,
    } : undefined,
    category: product.category,
    offers: {
      '@type': 'Offer',
      url: `${businessUrl}/product/${product.slug}`,
      priceCurrency: product.currency,
      price: product.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'JBAL Wikobra',
      },
    },
    aggregateRating: product.rating && product.reviewCount ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    } : undefined,
  };
}

// ============================================================================
// PRODUCT LIST / CATALOG SCHEMA
// ============================================================================

export function generateCatalogSchema(
  products: GEOProduct[], 
  businessUrl: string,
  categoryName?: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: categoryName || 'Product Catalog',
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        '@id': `${businessUrl}/product/${product.slug}#product`,
        name: product.name,
        image: product.imageUrl,
        url: `${businessUrl}/product/${product.slug}`,
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: product.currency,
          availability: product.stock > 0 
            ? 'https://schema.org/InStock' 
            : 'https://schema.org/OutOfStock',
        },
      },
    })),
  };
}

// ============================================================================
// ORGANIZATION SCHEMA
// ============================================================================

export function generateOrganizationSchema(business: GEOBusiness) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${business.url}#organization`,
    name: business.name,
    description: business.description,
    url: business.url,
    logo: {
      '@type': 'ImageObject',
      url: business.logo,
    },
    telephone: business.phone,
    email: business.email,
    address: business.address ? {
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      addressLocality: business.address.city,
      addressRegion: business.address.region,
      postalCode: business.address.postalCode,
      addressCountry: business.address.country,
    } : undefined,
    sameAs: business.socialProfiles,
  };
}

// ============================================================================
// WEBSITE SCHEMA (For sitelinks search box)
// ============================================================================

export function generateWebsiteSchema(business: GEOBusiness) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${business.url}#website`,
    name: business.name,
    url: business.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${business.url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// ============================================================================
// BREADCRUMB SCHEMA
// ============================================================================

export function generateBreadcrumbSchema(
  businessUrl: string,
  items: { name: string; url: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${businessUrl}${item.url}`,
    })),
  };
}

// ============================================================================
// FAQ SCHEMA (For AI assistants)
// ============================================================================

export function generateFaqSchema(faqs: GEOFaq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// ============================================================================
// AGENTIC COMMERCE PROTOCOL (ACP) - AI Agent Optimized
// ============================================================================

export interface ACPProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  stock: number;
  category: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface ACPCatalogResponse {
  protocol: 'acp/1.0';
  merchant: {
    id: string;
    name: string;
    url: string;
    capabilities: string[];
  };
  products: ACPProduct[];
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    hasMore: boolean;
  };
  filters?: Record<string, string[]>;
}

/**
 * Generate ACP-compliant product catalog response
 * Used for AI agent product discovery and comparison
 */
export function generateACPCatalog(
  merchantId: string,
  merchantName: string,
  merchantUrl: string,
  products: ACPProduct[],
  pagination?: ACPCatalogResponse['pagination']
): ACPCatalogResponse {
  return {
    protocol: 'acp/1.0',
    merchant: {
      id: merchantId,
      name: merchantName,
      url: merchantUrl,
      capabilities: [
        'product_listing',
        'product_search',
        'price_comparison',
        'stock_check',
        'add_to_cart',
        'checkout',
      ],
    },
    products,
    pagination,
  };
}

// ============================================================================
// META TAG GENERATORS
// ============================================================================

export interface MetaTags {
  title: string;
  description: string;
  canonical: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  robots?: string;
}

export function generateMetaTags(meta: MetaTags): string {
  const tags: string[] = [];

  // Basic meta
  tags.push(`<title>${meta.title}</title>`);
  tags.push(`<meta name="description" content="${meta.description}" />`);
  tags.push(`<link rel="canonical" href="${meta.canonical}" />`);

  // Open Graph
  tags.push(`<meta property="og:title" content="${meta.ogTitle || meta.title}" />`);
  tags.push(`<meta property="og:description" content="${meta.ogDescription || meta.description}" />`);
  tags.push(`<meta property="og:url" content="${meta.canonical}" />`);
  tags.push(`<meta property="og:type" content="${meta.ogType || 'website'}" />`);
  if (meta.ogImage) {
    tags.push(`<meta property="og:image" content="${meta.ogImage}" />`);
  }

  // Twitter
  tags.push(`<meta name="twitter:card" content="${meta.twitterCard || 'summary_large_image'}" />`);
  tags.push(`<meta name="twitter:title" content="${meta.ogTitle || meta.title}" />`);
  tags.push(`<meta name="twitter:description" content="${meta.ogDescription || meta.description}" />`);
  if (meta.ogImage) {
    tags.push(`<meta name="twitter:image" content="${meta.ogImage}" />`);
  }

  // Robots
  if (meta.robots) {
    tags.push(`<meta name="robots" content="${meta.robots}" />`);
  }

  return tags.join('\n');
}

// ============================================================================
// PRODUCT META TAGS
// ============================================================================

export function generateProductMetaTags(
  product: GEOProduct,
  businessUrl: string,
  businessName: string
): MetaTags {
  const price = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(product.price);

  const stockText = product.stock > 0 ? 'Ready Stock' : 'Sold Out';
  const title = `${product.name} | ${price} | ${businessName}`;
  const description = product.description 
    || `Beli ${product.name} dengan harga ${price}. ${stockText}. Pengiriman cepat & aman.`;

  return {
    title,
    description,
    canonical: `${businessUrl}/product/${product.slug}`,
    ogTitle: product.name,
    ogDescription: description,
    ogImage: product.imageUrl,
    ogType: 'product',
    twitterCard: 'summary_large_image',
  };
}
