import React, { memo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  generateProductSchema,
  generateCatalogSchema,
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateBreadcrumbSchema,
  generateFaqSchema,
  GEOProduct,
  GEOBusiness,
  GEOFaq,
} from '../../utils/geo-seo';

/**
 * GEO SEO Components
 * 
 * Enhanced structured data injection for AI assistants:
 * - Perplexity AI
 * - Google Gemini  
 * - ChatGPT / Bing
 * - Traditional search engines
 * 
 * Implements Agentic Commerce Protocol (ACP) optimizations
 */

// Business configuration
export const GEO_BUSINESS: GEOBusiness = {
  name: 'JBAL Wikobra',
  description: 'Toko game digital terpercaya. Jual top up game, voucher game, dan akun game premium dengan harga terbaik.',
  url: 'https://jbalwikobra.com',
  logo: 'https://jbalwikobra.com/logo.png',
  phone: '+62-xxx-xxx-xxxx',
  email: 'support@jbalwikobra.com',
  address: {
    city: 'Jakarta',
    region: 'DKI Jakarta',
    country: 'ID',
  },
  socialProfiles: [
    'https://instagram.com/jbalwikobra',
    'https://tiktok.com/@jbalwikobra',
  ],
};

// ============================================================================
// PRODUCT STRUCTURED DATA
// ============================================================================

interface GEOProductSchemaProps {
  product: GEOProduct;
  breadcrumbs?: { name: string; url: string }[];
}

export const GEOProductSchema: React.FC<GEOProductSchemaProps> = memo(({ product, breadcrumbs }) => {
  const productSchema = generateProductSchema(product, GEO_BUSINESS.url);
  const breadcrumbSchema = breadcrumbs 
    ? generateBreadcrumbSchema(GEO_BUSINESS.url, breadcrumbs)
    : null;

  return (
    <Helmet>
      {/* Product Structured Data for AI/Search */}
      <script type="application/ld+json">
        {JSON.stringify(productSchema)}
      </script>
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}
    </Helmet>
  );
});

GEOProductSchema.displayName = 'GEOProductSchema';

// ============================================================================
// CATALOG STRUCTURED DATA
// ============================================================================

interface GEOCatalogSchemaProps {
  products: GEOProduct[];
  categoryName?: string;
}

export const GEOCatalogSchema: React.FC<GEOCatalogSchemaProps> = memo(({ 
  products, 
  categoryName,
}) => {
  const catalogSchema = generateCatalogSchema(products, GEO_BUSINESS.url, categoryName);

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(catalogSchema)}
      </script>
    </Helmet>
  );
});

GEOCatalogSchema.displayName = 'GEOCatalogSchema';

// ============================================================================
// ORGANIZATION & WEBSITE STRUCTURED DATA
// ============================================================================

export const GEOOrganizationSchema: React.FC = memo(() => {
  const organizationSchema = generateOrganizationSchema(GEO_BUSINESS);
  const websiteSchema = generateWebsiteSchema(GEO_BUSINESS);

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
    </Helmet>
  );
});

GEOOrganizationSchema.displayName = 'GEOOrganizationSchema';

// ============================================================================
// FAQ STRUCTURED DATA
// ============================================================================

interface GEOFaqSchemaProps {
  faqs: GEOFaq[];
}

export const GEOFaqSchema: React.FC<GEOFaqSchemaProps> = memo(({ faqs }) => {
  const faqSchema = generateFaqSchema(faqs);

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
    </Helmet>
  );
});

GEOFaqSchema.displayName = 'GEOFaqSchema';

// ============================================================================
// AI ASSISTANT HINTS META TAGS
// ============================================================================

interface AIHintsProps {
  productName?: string;
  price?: number;
  category?: string;
  inStock?: boolean;
  keywords?: string[];
}

/**
 * Special meta tags that help AI assistants understand page content
 * These are designed for Perplexity, Gemini, and ChatGPT crawlers
 */
export const GEOAIHints: React.FC<AIHintsProps> = memo(({
  productName,
  price,
  category,
  inStock,
  keywords,
}) => {
  const priceFormatted = price 
    ? new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(price)
    : null;

  return (
    <Helmet>
      {/* AI Assistant specific meta tags */}
      {productName && (
        <meta name="product:name" content={productName} />
      )}
      {priceFormatted && (
        <meta name="product:price" content={priceFormatted} />
      )}
      {category && (
        <meta name="product:category" content={category} />
      )}
      {inStock !== undefined && (
        <meta name="product:availability" content={inStock ? 'in stock' : 'out of stock'} />
      )}
      {keywords && keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      
      {/* Indicate this page is AI-friendly */}
      <meta name="ai-content-type" content="commerce" />
      <meta name="acp-version" content="1.0" />
    </Helmet>
  );
});

GEOAIHints.displayName = 'GEOAIHints';

export default {
  GEOProductSchema,
  GEOCatalogSchema,
  GEOOrganizationSchema,
  GEOFaqSchema,
  GEOAIHints,
  GEO_BUSINESS,
};
