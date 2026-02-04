/**
 * Breadcrumb - Reusable breadcrumb navigation component
 * Implements both visual UI and BreadcrumbList schema markup
 * WCAG 2.1 AA compliant with proper aria labels
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { BreadcrumbSchema } from './SchemaMarkup';

export interface BreadcrumbItem {
  label: string;
  href: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showSchema?: boolean;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ 
  items, 
  className = '',
  showSchema = true 
}) => {
  // Ensure Home is always first
  const allItems: BreadcrumbItem[] = [
    { label: 'Beranda', href: '/' },
    ...items
  ];

  // Mark the last item as current
  const breadcrumbItems = allItems.map((item, index) => ({
    ...item,
    current: index === allItems.length - 1
  }));

  // Schema items format
  const schemaItems = breadcrumbItems.map(item => ({
    name: item.label,
    url: item.href
  }));

  return (
    <>
      {showSchema && <BreadcrumbSchema items={schemaItems} />}
      
      <nav 
        aria-label="Breadcrumb" 
        className={`flex items-center text-sm ${className}`}
      >
        <ol className="flex items-center gap-1 flex-wrap">
          {breadcrumbItems.map((item, index) => (
            <li key={item.href} className="flex items-center">
              {index > 0 && (
                <ChevronRight 
                  size={14} 
                  className="text-gray-400 mx-1 flex-shrink-0" 
                  aria-hidden="true" 
                />
              )}
              
              {item.current ? (
                <span 
                  className="text-gray-400 font-medium truncate max-w-[200px]"
                  aria-current="page"
                >
                  {index === 0 ? (
                    <span className="flex items-center gap-1">
                      <Home size={14} aria-hidden="true" />
                      <span className="sr-only">{item.label}</span>
                    </span>
                  ) : (
                    item.label
                  )}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="text-gray-400 hover:text-pink-400 transition-colors truncate max-w-[150px]"
                >
                  {index === 0 ? (
                    <span className="flex items-center gap-1">
                      <Home size={14} aria-hidden="true" />
                      <span className="sr-only">{item.label}</span>
                    </span>
                  ) : (
                    item.label
                  )}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};

export default Breadcrumb;
