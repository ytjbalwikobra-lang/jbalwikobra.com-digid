/**
 * JSON-LD Schema Components for Structured Data
 * Implements various schema.org types for SEO optimization
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';

// Organization Schema - for business identity
interface OrganizationSchemaProps {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  socialLinks?: string[];
}

export const OrganizationSchema: React.FC<OrganizationSchemaProps> = ({
  name = 'JB Alwikobra',
  url = 'https://www.jbalwikobra.com',
  logo = 'https://www.jbalwikobra.com/logo192.svg',
  description = 'Platform jual beli dan rental akun game terpercaya di Indonesia',
  email,
  phone,
  address,
  socialLinks = []
}) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    description,
    ...(email && { email }),
    ...(phone && { telephone: phone }),
    ...(address && { 
      address: {
        '@type': 'PostalAddress',
        streetAddress: address
      }
    }),
    ...(socialLinks.length > 0 && { sameAs: socialLinks })
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// Product Schema - for product pages
interface ProductSchemaProps {
  name: string;
  description: string;
  image: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  sku?: string;
  brand?: string;
  category?: string;
  url?: string;
}

export const ProductSchema: React.FC<ProductSchemaProps> = ({
  name,
  description,
  image,
  price,
  originalPrice,
  currency = 'IDR',
  availability = 'InStock',
  sku,
  brand,
  category,
  url
}) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: description.slice(0, 500),
    image,
    ...(sku && { sku }),
    ...(brand && { brand: { '@type': 'Brand', name: brand } }),
    ...(category && { category }),
    offers: {
      '@type': 'Offer',
      price: price.toString(),
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      ...(url && { url }),
      ...(originalPrice && originalPrice > price && {
        priceSpecification: {
          '@type': 'PriceSpecification',
          price: originalPrice.toString(),
          priceCurrency: currency,
          valueAddedTaxIncluded: true
        }
      })
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// FAQPage Schema - for help/FAQ pages
interface FAQItem {
  question: string;
  answer: string;
}

interface FAQPageSchemaProps {
  faqs: FAQItem[];
}

export const FAQPageSchema: React.FC<FAQPageSchemaProps> = ({ faqs }) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// Breadcrumb Schema - for navigation hierarchy
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

export const BreadcrumbSchema: React.FC<BreadcrumbSchemaProps> = ({ items }) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://www.jbalwikobra.com${item.url}`
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// ItemList Schema - for product catalogs
interface ItemListSchemaProps {
  name: string;
  description?: string;
  items: Array<{
    name: string;
    url: string;
    image?: string;
    position?: number;
  }>;
}

export const ItemListSchema: React.FC<ItemListSchemaProps> = ({ 
  name, 
  description, 
  items 
}) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    ...(description && { description }),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: item.position || index + 1,
      name: item.name,
      url: `https://www.jbalwikobra.com${item.url}`,
      ...(item.image && { image: item.image })
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// WebSite Schema with SearchAction - for homepage
interface WebSiteSchemaProps {
  name?: string;
  url?: string;
  searchUrlTemplate?: string;
}

export const WebSiteSchema: React.FC<WebSiteSchemaProps> = ({
  name = 'JB Alwikobra',
  url = 'https://www.jbalwikobra.com',
  searchUrlTemplate = 'https://www.jbalwikobra.com/products?search={search_term_string}'
}) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: searchUrlTemplate,
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// LocalBusiness Schema - for local SEO
interface LocalBusinessSchemaProps {
  name?: string;
  description?: string;
  url?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  openingHours?: string;
  priceRange?: string;
}

export const LocalBusinessSchema: React.FC<LocalBusinessSchemaProps> = ({
  name = 'JB Alwikobra',
  description = 'Platform jual beli dan rental akun game terpercaya di Indonesia',
  url = 'https://www.jbalwikobra.com',
  logo = 'https://www.jbalwikobra.com/logo192.svg',
  phone,
  email,
  address,
  openingHours: _openingHours = 'Mo-Su 09:00-21:00',
  priceRange = 'Rp50.000 - Rp5.000.000'
}) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${url}/#organization`,
    name,
    description,
    url,
    logo,
    priceRange,
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '09:00',
      closes: '21:00'
    },
    ...(phone && { telephone: phone }),
    ...(email && { email }),
    ...(address && {
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'ID',
        addressLocality: address
      }
    })
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};
