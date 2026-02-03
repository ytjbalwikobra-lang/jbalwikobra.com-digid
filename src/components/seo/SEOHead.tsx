/**
 * SEOHead - Reusable SEO component for dynamic meta tags
 * Implements react-helmet-async for per-page SEO optimization
 * Supports Open Graph, Twitter Cards, and JSON-LD structured data
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  /** For paginated content - current page number (1-indexed) */
  page?: number;
  /** For paginated content - total pages */
  totalPages?: number;
  /** Custom canonical URL (overrides url if set) */
  canonicalUrl?: string;
  children?: React.ReactNode; // For custom JSON-LD schemas
}

const SITE_NAME = 'JB Alwikobra';
const DEFAULT_TITLE = 'Jual Beli Rental Akun Game Terpercaya';
const DEFAULT_DESCRIPTION = 'Platform jual beli dan rental akun game terpercaya di Indonesia. Dapatkan akun Mobile Legends, PUBG Mobile, Free Fire, Genshin Impact dengan harga terbaik.';
const DEFAULT_IMAGE = 'https://www.jbalwikobra.com/og-image.svg';
const BASE_URL = 'https://www.jbalwikobra.com';

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noIndex = false,
  page,
  totalPages,
  canonicalUrl,
  children
}) => {
  // Add page suffix to title for paginated content
  const pageTitle = page && page > 1 ? `${title} - Halaman ${page}` : title;
  const fullTitle = pageTitle ? `${pageTitle} | ${SITE_NAME}` : `${SITE_NAME} - ${DEFAULT_TITLE}`;
  
  // Determine canonical URL - for page 1, always use base URL without page param
  const basePageUrl = url ? `${BASE_URL}${url}` : BASE_URL;
  const fullUrl = canonicalUrl 
    ? `${BASE_URL}${canonicalUrl}` 
    : (page && page > 1 ? `${basePageUrl}?page=${page}` : basePageUrl);
  
  // Calculate prev/next URLs for pagination SEO
  const prevUrl = page && page > 1 
    ? (page === 2 ? basePageUrl : `${basePageUrl}?page=${page - 1}`)
    : undefined;
  const nextUrl = page && totalPages && page < totalPages 
    ? `${basePageUrl}?page=${page + 1}` 
    : undefined;
  
  const safeDescription = description.slice(0, 160);

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={safeDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
      
      {/* Pagination SEO - rel prev/next for paginated content */}
      {prevUrl && <link rel="prev" href={prevUrl} />}
      {nextUrl && <link rel="next" href={nextUrl} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={safeDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="id_ID" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={safeDescription} />
      <meta name="twitter:image" content={image} />

      {/* Custom JSON-LD schemas passed as children */}
      {children}
    </Helmet>
  );
};

export default SEOHead;
